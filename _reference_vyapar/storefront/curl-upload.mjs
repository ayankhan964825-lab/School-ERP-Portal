import fs from 'fs';

async function run() {
  const url = 'https://thenutridry.vyaparpe.in/api/admin/upload';
  
  const formData = new FormData();
  // We need a dummy blob
  const dummyText = 'test image content';
  const blob = new Blob([dummyText], { type: 'image/png' });
  formData.append('file', blob, 'test.png');
  
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      'Origin': 'https://thenutridry.vyaparpe.in', 'Cookie': 'admin_role=super_admin; admin_store=00000000-0000-0000-0000-000000000002; admin_id=super_admin_root'
    }
  });
  
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

run().catch(console.error);
