const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envUrl = envContent.match(/PUBLIC_SUPABASE_URL=(.*)/)?.[1];
const envKey = envContent.match(/PUBLIC_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || envContent.match(/PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(envUrl, envKey);

async function listFiles(bucket, folder) {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) {
    console.log('Error listing', folder, ':', error.message);
    return;
  }
  for (const file of data || []) {
    if (file.id === null) {
      // It's a folder
      await listFiles(bucket, folder ? `${folder}/${file.name}` : file.name);
    } else {
      console.log(`File: ${folder}/${file.name} - Created: ${file.created_at}`);
    }
  }
}

async function run() {
  console.log('Listing recently uploaded files...');
  // Find which bucket they use. 'images', 'public', etc.
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => b.name));
  
  if (buckets?.length > 0) {
     const targetBucket = 'products'; // Usually we store images here or 'storefront'
     console.log('Using bucket:', targetBucket);
     
     // We need to query the objects table or use the RPC if possible.
     // Alternatively, use Supabase admin to fetch from storage.objects
     const { data: objects, error: objErr } = await supabase.storage.from(targetBucket).list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
     });
     
     console.log('Objects at root:', objects?.map(o => o.name));
     
     // Often images are stored in a path like store_id/...
     const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
     const { data: storeObjects } = await supabase.storage.from(targetBucket).list(storeId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
     });
     console.log('Objects in store folder:', storeObjects?.map(o => o.name));

  }
}
run();
