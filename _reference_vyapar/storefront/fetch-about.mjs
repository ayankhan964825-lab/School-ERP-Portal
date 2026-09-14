async function run() {
  const url = 'https://thenutridry.vyaparpe.in/about';
  console.log('Fetching:', url);
  const res = await fetch(url);
  const html = await res.text();
  console.log(html.substring(0, 500));
  
  if (html.includes('Abdul Samad')) {
    console.log('FOUND ABDUL SAMAD!');
  } else {
    console.log('NOT FOUND!');
  }
}

run().catch(console.error);
