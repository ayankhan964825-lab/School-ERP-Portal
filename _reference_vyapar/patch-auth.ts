// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.astro')) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

const dir = path.resolve('storefront/src');
const files = walk(dir);

let filesModified = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // Track if we need to add import { verifyCustomerAuth, signCustomerAuth } from '...auth'
  let needsAuthImport = false;

  // 1. Replace cookies.get('customer_auth')?.value
  // We want to replace it with verifyCustomerAuth(cookies.get('customer_auth')?.value)
  if (content.includes("cookies.get('customer_auth')?.value")) {
    content = content.replace(/cookies\.get\('customer_auth'\)\?\.value/g, "verifyCustomerAuth(cookies.get('customer_auth')?.value)");
    needsAuthImport = true;
  }
  
  if (content.includes("Astro.cookies.get('customer_auth')?.value")) {
    content = content.replace(/Astro\.cookies\.get\('customer_auth'\)\?\.value/g, "verifyCustomerAuth(Astro.cookies.get('customer_auth')?.value)");
    needsAuthImport = true;
  }

  if (content.includes("Astro.cookies.has('customer_auth')")) {
    content = content.replace(/Astro\.cookies\.has\('customer_auth'\)/g, "!!verifyCustomerAuth(Astro.cookies.get('customer_auth')?.value)");
    needsAuthImport = true;
  }

  // 2. Replace cookies.set('customer_auth', value,
  if (content.match(/cookies\.set\('customer_auth',\s*([^,]+),/)) {
    content = content.replace(/cookies\.set\('customer_auth',\s*([^,]+),/g, "cookies.set('customer_auth', signCustomerAuth($1),");
    needsAuthImport = true;
  }

  if (original !== content) {
    // Add import statement at the top if not exists
    if (!content.includes('verifyCustomerAuth') && !content.includes('signCustomerAuth')) {
       // Should not happen since we just added it
    }
    
    if (!content.includes('import { verifyCustomerAuth')) {
        // Calculate relative path to src/lib/auth.ts
        const fileDir = path.dirname(file);
        const libDir = path.resolve('storefront/src/lib');
        let relativePath = path.relative(fileDir, path.join(libDir, 'auth'));
        if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
        // Fix backslashes for windows
        relativePath = relativePath.replace(/\\/g, '/');

        const importStmt = `import { verifyCustomerAuth, signCustomerAuth } from '${relativePath}';\n`;

        // If .astro, insert after ---
        if (file.endsWith('.astro')) {
            content = content.replace('---\n', '---\n' + importStmt);
        } else {
            // If .ts, insert after imports or at top
            content = importStmt + content;
        }
    }

    fs.writeFileSync(file, content);
    console.log('Patched:', file);
    filesModified++;
  }
}

console.log(`Finished. Modified ${filesModified} files.`);
