import { getPermissionContext, canManageSection } from '../../../lib/permissions';
import type { APIRoute } from 'astro';
import { saveCategory, updateCategory, deleteCategory, assignProductsToCategory } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'products')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const body = await request.json();
        const { action, id, name, slug, description, image, parent_id, display_order } = body;
    
        if (action === 'create_bulk') {
          const { categories } = body;
          if (!Array.isArray(categories) || categories.length === 0) {
            return new Response(JSON.stringify({ error: 'No categories provided' }), { status: 400 });
          }
    
          const createdCategories = [];
          for (const catData of categories) {
            if (!catData.name) continue;
            const finalSlug = catData.slug || catData.name.toLowerCase().replace(/\s+/g, '-');
            const category = await saveCategory({ name: catData.name, slug: finalSlug, description: catData.description || '' });
            
            if (Array.isArray(catData.assigned_products)) {
              await assignProductsToCategory(finalSlug, catData.assigned_products);
            }
            createdCategories.push(category);
          }
          return new Response(JSON.stringify({ success: true, count: createdCategories.length, categories: createdCategories }), { status: 200 });
        }
    
        if (action === 'create') {
          if (!name) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });
          const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-');
          const category = await saveCategory({ name, slug: finalSlug, description: description || '', image: image || null, parent_id: parent_id || null, display_order: display_order ?? 0 });
          
          // Assign products to this category in the DB
          if (Array.isArray(body.assigned_products)) {
            await assignProductsToCategory(finalSlug, body.assigned_products);
          }
    
          return new Response(JSON.stringify({ success: true, category }), { status: 200 });
        }
    
        if (action === 'update') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          const updated = await updateCategory(id, { name, slug, description, image: image || null, parent_id: parent_id !== undefined ? (parent_id || null) : undefined, display_order: display_order !== undefined ? display_order : undefined });
          if (!updated) return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404 });
          
          const finalSlug = slug || updated.slug;
          if (Array.isArray(body.assigned_products)) {
            await assignProductsToCategory(finalSlug, body.assigned_products);
          }
    
          return new Response(JSON.stringify({ success: true, category: updated }), { status: 200 });
        }
    
        if (action === 'delete') {
          if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
          await deleteCategory(id);
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
    
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
      } catch (error) {
        console.error('Category API error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), { status: 500 });
      }
  });
};
