import { supabaseAdmin } from '../src/lib/database.js';
import { TABLES } from '../src/lib/constants.js';
import { storeContext } from '../src/lib/storeContext.js';

async function auditAbout() {
  const storeId = 'e6b1560c-13e7-4abb-b84b-a6a6a760a5e0';
  const { data: settings } = await supabaseAdmin.from(TABLES.SETTINGS).select('pages_content').eq('store_id', storeId).single();
  
  if (!settings) return;
  
  let pc = settings.pages_content || {};
  if (typeof pc === 'string') {
    try { pc = JSON.parse(pc); } catch(e) { pc = {}; }
  }

  console.log("--- ABOUT US HERO ---");
  console.log("Hero Subtitle:", pc.about_hero_subtitle);
  console.log("Hero Title:", pc.about_hero_title);
  console.log("Hero Text:", pc.about_hero_text);

  console.log("\n--- MISSION & APPROACH ---");
  console.log("Mission Title:", pc.about_mission_title);
  console.log("Mission Text:", pc.about_mission_text);
  console.log("Approach Title:", pc.about_approach_title);
  console.log("Approach Text:", pc.about_approach_text);

  console.log("\n--- OUR PROCESS ---");
  console.log("Process Title:", pc.about_process_title);
  console.log("Process Subtitle:", pc.about_process_subtitle);
  console.log("Process Steps:");
  let steps = pc.about_process_steps;
  if (typeof steps === 'string') {
    try { steps = JSON.parse(steps); } catch (e) {}
  }
  if (Array.isArray(steps)) {
    steps.forEach((s, i) => console.log(`${i+1}. ${s.title}: ${s.desc}`));
  } else {
    console.log("NO STEPS DEFINED / USING DEFAULTS");
  }
}

storeContext.run({ storeId: 'SUPER_ADMIN_BYPASS' }, () => {
  auditAbout().catch(console.error);
});
