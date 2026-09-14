import crypto from 'crypto';

const jwtSecret = 'vyapar_secret_2024';

function generateFakeAdminCookies() {
  const storeId = '00000000-0000-0000-0000-000000000002';
  const payload = `${storeId}:super_admin:super_admin_root`;
  const signature = crypto.createHmac('sha256', jwtSecret).update(payload).digest('hex');
  
  return `admin_id=super_admin_root; admin_role=super_admin; admin_signature=${signature}; admin_impersonate=${storeId};`;
}

async function run() {
  const cookies = generateFakeAdminCookies();
  const url = 'https://thenutridry.vyaparpe.in/admin/store-details';
  console.log('Fetching:', url);
  const res = await fetch(url, {
    headers: {
      'Cookie': cookies
    }
  });
  const html = await res.text();
  
  const teamMatch = html.match(/<input type="hidden" id="team_members_json" name="team_members" value="(.*?)"/);
  if (teamMatch) {
    console.log('FOUND TEAM JSON IN HTML:');
    console.log(teamMatch[1]);
  } else {
    console.log('NOT FOUND in HTML!');
    // check if we got redirected to login
    console.log(html.substring(0, 500));
  }
}

run().catch(console.error);
