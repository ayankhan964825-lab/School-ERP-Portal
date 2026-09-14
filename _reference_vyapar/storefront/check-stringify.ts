import { getSettings } from './src/lib/database.ts';

// Bypass Astro context
process.env.ALLOW_DEFAULT_TENANT = 'true';

async function run() {
  const settings = await getSettings();
  console.log('JSON.stringify(settings.team_members):');
  console.log(JSON.stringify(settings.team_members || []));
}

run().catch(console.error);
