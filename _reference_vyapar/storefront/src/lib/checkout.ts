import { getProducts, getSettings, validateCoupon, getActiveMilestone, supabaseAdmin, getLiveFlashSaleStock } from './database';
import { storeContext } from './storeContext';
import { getEligibleLocations } from './orderRouter';

export async function verifyPincodeBackend(pincode: string, paymentMethod: string, settings: any) {
  if (!pincode || pincode.length !== 6) {
    throw new Error('Please enter a valid 6-digit pincode.');
  }

  // 1. Check if Delivery is restricted to specific pincodes
  if (settings.restrict_delivery === true || settings.restrict_delivery === 'true') {
    const allowed = (settings.allowed_pincodes || '').split(',').map((p: string) => p.trim());
    if (allowed.length > 0 && !allowed.includes(pincode)) {
      throw new Error(`Delivery is not available in your area (${pincode}).`);
    }
  }

  // 2. Check COD availability if payment method is cod
  if (paymentMethod === 'cod') {
    let allowCOD = settings.cod_enabled === true || settings.cod_enabled === 'true';
    if (!allowCOD) {
      throw new Error('Cash on Delivery is currently disabled.');
    }
    if (settings.cod_blacklist_pincodes) {
      const blacklisted = settings.cod_blacklist_pincodes.split(',').map((p: string) => p.trim());
      if (blacklisted.includes(pincode)) {
        throw new Error(`Cash on Delivery is not available in your area (${pincode}). Please use prepaid methods.`);
      }
    }
  }
}

export async function validateCheckoutItems(
  items: any[], 
  couponCodes?: string | string[], 
  state: string | null = null, 
  customerPhone?: string,
  customerEmail?: string,
  paymentMethod: string = 'cod',
  customerAddress?: any,
  customerId?: string
) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty');
  }

  const catalog = await getProducts();
  const settings = await getSettings();
  
  const addressObj = typeof customerAddress === 'string' ? { pincode: customerAddress } : (customerAddress || {});
  const pincode = addressObj.pincode || addressObj.zip;

  if (pincode && paymentMethod !== 'razorpay_verify' && paymentMethod !== 'phonepe_verify') {
    await verifyPincodeBackend(pincode, paymentMethod, settings);
  }

  const allowFlashSaleStacking = settings?.allow_flash_sale_stacking !== 'false' && settings?.allow_flash_sale_stacking !== false;

  let subtotal = 0;
  let eligibleSubtotal = 0; // Global eligible subtotal
  const eligibleSubtotalByStore: Record<string, number> = {}; // Store-specific eligible subtotal
  const validatedItems = [];

  // Multi-warehouse inventory aggregation
  const storeId = storeContext.getStore()?.storeId;
  let aggregatedStock: Record<string, number> | null = null;

  let globalEligibleLocations: any[] = [];
  if (pincode && storeId) {
     globalEligibleLocations = await getEligibleLocations(storeId, addressObj);
  }

  if (pincode && storeId && settings?.global_inventory_tracking !== 'false' && settings?.global_inventory_tracking !== false) {
     const eligibleLocationIds = globalEligibleLocations.map((l: any) => l.id);
     
     if (eligibleLocationIds.length > 0) {
        const variantIds = items.map(i => {
           const idStr = i.id || '';
           const parts = idStr.split('-');
           return parts.length > 1 ? parts.slice(1).join('-') : null;
        }).filter(id => id);

        if (variantIds.length > 0) {
           const { data } = await supabaseAdmin.from('inventory_levels')
              .select('variant_id, available')
              .in('location_id', eligibleLocationIds)
              .in('variant_id', variantIds);
              
           const { data: reservations } = await supabaseAdmin.from('checkout_reservations')
              .select('variant_id, quantity')
              .in('location_id', eligibleLocationIds)
              .in('variant_id', variantIds)
              .gt('expires_at', new Date().toISOString());
              
           if (data) {
              aggregatedStock = {};
              const resMap: Record<string, number> = {};
              if (reservations) {
                  reservations.forEach((r: any) => {
                      resMap[r.variant_id] = (resMap[r.variant_id] || 0) + r.quantity;
                  });
              }
              data.forEach((level: any) => {
                 const available = level.available - (resMap[level.variant_id] || 0);
                 aggregatedStock![level.variant_id] = (aggregatedStock![level.variant_id] || 0) + Math.max(0, available);
              });
           }
        }
     } else {
        // No locations serve this pincode
        aggregatedStock = {}; // all will default to 0
     }
  }
  const consumedVariantStock: Record<string, number> = {};
  const consumedFlashStock: Record<string, number> = {};

  for (const item of items) {
    let productId = item.product_id;
    if (!productId) {
      const uuidMatch = item.id.match(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
      const prodMatch = item.id.match(/^(PROD-\d+)/);
      productId = uuidMatch ? uuidMatch[1] : (prodMatch ? prodMatch[1] : item.id.split('-')[0]);
    }
    const product = catalog.find((p: any) => p.id === productId);

    if (!product) continue;

    if (product.is_q_commerce_only) {
      if (!pincode) {
        throw new Error(`${product.name} is a Quick-Commerce item and requires a valid delivery pincode.`);
      }
      const hasQCommerceCoverage = globalEligibleLocations.some((loc: any) => loc.q_commerce_enabled);
      if (!hasQCommerceCoverage) {
        throw new Error(`${product.name} is not deliverable to ${pincode} via Quick-Commerce. Please remove it from your cart or select a different delivery location.`);
      }
    }

    const allVariants = [...(product.variants || []), ...(product.b2b_variants || [])];

    let variant = allVariants.find((v: any) => item.id.includes(v.id));
    if (!variant && allVariants.length > 0) {
      variant = allVariants.find((v: any) => v.weight === item.weight);
    }

    if (allVariants.length > 0 && !variant) {
      throw new Error(`Invalid variant for product: ${product.name}`);
    }

    let price = variant ? variant.price : (product.price || 0);
    if (!price || price <= 0) {
      throw new Error(`Invalid price for product: ${product.name}`);
    }
    let qty = item.quantity !== undefined ? Number(item.quantity) : (item.qty !== undefined ? Number(item.qty) : 1);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty) || qty > 100) {
      throw new Error(`Invalid quantity for product: ${product.name}`);
    }

    const isOutOfStock = variant ? variant.is_out_of_stock : product.is_out_of_stock;
    if (isOutOfStock) {
      throw new Error(`${product.name} is currently out of stock`);
    }

    if (product.track_inventory && settings?.global_inventory_tracking !== 'false' && settings?.global_inventory_tracking !== false) {
      let stock = variant ? (variant.stock || 0) : 0;
      
      // If we fetched aggregated multi-warehouse stock based on pincode, use that instead
      if (aggregatedStock !== null && variant) {
         stock = aggregatedStock[variant.id] || 0;
      }

      const variantKey = variant ? variant.id : productId;
      const consumed = consumedVariantStock[variantKey] || 0;
      const remainingStock = stock - consumed;

      if (remainingStock < qty) {
        if (paymentMethod !== 'razorpay_verify' && paymentMethod !== 'phonepe_verify') {
          if (remainingStock <= 0) {
            throw new Error(`${product.name} is currently out of stock`);
          }
          // Instead of throwing, cap the quantity to available remaining stock
          qty = remainingStock;
          item.quantity = remainingStock;
          item._adjusted_qty = true;
          item._adjusted_msg = `Reduced ${product.name} to ${remainingStock} (max available)`;
        } else {
          // Allow prepaid orders to proceed even if stock ran out during payment,
          // to prevent "payment done but order not placed" scenarios.
          console.warn(`[Stock Warning] Overselling ${product.name} due to prepaid payment. Stock: ${stock}, Consumed: ${consumed}, Qty: ${qty}`);
        }
      }
      consumedVariantStock[variantKey] = consumed + qty;
    }

    let isFlashSaleItem = false;
    // TASK 1.1: Use dynamically injected variant.isFlashSale instead of legacy product columns
    const flashVariant = variant && variant.isFlashSale ? variant : (product.isFlashSale ? product : null);

    if (flashVariant) {
      isFlashSaleItem = true;
      // Note: `price` is already set to `flashVariant.price` (the sale price) above!
      
      // TASK 1.2: Enforce Flash Sale Stock limits
      const storeIdForStock = product.store_id || storeContext.getStore().storeId;
      const variantName = variant ? (variant.weight || variant.name || 'Default') : 'all';
      const saleKey = `${product.name}-${variantName}-${storeIdForStock}`;
      
      const liveStock = await getLiveFlashSaleStock(product.name, variantName, storeIdForStock);
      
      const isRealStock = liveStock ? liveStock.type === 'real' : flashVariant.stockType === 'real';
      const totalStock = liveStock ? liveStock.total : flashVariant.totalStock;
      const soldStock = liveStock ? liveStock.sold : (flashVariant.soldStock || 0);

      if (isRealStock && totalStock > 0) {
        const remainingFlashStock = totalStock - soldStock - (consumedFlashStock[saleKey] || 0);
        
        if (qty > remainingFlashStock) {
          if (remainingFlashStock <= 0) {
            throw new Error(`Only ${Math.max(0, totalStock - soldStock)} unit(s) of ${product.name} are left at the Flash Sale price.`);
          }
          // Cap the quantity instead of throwing an error so checkout can proceed with adjusted items
          qty = remainingFlashStock;
          item.quantity = remainingFlashStock;
          item._adjusted_qty = true;
          item._adjusted_msg = `Reduced ${product.name} to ${remainingFlashStock} (max Flash Sale limit)`;
        }
        consumedFlashStock[saleKey] = (consumedFlashStock[saleKey] || 0) + qty;
      }
    }

    const itemTotal = price * qty;
    subtotal += itemTotal;
    
    const storeIdForCalc = product.store_id || 'platform';

    if (isFlashSaleItem && !allowFlashSaleStacking) {
      // Do not add to eligibleSubtotal
    } else {
      eligibleSubtotal += itemTotal;
      if (!eligibleSubtotalByStore[storeIdForCalc]) eligibleSubtotalByStore[storeIdForCalc] = 0;
      eligibleSubtotalByStore[storeIdForCalc] += itemTotal;
    }
    
    const hsn_code = product.hsn_code || settings?.default_hsn_code || '0813';
    const gst_rate = product.gst_rate !== undefined && product.gst_rate !== null ? Number(product.gst_rate) : (settings?.default_gst_rate !== undefined ? Number(settings.default_gst_rate) : 5);

    validatedItems.push({
      ...item,
      quantity: qty,
      price,
      total: itemTotal,
      hsn_code,
      gst_rate,
      store_id: product.store_id || null,
      product_id: productId,
      variant_id: variant ? variant.id : null,
      variant_name: variant ? (variant.weight || variant.name || 'Default') : undefined,
      isB2B: item.isB2B || false,
      isFlashSale: isFlashSaleItem,
      product_name: product.name,
      is_digital: product.is_digital || false,
      digital_delivery_url: product.digital_delivery_url || null,
      is_q_commerce_only: product.is_q_commerce_only || false,
      is_standard_only: product.is_standard_only || false,
      track_inventory: product.track_inventory !== false
    });
  }

  if (validatedItems.length === 0) {
     throw new Error('Invalid items in cart');
  }

  let shipping = 0;
  const freeThreshold = settings?.free_shipping_threshold !== undefined ? Number(settings.free_shipping_threshold) : 499;
  let flatRate = settings?.flat_shipping_rate !== undefined ? Number(settings.flat_shipping_rate) : 50;
  
  if (state && settings?.state_shipping_rules) {
    try {
      const stateRules = JSON.parse(settings.state_shipping_rules);
      if (stateRules[state] !== undefined) {
        if (stateRules[state] === -1) {
          throw new Error('Delivery is not available in your state.');
        }
        flatRate = Number(stateRules[state]);
      }
    } catch (e) {
      // Ignored if JSON parsing fails
    }
  }
  
  if (freeThreshold > 0 && subtotal >= freeThreshold) {
    shipping = 0;
  } else {
    shipping = flatRate;
  }

  // Validate coupons
  let couponDiscount = 0;
  let couponResult = null;
  if (couponCodes && (Array.isArray(couponCodes) ? couponCodes.length > 0 : String(couponCodes).trim() !== '')) {
    // TASK 2.3: Pass the per-store subtotals map instead of the global subtotal!
    const couponRes = await validateCoupon(couponCodes, eligibleSubtotalByStore, customerPhone, customerEmail, customerId);
    if (!couponRes.valid) {
      throw new Error(couponRes.error || 'Invalid coupon(s)');
    } else if (eligibleSubtotal === 0 && subtotal > 0) {
      // If eligibleSubtotal is 0, it means all items are flash sale items and stacking is disabled
      couponResult = couponRes;
      couponResult.error = "Coupons cannot be applied to flash sale items.";
    } else {
      couponResult = couponRes;
      couponDiscount = couponResult.discount || 0;
    }
  }

  // Handle Milestone Discount
  const milestone = await getActiveMilestone();
  let milestoneDiscount = 0;
  let freeGifts: any[] = [];
  let freeGift = null;
  if (milestone && milestone.tiers) {
    // TASK 3.1: Multi-tenant milestone validation
    const milestoneStoreId = milestone.store_id || 'platform';
    const applicableMilestoneTotal = milestone.store_id ? (eligibleSubtotalByStore[milestoneStoreId] || 0) : eligibleSubtotal;

    const activeTier = milestone.tiers.slice().reverse().find((t: any) => applicableMilestoneTotal >= (t.target || t.amount));
    if (activeTier) {
      milestoneDiscount = Math.floor(applicableMilestoneTotal * ((activeTier.discount || 0) / 100));
      
      if (activeTier.free_gifts && Array.isArray(activeTier.free_gifts)) {
        activeTier.free_gifts.forEach((g: any) => {
          freeGifts.push({
            id: g.id || g.free_gift_id,
            variantName: g.variantName || g.free_gift_variant || '',
            name: g.name || g.free_gift_name || '',
            image: g.image || g.free_gift_image || '',
            worth: g.worth || g.free_gift_worth || 0,
            isCustom: g.isCustom !== false
          });
        });
      } else if (activeTier.free_gift_id || activeTier.free_gift_name) {
        // Fallback for old schema
        freeGifts.push({
          id: activeTier.free_gift_id,
          variantName: activeTier.free_gift_variant || '',
          name: activeTier.free_gift_name || '',
          image: activeTier.free_gift_image || '',
          worth: activeTier.free_gift_worth || 0,
          isCustom: true
        });
      }
      
      if (freeGifts.length > 0) {
        freeGift = freeGifts[0]; // backward compatibility
      }
    }
  }

  // Handle Prepaid Discount
  let prepaidDiscount = 0;
  if (['razorpay', 'phonepe', 'online'].includes(paymentMethod) && (settings?.prepaid_discount_enabled === true || settings?.prepaid_discount_enabled === 'true')) {
    const minOrder = settings?.prepaid_discount_min_order ? Number(settings.prepaid_discount_min_order) : 0;
    if (subtotal >= minOrder) {
      const type = settings?.prepaid_discount_type || 'percentage';
      const val = Number(settings?.prepaid_discount_value || 0);
      
      if (type === 'percentage') {
        let calcDiscount = Math.floor(subtotal * (val / 100));
        const maxCap = settings?.prepaid_discount_max_cap ? Number(settings.prepaid_discount_max_cap) : 0;
        if (maxCap > 0 && calcDiscount > maxCap) {
          calcDiscount = maxCap;
        }
        prepaidDiscount = calcDiscount;
      } else {
        prepaidDiscount = val;
      }
    }
  }

  const allowStacking = settings?.allow_coupon_stacking === 'true' || settings?.allow_coupon_stacking === true;

  let finalCouponDiscount = 0;
  let finalMilestoneDiscount = 0;

  if (allowStacking) {
    finalCouponDiscount = couponDiscount;
    finalMilestoneDiscount = milestoneDiscount;
  } else {
    if (couponDiscount >= milestoneDiscount) {
      finalCouponDiscount = couponDiscount;
    } else {
      finalMilestoneDiscount = milestoneDiscount;
    }
  }
  
  let couponAndMilestone = finalCouponDiscount + finalMilestoneDiscount;

  // Ensure coupon and milestone don't exceed the eligible subtotal (the portion of cart not on flash sale)
  if (couponAndMilestone > eligibleSubtotal) {
    const ratio = eligibleSubtotal / couponAndMilestone;
    finalCouponDiscount = Math.floor(finalCouponDiscount * ratio);
    finalMilestoneDiscount = eligibleSubtotal - finalCouponDiscount;
    couponAndMilestone = eligibleSubtotal;
  }

  // Prepaid discount always stacks with other discounts (it's a payment offer)
  let finalDiscount = couponAndMilestone + prepaidDiscount;

  // Ensure total discount doesn't exceed subtotal
  finalDiscount = Math.min(finalDiscount, subtotal);

  const finalAmount = Math.max(0, subtotal - finalDiscount) + shipping;

  // --- BUILD discountByStore ---
  const discountByStore: Record<string, number> = {};
  
  // Distribute prepaid and global discounts based on general subtotal proportions
  const storeIds = Array.from(new Set(validatedItems.map((i: any) => i.store_id || 'platform')));
  const subtotalByStoreForPrepaid: Record<string, number> = {};
  for (const item of validatedItems) {
    const sId = item.store_id || 'platform';
    subtotalByStoreForPrepaid[sId] = (subtotalByStoreForPrepaid[sId] || 0) + item.total;
  }

  const distributeGlobally = (totalAmount: number, useEligible: boolean = true) => {
    let remaining = totalAmount;
    const baseTotal = useEligible ? eligibleSubtotal : subtotal;
    const baseMap = useEligible ? eligibleSubtotalByStore : subtotalByStoreForPrepaid;
    
    for (let i = 0; i < storeIds.length; i++) {
      const sId = storeIds[i];
      const sBase = baseMap[sId] || 0;
      const isLast = i === storeIds.length - 1;
      const proportion = baseTotal > 0 ? (sBase / baseTotal) : (1 / storeIds.length);
      const sAmt = isLast ? remaining : Math.floor(totalAmount * proportion);
      discountByStore[sId] = (discountByStore[sId] || 0) + sAmt;
      remaining -= sAmt;
    }
  };

  // 1. Process coupons
  if (couponResult && couponResult.coupons) {
    for (const coupon of couponResult.coupons) {
      const cDisc = coupon._calculated_discount || 0;
      const scalingRatio = couponDiscount > 0 ? (finalCouponDiscount / couponDiscount) : 1;
      const scaledDisc = Math.floor(cDisc * scalingRatio);
      
      if (coupon.store_id) {
        discountByStore[coupon.store_id] = (discountByStore[coupon.store_id] || 0) + scaledDisc;
      } else {
        distributeGlobally(scaledDisc, true); // platform coupon applies to eligible
      }
    }
  }

  // 2. Process milestone
  if (finalMilestoneDiscount > 0) {
    if (milestone && milestone.store_id) {
      discountByStore[milestone.store_id] = (discountByStore[milestone.store_id] || 0) + finalMilestoneDiscount;
    } else {
      distributeGlobally(finalMilestoneDiscount, true);
    }
  }

  // 3. Process prepaid discount
  if (prepaidDiscount > 0) {
    distributeGlobally(prepaidDiscount, false); // prepaid applies to ALL items
  }
  
  // Fix minor rounding errors ensuring sum(discountByStore) == finalDiscount
  let sumAssigned = Object.values(discountByStore).reduce((a, b) => a + b, 0);
  if (sumAssigned !== finalDiscount && storeIds.length > 0) {
     const diff = finalDiscount - sumAssigned;
     discountByStore[storeIds[storeIds.length - 1]] = (discountByStore[storeIds[storeIds.length - 1]] || 0) + diff;
  }

  // Extract affiliate info if any
  let affiliateInfo = null;
  if (couponResult && couponResult.coupons) {
    const affCoupon = couponResult.coupons.find((c: any) => c._is_affiliate);
    if (affCoupon) {
      const revenueBase = Math.max(0, subtotal - finalDiscount);
      affiliateInfo = {
        id: affCoupon._affiliate_id,
        commissionPercentage: affCoupon._commission_percentage,
        commissionAmount: Math.floor(revenueBase * (affCoupon._commission_percentage / 100))
      };
    }
  }

  return {
    subtotal,
    shipping,
    discount: finalDiscount,
    discountByStore,
    couponDiscountAmount: finalCouponDiscount,
    milestoneDiscountAmount: finalMilestoneDiscount,
    prepaidDiscount,
    finalAmount,
    validatedItems,
    couponResult,
    freeGift,
    freeGifts,
    affiliateInfo
  };
}
