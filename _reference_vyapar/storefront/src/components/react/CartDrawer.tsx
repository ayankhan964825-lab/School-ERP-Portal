import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { cartItems, isCartOpen, toggleCart, updateCartItemQuantity, removeCartItem, addCartItem } from '../../store/cartStore';
import { ChevronRight, ChevronLeft, Tag, CheckCircle2, ShoppingBag, Gift } from 'lucide-react';

export default function CartDrawer() {
  const $isCartOpen = useStore(isCartOpen);
  const $cartItems = useStore(cartItems);
  const drawerRef = useRef<HTMLDivElement>(null);
  
  // States
  const [isCouponViewOpen, setIsCouponViewOpen] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupons, setAppliedCoupons] = useState<any[]>([]);
  
  const [crossSellProducts, setCrossSellProducts] = useState<any[]>([]);
  const [milestoneOffer, setMilestoneOffer] = useState<any>(null);
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>({});
  const [stockMap, setStockMap] = useState<Record<string, { stock: number; trackInventory: boolean; is_qc_only?: boolean; isFlashSale?: boolean }>>({});
  // Confetti tracking for milestones
  const [highestUnlockedTier, setHighestUnlockedTier] = useState(0);

  // Track location ETA for QC item validation
  const [currentEta, setCurrentEta] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      const match = document.cookie.match(new RegExp('(^| )delivery_eta=([^;]+)'));
      if (match) {
        const decoded = decodeURIComponent(match[2]);
        if (decoded !== currentEta) setCurrentEta(decoded);
      } else if (currentEta !== '') {
        setCurrentEta('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentEta]);

  // Check if cart has QC items but location is standard
  const hasInvalidQcItems = $cartItems.some(item => {
    const isQcOnly = stockMap[item.id]?.is_qc_only;
    // If ETA contains 'day', it's standard delivery. (Usually "2-3 Days")
    const isStandardDelivery = currentEta && currentEta.toLowerCase().includes('day');
    return isQcOnly && isStandardDelivery;
  });

  // Calculate base subtotal
  const subtotal = $cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Calculate eligible subtotal for stacking (excludes flash sale items if stacking is disabled)
  const allowFlashSaleStacking = storeSettings?.allow_flash_sale_stacking !== 'false' && storeSettings?.allow_flash_sale_stacking !== false;
  
  const hasFlashSaleItems = $cartItems.some(item => item.isFlashSale ?? (stockMap[item.id]?.isFlashSale || false));

  const eligibleSubtotal = $cartItems.reduce((acc, item) => {
    const isFlashSale = item.isFlashSale ?? (stockMap[item.id]?.isFlashSale || false);
    if (isFlashSale && !allowFlashSaleStacking) return acc;
    return acc + (item.price * item.quantity);
  }, 0);

  // Initial Fetches (Milestones & Coupons) - Cached to save Vercel Edge requests on MPA navigations
  useEffect(() => {
    const fetchCached = async (key: string, url: string, setter: Function) => {
      try {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 10 * 60 * 1000) { // 10 minutes cache
            setter(data);
            return;
          }
        }
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        setter(data);
      } catch (e) {}
    };

    fetchCached('vyaparpe-cache-milestone', '/api/cart/milestone', setMilestoneOffer);
    fetchCached('vyaparpe-cache-coupons', '/api/cart/coupons', (d: any) => setCouponsList(d || []));
    fetchCached('vyaparpe-cache-settings', '/api/cart/settings', setStoreSettings);
      
    // Check if there is a saved coupon
    const savedCouponCodesStr = localStorage.getItem(`vyaparpe-coupons-${window.location.hostname}`);
    if (savedCouponCodesStr) {
      try {
        const codes = JSON.parse(savedCouponCodesStr);
        if (codes && codes.length > 0) {
          // Do not cache validate-coupon as it depends on exact subtotal which changes
          fetch('/api/checkout/validate-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ couponCodes: codes, subtotal: eligibleSubtotal })
          }).then(res => res.json()).then(data => {
            if (data.valid && data.coupons) setAppliedCoupons(data.coupons);
            else localStorage.removeItem(`vyaparpe-coupons-${window.location.hostname}`);
          }).catch(() => {});
        }
      } catch(e) {}
    }
  }, []);

  // Dynamic Contextual Fetch for Cross-Sells (Depends on Cart Items)
  const cartIdsString = $cartItems.map(i => i.id).join(',');
  useEffect(() => {
    fetch('/api/cart/cross-sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItems: $cartItems })
    })
      .then(res => res.json())
      .then(data => {
        // BUG 6 FIX: Filter out products that are out of stock
        const filtered = Array.isArray(data) ? data.filter((p: any) => !p.is_out_of_stock) : data;
        setCrossSellProducts(filtered);
      })
      .catch(() => {});
  }, [cartIdsString]);

  // Fetch stock limits for cart items (BUG 1 FIX)
  useEffect(() => {
    if ($cartItems.length === 0) { setStockMap({}); return; }
    fetch('/api/cart/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: $cartItems.map(i => i.id) })
    })
      .then(res => res.json())
      .then(data => setStockMap(data || {}))
      .catch(() => {});
  }, [cartIdsString]);

  // Remove coupon if eligibleSubtotal drops below minimum order amount
  useEffect(() => {
    if (appliedCoupons.length > 0) {
      const stillValid = appliedCoupons.filter(c => eligibleSubtotal >= (c.min_order_amount || 0));
      if (stillValid.length !== appliedCoupons.length) {
        setAppliedCoupons(stillValid);
        localStorage.setItem(`vyaparpe-coupons-${window.location.hostname}`, JSON.stringify(stillValid.map(c => c.code)));
      }
    }
  }, [eligibleSubtotal, appliedCoupons]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node) && $isCartOpen) {
        const target = event.target as Element;
        if (!target.closest('#cart-btn') && !target.closest('.add-to-cart-btn')) {
          toggleCart();
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [$isCartOpen]);

  useEffect(() => {
    if ($isCartOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('cart-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('cart-open');
    }
    return () => { 
      document.body.style.overflow = ''; 
      document.body.classList.remove('cart-open');
    };
  }, [$isCartOpen]);

  // Milestone Logic
  const tiers = milestoneOffer?.tiers || [];
  let progressPercentage = 0;
  let milestoneMessage = '';
  let activeTierDiscount = 0;
  let activeFreeGifts: any[] = [];

  if (tiers.length > 0) {
    if (eligibleSubtotal >= tiers[tiers.length - 1].target) {
      progressPercentage = 100;
      const lastTier = tiers[tiers.length - 1];
      milestoneMessage = lastTier.message;
      activeTierDiscount = lastTier.discount || 0;
      
      if (lastTier.free_gifts && Array.isArray(lastTier.free_gifts)) {
        activeFreeGifts = lastTier.free_gifts.map((g: any) => ({
          id: g.id || g.free_gift_id,
          name: g.name || g.free_gift_name,
          variantName: g.variantName || g.free_gift_variant,
          image: g.image || g.free_gift_image,
          worth: g.worth || g.free_gift_worth || 0
        }));
      } else if (lastTier.free_gift_id || lastTier.free_gift_name) {
        activeFreeGifts = [{
           id: lastTier.free_gift_id,
           name: lastTier.free_gift_name,
           variantName: lastTier.free_gift_variant,
           image: lastTier.free_gift_image,
           worth: lastTier.free_gift_worth || 0,
        }];
      }
    } else {
      let currentTierIndex = -1;
      let nextTier = tiers[0];
      for (let i = 0; i < tiers.length; i++) {
        if (eligibleSubtotal < tiers[i].target) {
          nextTier = tiers[i];
          currentTierIndex = i - 1;
          break;
        }
      }
      
      progressPercentage = Math.min(100, (eligibleSubtotal / tiers[tiers.length - 1].target) * 100);
      
      if (currentTierIndex >= 0) {
        const cTier = tiers[currentTierIndex];
        activeTierDiscount = cTier.discount || 0;
        milestoneMessage = `${cTier.message} Add ₹${(nextTier.target - eligibleSubtotal).toLocaleString()} more for next reward!`;
        
        if (cTier.free_gifts && Array.isArray(cTier.free_gifts)) {
          activeFreeGifts = cTier.free_gifts.map((g: any) => ({
            id: g.id || g.free_gift_id,
            name: g.name || g.free_gift_name,
            variantName: g.variantName || g.free_gift_variant,
            image: g.image || g.free_gift_image,
            worth: g.worth || g.free_gift_worth || 0
          }));
        } else if (cTier.free_gift_id || cTier.free_gift_name) {
          activeFreeGifts = [{
             id: cTier.free_gift_id,
             name: cTier.free_gift_name,
             variantName: cTier.free_gift_variant,
             image: cTier.free_gift_image,
             worth: cTier.free_gift_worth || 0,
          }];
        }
      } else {
        milestoneMessage = `Add items worth ₹${(nextTier.target - eligibleSubtotal).toLocaleString()} to unlock rewards`;
      }
    }
  }

  // Trigger confetti ONLY when the user actively adds an item and crosses a tier
  const prevSubtotalRef = useRef(eligibleSubtotal);

  useEffect(() => {
    // Only proceed if tiers are loaded and the cart value actually increased
    if (tiers.length > 0 && eligibleSubtotal > prevSubtotalRef.current) {
      
      // Find what tier they were in BEFORE the addition
      let oldTierTarget = 0;
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (prevSubtotalRef.current >= tiers[i].target) {
          oldTierTarget = tiers[i].target;
          break;
        }
      }

      // Find what tier they are in NOW
      let newTierTarget = 0;
      let newTierDiscount = 0;
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (eligibleSubtotal >= tiers[i].target) {
          newTierTarget = tiers[i].target;
          newTierDiscount = tiers[i].discount || 0;
          break;
        }
      }

      // If they unlocked a NEW higher tier, fire confetti!
      if (newTierTarget > oldTierTarget) {
        if ($isCartOpen) {
          import('canvas-confetti').then((confettiModule) => {
            const confetti = confettiModule.default || confettiModule as any;
            
            // Calculate origin based on the cart drawer's position
            let originX = 0.5;
            let originY = 0.1; // Top of the screen/drawer
            if (drawerRef.current) {
              const rect = drawerRef.current.getBoundingClientRect();
              // x is the center of the drawer relative to the window width
              originX = (rect.left + rect.width / 2) / window.innerWidth;
            }

            const isLastTier = newTierDiscount === tiers[tiers.length - 1].discount;
            
            if (isLastTier) {
              // GRAND Confetti for last milestone!
              const end = Date.now() + 2 * 1000; // 2 seconds
              const colors = ['#10B981', '#34D399', '#F59E0B', '#EF4444', '#3B82F6', '#ffffff'];
              
              (function frame() {
                (window as any).confetti({
                  particleCount: 5,
                  angle: 60,
                  spread: 55,
                  origin: { x: originX - 0.1, y: originY },
                  colors: colors
                });
                (window as any).confetti({
                  particleCount: 5,
                  angle: 120,
                  spread: 55,
                  origin: { x: originX + 0.1, y: originY },
                  colors: colors
                });
            
                if (Date.now() < end) {
                  requestAnimationFrame(frame);
                }
              }());
            } else {
              // Standard confetti for normal milestones
              (window as any).confetti({
                particleCount: 150,
                spread: 80,
                origin: { x: originX, y: originY },
                colors: ['#10B981', '#34D399', '#F59E0B', '#ffffff'],
                zIndex: 100 // ensure it's above the cart (z-70)
              });
            }
          });
        }
      }
    }
    
    // Always update the ref to the current subtotal after checking
    prevSubtotalRef.current = eligibleSubtotal;
  }, [eligibleSubtotal, tiers, $isCartOpen]);

  // Active Milestone Auto-Discount vs Manual Coupon
  let activeDiscountAmount = 0;
  let discountLabel = '';
  const allowStacking = storeSettings?.allow_coupon_stacking === true || storeSettings?.allow_coupon_stacking === 'true';

  let couponAmount = 0;
  for (const coupon of appliedCoupons) {
    if (coupon.discount_type === 'percentage') {
      let d = Math.floor(eligibleSubtotal * (coupon.discount_value / 100));
      if (coupon.max_discount_amount) d = Math.min(d, coupon.max_discount_amount);
      couponAmount += d;
    } else {
      couponAmount += coupon.discount_value;
    }
  }

  let milestoneAmount = 0;
  if (activeTierDiscount > 0) {
    milestoneAmount = Math.floor(eligibleSubtotal * (activeTierDiscount / 100));
  }

  if (allowStacking) {
    activeDiscountAmount = couponAmount + milestoneAmount;
    if (appliedCoupons.length > 0 && activeTierDiscount > 0) {
      discountLabel = `Coupons (${appliedCoupons.map((c: any)=>c.code).join(', ')}) + Milestone (${activeTierDiscount}%)`;
    } else if (appliedCoupons.length > 0) {
      discountLabel = `Coupon discount (${appliedCoupons.map((c: any)=>c.code).join(', ')})`;
    } else if (activeTierDiscount > 0) {
      discountLabel = `Milestone Offer (${activeTierDiscount}%)`;
    }
  } else {
    // Take the better discount
    if (couponAmount >= milestoneAmount && appliedCoupons.length > 0) {
      activeDiscountAmount = couponAmount;
      discountLabel = `Coupon discount (${appliedCoupons.map((c: any)=>c.code).join(', ')})`;
    } else if (milestoneAmount > 0) {
      activeDiscountAmount = milestoneAmount;
      discountLabel = `Milestone Offer (${activeTierDiscount}%)`;
    }
  }

  // Ensure discount doesn't exceed the eligible subtotal (can't discount flash sale items or go negative)
  activeDiscountAmount = Math.min(activeDiscountAmount, eligibleSubtotal);

  // Real MRP Calculation
  // We now properly track MRP in cartItems. Fallback to item.price if mrp is missing.
  const totalMRP = $cartItems.reduce((acc, item) => acc + (item.mrp || item.price) * item.quantity, 0);
  const discountOnMRP = totalMRP - subtotal;
  const freeThreshold = storeSettings?.free_shipping_threshold ?? 499;
  const flatRate = storeSettings?.flat_shipping_rate ?? 50;
  let estimatedDelivery = 0;
  if (freeThreshold > 0 && subtotal >= freeThreshold) {
    estimatedDelivery = 0;
  } else {
    estimatedDelivery = flatRate;
  }

  const grandTotal = subtotal - activeDiscountAmount + estimatedDelivery;
  const totalSavings = discountOnMRP + activeDiscountAmount;
  const savingsPercentage = totalMRP > 0 ? Math.round((totalSavings / totalMRP) * 100) : 0;

  // Coupon Categorization
  const availableCoupons = couponsList.filter(c => eligibleSubtotal >= (c.min_order_amount || 0));
  const unavailableCoupons = couponsList.filter(c => eligibleSubtotal < (c.min_order_amount || 0));

  const handleApplyCoupon = async (coupon: any) => {
    if (eligibleSubtotal >= (coupon.min_order_amount || 0)) {
      let newCoupons = [coupon]; // Replace any existing coupons to prevent stacking exploits
      setAppliedCoupons(newCoupons);
      localStorage.setItem(`vyaparpe-coupons-${window.location.hostname}`, JSON.stringify(newCoupons.map(c => c.code)));
      setIsCouponViewOpen(false);
      setCouponCodeInput('');
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '15 46 34';
      // Convert HSL values to a close hex or just use default nice colors
      (window as any).confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#34D399', '#059669', '#ffffff'] // Cannot easily use CSS vars in canvas-confetti, leaving as green shades for success feel
      });
    } else {
      alert(`Add ₹${coupon.min_order_amount - eligibleSubtotal} more to avail this coupon.`);
    }
  };

  const handleManualCouponSubmit = async () => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    // Check locally first (saves network request for public coupons)
    const foundLocal = couponsList.find(c => c.code.toUpperCase() === code);
    if (foundLocal) {
      handleApplyCoupon(foundLocal);
      return;
    }

    // If not found locally, validate with server (might be a private/hidden coupon)
    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: eligibleSubtotal })
      });
      const data = await res.json();
      
      if (data.valid && data.coupons && data.coupons.length > 0) {
        handleApplyCoupon(data.coupons[0]);
      } else {
        alert(data.error || 'Invalid coupon code');
      }
    } catch (err) {
      alert('Failed to validate coupon. Please try again.');
    }
  };

  return (
    <>
      <style>{`
        @keyframes pop-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .animate-pop-bounce {
          animation: pop-bounce 1.5s ease-in-out infinite;
        }
      `}</style>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${$isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div 
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-[70] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${$isCartOpen ? 'translate-x-0' : 'translate-x-full'} overflow-hidden`}
      >
        {/* ================================================================= */}
        {/* MAIN CART VIEW */}
        {/* ================================================================= */}
        <div className={`absolute inset-0 w-full h-full flex flex-col transition-transform duration-300 ${isCouponViewOpen ? '-translate-x-full' : 'translate-x-0'}`}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white z-10 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-serif font-bold text-secondary">YOUR CART ({$cartItems.length})</h2>
            </div>
            <button 
              onClick={() => toggleCart()}
              className="p-2 -mr-2 rounded-full text-secondary/50 hover:text-secondary hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Milestone Progress Bar */}
          {tiers.length > 0 && $cartItems.length > 0 && (
            <div className="bg-gradient-to-r from-orange-50/50 via-primary/5 to-primary/10 px-4 py-5 border-b border-primary/10 shrink-0">
              <div className="text-center mb-6">
                <p className="text-sm font-bold text-secondary leading-tight">
                  {milestoneMessage}
                </p>
              </div>
              
              <div className="relative px-2">
                {/* Background Line */}
                <div className="absolute top-4 left-0 right-0 h-[2px] bg-primary/15 -z-10" />
                
                {/* Active Line */}
                <div 
                  className="absolute top-4 left-0 h-[2px] bg-primary -z-10 transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercentage}%` }} 
                />

                <div className="flex justify-between items-center relative z-10">
                  {tiers.map((t: any, i: number) => {
                    const isAchieved = eligibleSubtotal >= t.target;
                    const giftCount = t.free_gifts?.length || (t.free_gift_id || t.free_gift_name ? 1 : 0);
                    return (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <div className={`relative w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center bg-white transition-colors duration-300 ${isAchieved ? 'border-primary text-primary' : 'border-gray-300 text-gray-300'} ${!isAchieved ? 'animate-pop-bounce' : ''}`}>
                          <Gift className="w-4 h-4" />
                          {isAchieved && (
                            <div className="absolute -top-1.5 -right-1.5 bg-green-500 text-white rounded-full p-[2px]">
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 text-center flex flex-col items-center">
                          <span className={`text-[11px] font-extrabold ${isAchieved ? 'text-primary' : 'text-secondary/70'}`}>
                            ₹{t.target}
                          </span>
                          <span className="text-[9px] font-medium text-secondary/60 leading-tight whitespace-nowrap mt-0.5 flex flex-col items-center">
                            {t.discount > 0 && <span>{t.discount}% OFF</span>}
                            {giftCount > 0 && <span>+ {giftCount} Gift{giftCount > 1 ? 's' : ''}</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Cart Items Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50">
            {Object.keys($cartItems).length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center text-secondary/50 p-6 py-12">
                <ShoppingBag className="w-16 h-16 opacity-20 mb-4" />
                <p className="text-lg font-medium">Your cart is empty</p>
                <button onClick={() => toggleCart()} className="text-primary hover:text-primary/80 font-medium mt-2 underline underline-offset-4">
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {$cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 group bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-medium text-secondary text-sm leading-tight">{item.name}</h3>
                          <button onClick={() => removeCartItem(item.id)} className="text-secondary/40 hover:text-red-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        {item.weight && <p className="text-[11px] text-secondary/50 mt-1">{item.weight}</p>}
                        {item.custom_data && Object.keys(item.custom_data).length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {Object.entries(item.custom_data).map(([k, v]) => (
                              <p key={k} className="text-[10px] text-secondary/60 leading-tight">
                                <span className="font-semibold uppercase tracking-wider">{k}:</span>{' '}
                                {String(v).startsWith('http') ? (
                                  <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-primary underline">View File</a>
                                ) : (
                                  <span className="italic">{String(v).substring(0, 50)}{String(v).length > 50 ? '...' : ''}</span>
                                )}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center bg-primary text-surface rounded-lg h-8 overflow-hidden shadow-sm min-w-[72px]">
                          <button onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)} className="flex-1 h-full flex items-center justify-center font-bold hover:opacity-80 transition-opacity" aria-label="Decrease quantity">-</button>
                          <span className="w-8 text-center text-[12px] font-bold bg-surface text-primary leading-[32px]">{item.quantity}</span>
                          {(() => {
                            const sInfo = stockMap[item.id];
                            const isAtMax = sInfo?.trackInventory && storeSettings?.global_inventory_tracking && item.quantity >= sInfo.stock;
                            return (
                              <button
                                onClick={() => { if (!isAtMax) updateCartItemQuantity(item.id, item.quantity + 1); }}
                                className={`flex-1 h-full flex items-center justify-center font-bold transition-opacity ${isAtMax ? 'text-surface/50 opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                                disabled={isAtMax}
                                aria-label="Increase quantity"
                                title={isAtMax ? `Max ${sInfo.stock} available` : ''}
                              >+</button>
                            );
                          })()}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-secondary text-sm">₹{(item.price * item.quantity).toLocaleString()}</p>
                          {((item as any).originalPrice || 0) > item.price && (
                            <p className="text-[10px] text-secondary/40 line-through">₹{((item as any).originalPrice * item.quantity).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Render Free Gifts if unlocked */}
                {activeFreeGifts.length > 0 && activeFreeGifts.map((gift, idx) => (
                  <div key={`gift-${idx}`} className="flex gap-3 bg-primary/5 p-2.5 rounded-2xl border border-primary/20 shadow-sm relative overflow-hidden">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0 p-1">
                      {gift.image ? (
                        <img src={gift.image} alt={gift.name} className="w-full h-full object-cover mix-blend-multiply" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Tag className="w-6 h-6 text-primary/30" /></div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between relative z-10">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-medium text-secondary text-sm leading-tight flex items-center gap-1">
                            <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded">GIFT</span>
                            {gift.name}
                          </h3>
                        </div>
                        {gift.variantName && <p className="text-[11px] text-secondary/70 mt-1">{gift.variantName}</p>}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-primary font-medium">Unlocked!</span>
                        <div className="text-right">
                          <p className="font-bold text-primary text-sm">FREE</p>
                          {gift.worth > 0 && (
                            <p className="text-[10px] text-secondary/40 line-through">Worth ₹{gift.worth}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Cross-Selling Carousel */}
            {crossSellProducts.length > 0 && (
              <div className="px-3 py-3 mt-2 border-t border-gray-100 bg-white">
                <h4 className="text-xs font-bold text-primary mb-2.5">Recommended products for you</h4>
                <div className="flex overflow-x-auto gap-2.5 pb-1 snap-x hide-scrollbar">
                  {crossSellProducts.map((product: any) => (
                    <div key={product.id} className="min-w-[120px] bg-white border border-gray-100 rounded-xl p-2 snap-start flex flex-col shadow-sm">
                      <div className="w-full h-20 bg-gray-50 rounded-lg mb-2 overflow-hidden">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
                      </div>
                      <h5 className="text-[11px] font-medium text-secondary leading-tight line-clamp-2 flex-1">{product.name}</h5>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        <span className="text-xs font-bold">₹{product.price}</span>
                        <button 
                          onClick={() => addCartItem({...product, product_id: product.id, quantity: 1}, 1)}
                          className="bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold rounded-md px-3 py-1 text-xs transition-colors"
                        >
                          + ADD
                        </button>
                      </div>
                    </div>

                  ))}
                </div>
              </div>
            )}
            
            {/* Coupons Summary Strip */}
            {$cartItems.length > 0 && (
              <div className="mx-3 mt-1 mb-3 bg-primary/5 rounded-xl border border-primary/10 overflow-hidden">
                {appliedCoupons.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-primary">Save ₹{activeDiscountAmount.toLocaleString()}</span>
                          <span className="text-[11px] text-secondary/60">with '{appliedCoupons.map((c: any) => c.code).join(", ")}'</span>
                        </div>
                      </div>
                      <button onClick={() => { setAppliedCoupons([]); localStorage.removeItem(`vyaparpe-coupons-${window.location.hostname}`); }} className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded">Remove</button>
                    </div>
                    {allowStacking && (
                      <button onClick={() => setIsCouponViewOpen(true)} className="w-full bg-white border-t border-primary/10 py-1.5 px-3 flex items-center justify-center text-xs text-primary font-medium hover:bg-primary/5 transition-colors">
                        + Apply another coupon
                      </button>
                    )}
                  </div>
                ) : (
                  <button onClick={() => setIsCouponViewOpen(true)} className="w-full p-2.5 flex items-center justify-between text-left group">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">Apply Coupon Code</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-secondary/40" />
                  </button>
                )}
                {couponsList.length > 0 && (
                  <button onClick={() => setIsCouponViewOpen(true)} className="w-full bg-white border-t border-primary/10 py-2 px-3 flex items-center justify-between text-xs text-secondary/60 hover:text-primary transition-colors">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3"/> +{couponsList.length} more offers</span>
                    <span>View all coupons <ChevronRight className="w-3 h-3 inline" /></span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Totals */}
          {$cartItems.length > 0 && (
            <div className="bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 shrink-0">
              
              {/* Flash Sale Warning Message */}
              {hasFlashSaleItems && !allowFlashSaleStacking && (
                <div className="bg-orange-50/80 border-b border-orange-100 p-2 flex items-center justify-center gap-1.5 text-orange-700 text-[11px] font-medium text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Milestones & coupons are not applicable on Flash Sale items.</span>
                </div>
              )}

              {/* Prepaid Discount Banner */}
              {storeSettings?.prepaid_discount_enabled && storeSettings?.prepaid_discount_value > 0 && (
                <div className="bg-green-50/80 border-b border-green-100 p-2 flex items-center justify-center gap-1.5 text-green-700 text-xs font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                  <span>Pay online & get extra {storeSettings.prepaid_discount_type === 'percentage' ? `${storeSettings.prepaid_discount_value}%` : `₹${storeSettings.prepaid_discount_value}`} OFF{storeSettings.prepaid_discount_min_order > 0 ? ` on orders above ₹${storeSettings.prepaid_discount_min_order}` : '!'}</span>
                </div>
              )}

              {/* Expandable Bill Summary */}
              <details className="group border-b border-gray-100">
                <summary className="flex items-center justify-between p-3 cursor-pointer list-none">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-secondary/40 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    <span className="text-sm font-medium text-secondary">Estimated total</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-secondary flex items-center gap-1">
                      ₹{grandTotal.toLocaleString()}
                    </div>
                    {totalSavings > 0 && <span className="text-xs font-medium text-primary">You saved ₹{totalSavings.toLocaleString()}!</span>}
                  </div>
                </summary>
                
                <div className="px-3 pb-3 space-y-1.5 text-[13px]">
                  <div className="flex justify-between text-secondary/70">
                    <span>Total MRP</span>
                    <span>₹{totalMRP.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-secondary/70">
                    <span>Delivery fee (estimated)</span>
                    <span>{estimatedDelivery === 0 ? <span className="text-primary font-medium">Free</span> : `₹${estimatedDelivery}`}</span>
                  </div>
                  {discountOnMRP > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Discount on MRP</span>
                      <span>-₹{discountOnMRP.toLocaleString()}</span>
                    </div>
                  )}
                  {activeDiscountAmount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>{discountLabel}</span>
                      <span>-₹{activeDiscountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-secondary pt-2 border-t border-gray-100">
                    <span>Grand total</span>
                    <span>₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </details>

              <div className="p-3 bg-gray-50/50 flex flex-col items-center">
                {totalSavings > 0 && <p className="text-xs font-medium text-primary mb-2">You Saved ₹{totalSavings.toLocaleString()} ({savingsPercentage}%) so far!</p>}
                {hasInvalidQcItems && (
                  <div className="w-full bg-red-50 border border-red-100 text-red-600 text-[11px] p-2 rounded-lg mb-3 flex gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>Your cart contains Quick-Commerce items that cannot be delivered to your current location. Please remove them to checkout.</span>
                  </div>
                )}
                {hasInvalidQcItems ? (
                  <button 
                    disabled
                    className="w-full flex items-center justify-center text-sm font-bold !py-3 !rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed"
                  >
                    Checkout
                  </button>
                ) : (
                  <a 
                    href="/checkout"
                    onClick={() => toggleCart()}
                    className="w-full bg-primary text-surface flex items-center justify-center text-[15px] font-bold !py-3.5 !rounded-xl shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition-all tracking-wide"
                  >
                    Proceed to Checkout
                  </a>
                )}
                <p className="text-[10px] text-secondary/40 mt-3 flex items-center gap-1 justify-center">Powered by <a href="https://vyaparpe.in" target="_blank" rel="noopener" className="font-bold hover:text-rose-600 transition-colors">VyaparPe</a></p>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* COUPONS OVERLAY VIEW */}
        {/* ================================================================= */}
        <div className={`absolute inset-0 w-full h-full bg-gray-50 flex flex-col transition-transform duration-300 z-20 ${isCouponViewOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center p-4 border-b border-gray-200 bg-white shadow-sm shrink-0">
            <button onClick={() => setIsCouponViewOpen(false)} className="p-1 -ml-1 mr-2 text-secondary hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="font-bold text-secondary text-lg leading-tight">Coupons</h2>
              <p className="text-xs text-secondary/60">Cart value &bull; ₹{subtotal.toLocaleString()}</p>
            </div>
          </div>

          <div className="p-4 shrink-0 bg-white">
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input 
                type="text" 
                value={couponCodeInput}
                onChange={e => setCouponCodeInput(e.target.value)}
                placeholder="Enter coupon code"
                className="w-full pl-10 pr-20 py-3 border border-gray-200 rounded-xl text-sm uppercase focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              />
              <button 
                onClick={handleManualCouponSubmit}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary font-bold text-sm px-3 py-1.5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                APPLY
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Available Coupons */}
            {availableCoupons.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-secondary/50 mb-3 uppercase tracking-wider">Available Coupons</h3>
                <div className="space-y-3">
                  {availableCoupons.map((coupon) => (
                    <div key={coupon.id} className="bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                      {/* Decorative background element replacing screenshot's purple gradient */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                      
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="flex items-center gap-1.5 text-primary font-bold">
                          <Tag className="w-4 h-4" />
                          <span className="text-base tracking-wide">{coupon.code}</span>
                        </div>
                        <button 
                          onClick={() => handleApplyCoupon(coupon)}
                          className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          Apply
                        </button>
                      </div>
                      
                      <div className="relative z-10 text-secondary mt-3">
                        <p className="font-medium text-sm">
                          {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% off` : `₹${coupon.discount_value} off`}
                        </p>
                        {coupon.min_order_amount > 0 ? (
                          <p className="text-xs text-secondary/60 mt-0.5">on orders above ₹{coupon.min_order_amount}</p>
                        ) : (
                          <p className="text-xs text-secondary/60 mt-0.5">on all orders</p>
                        )}
                        
                        <div className="mt-3 text-primary text-xs font-bold bg-white/60 inline-block px-2 py-1 rounded">
                          Save ₹{
                            coupon.discount_type === 'percentage' 
                              ? Math.min(Math.floor(eligibleSubtotal * (coupon.discount_value/100)), coupon.max_discount_amount || Infinity)
                              : coupon.discount_value
                          } on this order!
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unavailable Coupons */}
            {unavailableCoupons.length > 0 && (
              <div className="opacity-70">
                <h3 className="text-xs font-bold text-secondary/50 mb-3 uppercase tracking-wider">Unavailable Coupons</h3>
                <div className="space-y-3">
                  {unavailableCoupons.map((coupon) => (
                    <div key={coupon.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 text-secondary/50 font-bold">
                          <Tag className="w-4 h-4" />
                          <span className="text-base tracking-wide">{coupon.code}</span>
                        </div>
                      </div>
                      
                      <div className="text-secondary/70 mt-3">
                        <p className="font-medium text-sm">
                          {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% off` : `₹${coupon.discount_value} off`}
                        </p>
                        <p className="text-xs text-secondary/50 mt-0.5">on orders above ₹{coupon.min_order_amount}</p>
                        
                        <p className="mt-3 text-red-500/80 text-xs font-medium">
                          Add ₹{(coupon.min_order_amount - eligibleSubtotal).toLocaleString()} more to avail this offer
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {couponsList.length === 0 && (
              <div className="text-center py-10 text-secondary/50">
                <Tag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No coupons available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        details > summary {
          list-style: none;
        }
        details > summary::-webkit-details-marker {
          display: none;
        }
      `}</style>
    </>
  );
}
