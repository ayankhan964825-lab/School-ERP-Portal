import { readFileSync, writeFileSync } from 'fs';

const file = 'storefront/src/pages/admin/products/edit.astro';
let code = readFileSync(file, 'utf8');

// Update collectFormData to also collect variant_options and respect isActive
const collectPattern = /(function collectFormData\(\) \{\s*\n(?:[\s\S]*?)return \{)([\s\S]*?variants,)([\s\S]*?specifications,)/;

if (collectPattern.test(code)) {
  code = code.replace(collectPattern, (match, p1, p2, p3) => {
    // Add variant_options logic inside collectFormData
    const newLogic = `
    const variant_options = typeof window.getVGroups === 'function' ? window.getVGroups() : [];
    // Only collect enabled variants
    const activeVariants = variants.filter((_, i) => {
      const rows = document.querySelectorAll('.variant-row');
      const row = rows[i];
      if (!row) return true;
      const cb = row.querySelector('.variant-active');
      return !cb || cb.checked;
    });
    const minPrice = activeVariants.length > 0 ? Math.min(...activeVariants.map(v => v.price)) : 0;
    const maxMrp = activeVariants.length > 0 ? Math.max(...activeVariants.map(v => v.mrp)) : 0;
`;
    // We need to inject the logic before the return statement
    // Replace the old minPrice/maxMrp calc with the new one
    let newP1 = p1.replace(/const minPrice[\s\S]*?maxMrp[\s\S]*?;/, newLogic);
    
    // add variant_options to the return object
    return newP1 + p2.replace('variants,', 'variant_options,\n      variants: activeVariants,') + p3;
  });
  
  writeFileSync(file, code, 'utf8');
  console.log('SUCCESS: Updated collectFormData');
} else {
  console.log('collectFormData pattern not found');
}
