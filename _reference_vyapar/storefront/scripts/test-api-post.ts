import fetch from 'node-fetch';

async function testPost() {
  const storeId = '00000000-0000-0000-0000-000000000002';
  const role = 'super_admin';
  const cookies = `admin_store=${storeId}; admin_role=${role}; admin_hierarchy=0;`;

  try {
    const res = await fetch('http://localhost:4321/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        action: 'update',
        settings: {
          website_theme: JSON.stringify({ active_preset: 'quiet_luxury' }),
          website_configuration: JSON.stringify({ theme: 'standard' })
        }
      })
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (e: any) {
    console.error('Fetch error:', e.message);
  }
}

testPost();
