import crypto from 'crypto';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
let jwtSecret = 'vyapar_secret_2024';

for (const line of env.split('\n')) {
  if (line.startsWith('JWT_SECRET=')) jwtSecret = line.split('=')[1].trim().replace(/['"]/g, '');
}

function generateFakeAdminCookies() {
  const storeId = '00000000-0000-0000-0000-000000000002';
  const payload = `${storeId}:super_admin:super_admin_root`;
  const signature = crypto.createHmac('sha256', jwtSecret).update(payload).digest('hex');
  
  return `admin_id=super_admin_root; admin_role=super_admin; admin_signature=${signature}; admin_impersonate=${storeId};`;
}

async function run() {
  const cookies = generateFakeAdminCookies();
  const url = 'https://thenutridry.vyaparpe.in/api/admin/debug-settings';
  console.log('Fetching:', url);
  const res = await fetch(url, {
    headers: {
      'Cookie': cookies
    }
  });
  const data = await res.text();
  console.log(data);
}

run().catch(console.error);
