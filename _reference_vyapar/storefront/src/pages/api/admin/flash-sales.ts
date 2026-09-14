import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { saveFlashSale, updateFlashSale, deleteFlashSale, saveSettings, getSettings, clearCached, getProducts } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'marketing')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        const { action, id, ...data } = body;
    
        if (action === 'update_config') {
          const currentSettings = await getSettings();
          const currentConfig = currentSettings?.flash_sale_config || {};
          const newConfig = { ...currentConfig, ...data.config };
          await saveSettings({ flash_sale_config: newConfig });
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'update_campaigns') {
          await saveSettings({ flash_sale_campaigns: data.campaigns });
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        if (action === 'create_bulk') {
          const { sales } = data;
          if (!Array.isArray(sales) || sales.length === 0) {
            return new Response(JSON.stringify({ error: 'No sales provided' }), { status: 400 });
          }
    
          const products = await getProducts(locals.storeId);
          const createdSales = [];
          const errors = [];
          for (const saleData of sales) {
            if (!saleData.product || !saleData.salePrice) continue;
            
            const dbProduct = products.find((p: any) => p.name === saleData.product);
            if (!dbProduct) {
              errors.push({ product: saleData.product, variant: saleData.variant, error: 'Product not found in database' });
              continue;
            }
            
            let actualOriginalPrice = dbProduct.price;
            let actualMrp = dbProduct.mrp || dbProduct.price;
            if (saleData.variant && saleData.variant !== 'all') {
                const dbVariant = dbProduct.variants?.find((v: any) => v.name === saleData.variant || v.weight === saleData.variant || (v.weight && v.weight.includes(saleData.variant)));
                if (dbVariant) {
                  actualOriginalPrice = dbVariant.price;
                  actualMrp = dbVariant.mrp || dbVariant.price;
                }
            }
            
            if (Number(saleData.salePrice) >= actualMrp) {
              errors.push({ product: saleData.product, variant: saleData.variant, error: `Sale price (${saleData.salePrice}) must be less than MRP (${actualMrp})` });
              continue;
            }
            
            saleData.originalPrice = actualMrp; // Override with trusted DB MRP
            
            const now = new Date();
            const start = new Date(saleData.startDate);
            const end = new Date(saleData.endDate);
            let status = 'scheduled';
            if (start <= now && end > now) status = 'active';
            else if (end <= now) status = 'expired';
    
            const saleToInsert = { ...saleData, status };
            if (Number.isNaN(saleToInsert.totalStock)) saleToInsert.totalStock = null;
            if (Number.isNaN(saleToInsert.soldStock)) saleToInsert.soldStock = 0;
            if (Number.isNaN(saleToInsert.fakePercentage)) saleToInsert.fakePercentage = null;
    
            try {
              const sale = await saveFlashSale(saleToInsert);
              createdSales.push(sale);
            } catch (saleErr: any) {
              console.error('[FlashSale] Error saving sale:', saleErr?.message, JSON.stringify(saleToInsert));
              errors.push({ product: saleData.product, variant: saleData.variant, error: saleErr?.message });
            }
          }
          if (createdSales.length > 0) {
            clearCached(`flash_sales_${locals.storeId}`);
            clearCached(`storefront_products_${locals.storeId}`);
          }
          return new Response(JSON.stringify({ success: true, count: createdSales.length, sales: createdSales, errors }), { status: 200 });
        }
    
        if (action === 'create') {
          if (!data.product || !data.salePrice) {
            return new Response(JSON.stringify({ error: 'Product and sale price are required' }), { status: 400 });
          }
          
          const products = await getProducts(locals.storeId);
          const dbProduct = products.find((p: any) => p.name === data.product);
          if (!dbProduct) {
            return new Response(JSON.stringify({ error: 'Product not found in database' }), { status: 404 });
          }
          
          let actualOriginalPrice = dbProduct.price;
          let actualMrp = dbProduct.mrp || dbProduct.price;
          if (data.variant && data.variant !== 'all') {
              const dbVariant = dbProduct.variants?.find((v: any) => v.name === data.variant || v.weight === data.variant || (v.weight && v.weight.includes(data.variant)));
              if (dbVariant) {
                actualOriginalPrice = dbVariant.price;
                actualMrp = dbVariant.mrp || dbVariant.price;
              }
          }
          
          if (Number(data.salePrice) >= actualMrp) {
            return new Response(JSON.stringify({ error: `Sale price (${data.salePrice}) must be less than MRP (${actualMrp})` }), { status: 400 });
          }
          
          data.originalPrice = actualMrp; // Override with trusted DB MRP
          
          if (data.endDate && data.startDate && new Date(data.endDate) <= new Date(data.startDate)) {
            return new Response(JSON.stringify({ error: 'End date must be after start date' }), { status: 400 });
          }
          const now = new Date();
          const start = new Date(data.startDate);
          const end = new Date(data.endDate);
          let status = 'scheduled';
          if (start <= now && end > now) status = 'active';
          else if (end <= now) status = 'expired';
    
          const saleToInsert = { ...data, status };
          if (Number.isNaN(saleToInsert.totalStock)) saleToInsert.totalStock = null;
          if (Number.isNaN(saleToInsert.soldStock)) saleToInsert.soldStock = 0;
          if (Number.isNaN(saleToInsert.fakePercentage)) saleToInsert.fakePercentage = null;
    
          try {
            const sale = await saveFlashSale(saleToInsert);
            clearCached(`flash_sales_${locals.storeId}`);
            return new Response(JSON.stringify({ success: true, sale }), { status: 200 });
          } catch (createErr: any) {
            console.error('[FlashSale] Create error:', createErr?.message, createErr?.details || '');
            return new Response(JSON.stringify({ error: 'Create failed: ' + (createErr?.message || 'Unknown error'), details: createErr?.details }), { status: 500 });
          }
        }
    
        if (action === 'update') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          const updates = { ...data };
          if (Number.isNaN(updates.totalStock)) updates.totalStock = null;
          if (Number.isNaN(updates.soldStock)) updates.soldStock = 0;
          if (Number.isNaN(updates.fakePercentage)) updates.fakePercentage = null;

          // Validate salePrice against real DB price if either price is being changed
          if (updates.salePrice !== undefined || updates.originalPrice !== undefined || updates.product !== undefined) {
            const products = await getProducts(locals.storeId);
            const targetProduct = updates.product || data.product;
            const dbProduct = products.find((p: any) => p.name === targetProduct);
            if (dbProduct) {
              let actualOriginalPrice = dbProduct.price;
              let actualMrp = dbProduct.mrp || dbProduct.price;
              const targetVariant = updates.variant || data.variant;
              if (targetVariant && targetVariant !== 'all') {
                const dbVariant = dbProduct.variants?.find((v: any) => v.name === targetVariant || v.weight === targetVariant);
                if (dbVariant) {
                  actualOriginalPrice = dbVariant.price;
                  actualMrp = dbVariant.mrp || dbVariant.price;
                }
              }
              const testSalePrice = updates.salePrice !== undefined ? updates.salePrice : data.salePrice;
              if (Number(testSalePrice) >= actualMrp) {
                return new Response(JSON.stringify({ error: `Sale price (${testSalePrice}) must be less than MRP (${actualMrp})` }), { status: 400 });
              }
              updates.originalPrice = actualMrp; // Force strict MRP sync
            }
          }

          const updated = await updateFlashSale(id, updates);
          if (!updated) return new Response(JSON.stringify({ error: 'Flash sale not found' }), { status: 404 });
          clearCached(`flash_sales_${locals.storeId}`);
          clearCached(`storefront_products_${locals.storeId}`);
          return new Response(JSON.stringify({ success: true, sale: updated }), { status: 200 });
        }
    
        if (action === 'deactivate') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          const updated = await updateFlashSale(id, { status: 'expired' });
          clearCached(`flash_sales_${locals.storeId}`);
          clearCached(`storefront_products_${locals.storeId}`);
          return new Response(JSON.stringify({ success: true, sale: updated }), { status: 200 });
        }
    
        if (action === 'delete') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          await deleteFlashSale(id);
          clearCached(`flash_sales_${locals.storeId}`);
          clearCached(`storefront_products_${locals.storeId}`);
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (error: any) {
        console.error('[FlashSale API] Unhandled error:', error?.message, error?.stack);
        return new Response(JSON.stringify({ error: 'Internal server error', message: error?.message }), { status: 500 });
      }
  });
};
