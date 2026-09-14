const fs = require('fs');
fetch('http://localhost:4321')
  .then(r => r.text())
  .then(t => {
    const matches = [...t.matchAll(/data-src="([^"]+)"/g)];
    const urls = matches.map(m => m[1]);
    console.log("Found Video URLs:");
    urls.forEach(u => console.log(u));
  });
