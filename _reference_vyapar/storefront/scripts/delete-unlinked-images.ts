import { supabaseAdmin } from '../src/lib/database.js';

async function deleteUnlinkedImages() {
  const targetBucket = 'products';
  
  const filesToDelete = [
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785619717914_fqu05y53.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785619770933_ww5pt2nh.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785619800683_oeb44uwp.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785619831115_7l1oepoo.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785619859551_reid0nuh.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785619918213_ap033324.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785619969625_ryyg0zop.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620014068_ciencdlq.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620064883_c1uhwgho.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620534917_xaz2r0ws.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620582088_h3ydy2h7.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620630181_utuch3t2.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620662979_beqwnill.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620696996_mp1swk5e.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620734503_1ql77a32.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620763806_uwqx9s8h.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785620795313_9uof7mko.webp',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785623772709_n3uci2ju.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785623779423_e3xvg07e.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785623788178_bglh6chv.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785623796069_k7wjx4h0.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785623819590_w5os1cwa.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785623825684_fglnp3iv.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785624027431_jz5uyth0.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785624033559_0q97ho5a.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785624051399_2k2x555y.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785624060364_cemm7a80.png',
    'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0/1785624380843_mkol2e35.png'
  ];

  console.log(`Attempting to delete ${filesToDelete.length} unlinked files...`);
  
  const { data, error } = await supabaseAdmin.storage.from(targetBucket).remove(filesToDelete);
  
  if (error) {
    console.error("Deletion failed:", error);
  } else {
    console.log(`Successfully deleted ${data?.length || 0} files.`);
    data?.forEach(d => console.log('Deleted:', d.name));
  }
}

deleteUnlinkedImages().catch(console.error);
