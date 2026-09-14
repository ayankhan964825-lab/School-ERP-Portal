const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].replace(/["'\r]/g, '');
  }
});

for (const key in envVars) {
  process.env[key] = envVars[key];
}

require('tsx/cli').run(['scripts/fix-ratings-count.ts']);
require('tsx/cli').run(['scripts/fix-rating-stars.ts']);
