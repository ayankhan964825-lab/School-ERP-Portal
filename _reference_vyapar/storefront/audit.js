const fs = require('fs');
const content = fs.readFileSync('c:/Users/lenovo/vyaparpe/storefront/src/lib/database.ts', 'utf8');

const regex = /export (?:async )?function get([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
let match;
const suspicious = [];

while ((match = regex.exec(content)) !== null) {
  const funcName = 'get' + match[1];
  const body = match[2];
  
  if (body.includes('.from(')) {
    if (!body.includes("eq('store_id'") && !body.includes('eq("store_id"') && !body.includes('eq(`store_id`')) {
      suspicious.push(funcName);
    }
  }
}

console.log(JSON.stringify(suspicious, null, 2));
