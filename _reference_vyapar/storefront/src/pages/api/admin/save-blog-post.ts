import { getPermissionContext, canManageSection } from '../../../lib/permissions';
﻿import type { APIRoute } from 'astro';
import { saveBlogPost } from '../../../lib/database';
import { storeContext } from "../../../lib/storeContext";

export const POST: APIRoute = async ({ request, cookies , locals }) => {
  return storeContext.run({ storeId: locals.storeId }, async () => {
    const ctx = getPermissionContext(cookies);
    if (!canManageSection(ctx, 'blog')) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    try {
        const formData = await request.formData();
        const post = {
          title: formData.get('title')?.toString() || '',
          slug: formData.get('slug')?.toString() || '',
          excerpt: formData.get('excerpt')?.toString() || '',
          content: formData.get('content')?.toString() || '',
          featured_image_url: formData.get('featured_image_url')?.toString() || '',
          category: formData.get('category')?.toString() || '',
          tags: formData.get('tags')?.toString().split(',').map(t => t.trim()).filter(Boolean) || [],
          seo_title: formData.get('seo_title')?.toString() || '',
          seo_description: formData.get('seo_description')?.toString() || '',
          is_published: formData.get('status')?.toString() === 'published',
        };
        await saveBlogPost(post);
        return Response.redirect(new URL('/admin/blog?success=true', request.url));
      } catch (error) {
        return Response.redirect(new URL('/admin/blog?error=true', request.url));
      }
  });
};
