const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'src/pages/admin');
const layoutPath = path.join(__dirname, 'src/layouts/AdminLayout.astro');
const staffPath = path.join(__dirname, 'src/pages/admin/staff.astro');

// 1. Get all PERM_SECTIONS from staff.astro
let staffContent = fs.readFileSync(staffPath, 'utf8');
const permMatch = staffContent.match(/const PERM_SECTIONS = \[(.*?)\];/);
const permSections = permMatch ? permMatch[1].replace(/'/g, '').split(',').map(s => s.trim()) : [];

// 2. Get sectionPermMap from AdminLayout.astro
let layoutContent = fs.readFileSync(layoutPath, 'utf8');
const mapMatch = layoutContent.match(/const sectionPermMap: Record<string, string> = {([\s\S]*?)};/);
const sectionMap = {};
if (mapMatch) {
  const lines = mapMatch[1].split('\n');
  for (const line of lines) {
    if (line.includes(':')) {
      let [k, v] = line.split(':').map(s => s.trim().replace(/['",]/g, ''));
      if (k && v) sectionMap[k] = v;
    }
  }
}

// 3. Scan all .astro files in src/pages/admin for canManageSection
const pageChecks = {};
function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.astro')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.matchAll(/canManageSection\(ctx,\s*['"](.*?)['"]\)/g);
      for (const match of matches) {
        const key = match[1];
        const route = fullPath.replace(adminDir, '/admin').replace(/\\/g, '/').replace(/\/index\.astro$/, '').replace(/\.astro$/, '');
        if (!pageChecks[key]) pageChecks[key] = [];
        if (!pageChecks[key].includes(route)) {
          pageChecks[key].push(route);
        }
      }
    }
  }
}
scanDir(adminDir);

// 4. Output the results
console.log("=== PERMISSION KEYS AUDIT ===");
const allKeys = new Set([...permSections, ...Object.values(sectionMap), ...Object.keys(pageChecks)]);
// Ignore super_admin as it's a role, not a granular permission
allKeys.delete('super_admin');
// Also ignore any old group keys if they show up in pageChecks but not in permSections
const oldKeys = ['orders', 'finance', 'settings', 'website', 'shipping', 'marketing', 'products', 'store_front', 'feedback', 'hero'];

const report = [];

for (const key of Array.from(allKeys).sort()) {
  const inUI = permSections.includes(key);
  const mappedRoutes = Object.keys(sectionMap).filter(k => sectionMap[k] === key);
  const checkedInFiles = pageChecks[key] || [];
  
  let status = "OK";
  let issues = [];
  
  if (!inUI && !oldKeys.includes(key)) issues.push("MISSING in staff.astro UI");
  if (mappedRoutes.length === 0) issues.push("NOT MAPPED in AdminLayout.astro");
  if (checkedInFiles.length === 0 && !key.startsWith('custom_')) issues.push("NOT CHECKED in any API/Astro file");
  
  if (oldKeys.includes(key) && checkedInFiles.length > 0) {
    status = "ERROR (OLD KEY STILL IN USE)";
    issues.push(`Found in: ${checkedInFiles.join(', ')}`);
  } else if (issues.length > 0) {
    status = "WARNING";
  }

  report.push({
    key,
    inUI: inUI ? 'Yes' : 'No',
    mappedRoutes: mappedRoutes.length,
    checkedFiles: checkedInFiles.length,
    status,
    issues: issues.join(' | ')
  });
}

console.table(report);
