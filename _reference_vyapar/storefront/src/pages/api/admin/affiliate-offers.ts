import type { APIRoute } from 'astro';
import { getAffiliateOffers, saveAffiliateOffer, updateAffiliateOffer, deleteAffiliateOffer } from '../../../lib/database';
import { getPermissionContext, canManageSection, canViewSection } from '../../../lib/permissions';
import { storeContext } from "../../../lib/storeContext";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const ctx = getPermissionContext(cookies);
    if (!canViewSection(ctx, 'affiliates')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });

    const offers = await getAffiliateOffers();
    return new Response(JSON.stringify(offers), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const ctx = getPermissionContext(cookies);
        if (!canManageSection(ctx, 'affiliates')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    
        const data = await request.json();
        const newOffer = await saveAffiliateOffer(data);
        return new Response(JSON.stringify(newOffer), { status: 201 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
  });
};

export const PUT: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const ctx = getPermissionContext(cookies);
        if (!canManageSection(ctx, 'affiliates')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    
        const data = await request.json();
        if (!data.id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });
    
        const updated = await updateAffiliateOffer(data.id, data);
        return new Response(JSON.stringify(updated), { status: 200 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
  });
};

export const DELETE: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    try {
        const ctx = getPermissionContext(cookies);
        if (!canManageSection(ctx, 'affiliates')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    
        const data = await request.json();
        if (!data.id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });
    
        await deleteAffiliateOffer(data.id);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
  });
};
