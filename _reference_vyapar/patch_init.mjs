import { readFileSync, writeFileSync } from 'fs';

const file = 'storefront/src/pages/admin/products/edit.astro';
let code = readFileSync(file, 'utf8');

// Patch initialization code to load variant groups first
const initPattern = /(if \(initialProduct\) \{)\s*(try \{[\s\S]*?const vRaw = initialProduct\.variants;[\s\S]*?\} catch \(e\) \{[^\}]*\}\s*)/;

if (initPattern.test(code)) {
  code = code.replace(initPattern, (match, p1, p2) => {
    return p1 + `
    try {
      const vGroupsRaw = initialProduct.variant_options;
      const vGroups = Array.isArray(vGroupsRaw) ? vGroupsRaw : (typeof vGroupsRaw === 'string' && vGroupsRaw.trim() ? JSON.parse(vGroupsRaw) : []);
      if (vGroups.length > 0 && typeof window.createVGroupRow === 'function') {
        vGroups.forEach(g => window.createVGroupRow(g.name, g.values.join(', ')));
      }
    } catch (e) { console.error('vGroups error', e); }

    ` + p2;
  });
  
  writeFileSync(file, code, 'utf8');
  console.log('SUCCESS: Updated initialization');
} else {
  console.log('Initialization pattern not found');
}
