async function run() {
  const url = 'https://thenutridry.vyaparpe.in/admin-manifest.json';
  console.log('Fetching:', url);
  const res = await fetch(url);
  const html = await res.text();
  console.log(html);
}

run().catch(console.error);
