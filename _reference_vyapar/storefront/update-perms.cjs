const fs = require('fs');
const path = require('path');

const replacements = [
  { file: 'src/pages/admin/orders/returns.astro', search: '"orders"', replace: '"orders_returns"' },
  { file: 'src/pages/admin/orders/rto.astro', search: '"orders"', replace: '"orders_tracking"' },
  { file: 'src/pages/admin/orders/tracking.astro', search: '"orders"', replace: '"orders_tracking"' },
  { file: 'src/pages/admin/orders/non-dispatched.astro', search: '"orders"', replace: '"orders_tracking"' },
  { file: 'src/pages/admin/orders/ndr.astro', search: '"orders"', replace: '"orders_tracking"' },
  { file: 'src/pages/admin/manual-bill.astro', search: '"orders"', replace: '"orders_manual"' },
  { file: 'src/pages/admin/pos-billing.astro', search: '"orders"', replace: '"orders_pos"' },
  { file: 'src/pages/admin/b2b-orders.astro', search: '"orders"', replace: '"orders_b2b"' },
  { file: 'src/pages/admin/bulk-bill.astro', search: '"orders"', replace: '"orders_bulk"' },
  { file: 'src/pages/admin/invoice/[orderId].astro', search: '"orders"', replace: '"orders_all"' },
  
  { file: 'src/pages/admin/finance/expenses.astro', search: '"finance"', replace: '"finance_expenses"' },
  { file: 'src/pages/admin/finance/remittance.astro', search: '"finance"', replace: '"finance_remittance"' },
  { file: 'src/pages/admin/finance/pnl.astro', search: '"finance"', replace: '"finance_pnl"' },
  { file: 'src/pages/admin/finance/account-health.astro', search: '"finance"', replace: '"finance_health"' },
  { file: 'src/pages/admin/finance/profit-calculator.astro', search: '"finance"', replace: '"finance_calculator"' },
  { file: 'src/pages/admin/wallet.astro', search: '"finance"', replace: '"finance_wallet"' },

  { file: 'src/pages/admin/settings/domains.astro', search: '"settings"', replace: '"settings_domains"' },
  { file: 'src/pages/admin/settings/locations.astro', search: '"settings"', replace: '"settings_locations"' },
  { file: 'src/pages/admin/settings/mobile-app.astro', search: '"settings"', replace: '"settings_mobile"' },
  { file: 'src/pages/admin/settings/whatsapp.astro', search: '"settings"', replace: '"whatsapp"' },

  { file: 'src/pages/admin/website/configuration.astro', search: '"settings"', replace: '"website_config"' },
  { file: 'src/pages/admin/website/themes.astro', search: '"settings"', replace: '"website_themes"' },
  { file: 'src/pages/admin/website/designs.astro', search: '"settings"', replace: '"website_designs"' },
  { file: 'src/pages/admin/website/featured-videos.astro', search: '"settings"', replace: '"website_videos"' },
  { file: 'src/pages/admin/website/navigation.astro', search: '"settings"', replace: '"website_navigation"' },
  { file: 'src/pages/admin/website/announcement.astro', search: '"settings"', replace: '"website_announcement"' },
  
  { file: 'src/pages/admin/reviews.astro', search: '"store_front"', replace: '"reviews"' },
  { file: 'src/pages/admin/hero/index.astro', search: '"store_front"', replace: '"hero"' },
  { file: 'src/pages/admin/feedback.astro', search: '"store_front"', replace: '"feedback"' },

  { file: 'src/pages/admin/notifications.astro', search: '"orders"', replace: '"notifications"' },
  
  { file: 'src/pages/admin/milestones.astro', search: '"marketing"', replace: '"milestones"' },
  { file: 'src/pages/admin/affiliates.astro', search: '"marketing"', replace: '"affiliates"' },
  { file: 'src/pages/admin/affiliate-offers.astro', search: '"marketing"', replace: '"affiliate_offers"' },
  { file: 'src/pages/admin/marketplace.astro', search: '"marketing"', replace: '"marketing"' },
  
  { file: 'src/pages/admin/shipping/calculator.astro', search: '"shipping"', replace: '"finance_calculator"' },
  { file: 'src/pages/admin/riders.astro', search: '"shipping"', replace: '"shipping_riders"' },

  { file: 'src/pages/admin/inventory.astro', search: '"products"', replace: '"inventory"' },
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
