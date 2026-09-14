const fs = require('fs');
const path = require('path');

const replacements = [
  { file: 'src/pages/admin/batch-invoice.astro', search: '"orders"', replace: '"batch_invoice"' },
  { file: 'src/pages/admin/batch-invoice-print.astro', search: '"orders"', replace: '"batch_invoice"' },
  { file: 'src/pages/admin/categories.astro', search: '"products"', replace: '"categories"' },
  { file: 'src/pages/admin/coupons.astro', search: '"marketing"', replace: '"coupons"' },
  { file: 'src/pages/admin/flash-sales.astro', search: '"marketing"', replace: '"flash_sales"' },
  { file: 'src/pages/admin/shipping.astro', search: '"settings"', replace: '"shipping_rates"' },
  { file: 'src/pages/admin/store-details.astro', search: '"settings"', replace: '"store_details"' }
];

let changedCount = 0;

for (const { file, search, replace } of replacements) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(`canManageSection(ctx, ${search})`)) {
      content = content.replace(`canManageSection(ctx, ${search})`, `canManageSection(ctx, ${replace})`);
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${file}`);
      changedCount++;
    } else {
      console.log(`Skip or already updated ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
}

console.log(`Updated ${changedCount} files successfully.`);
