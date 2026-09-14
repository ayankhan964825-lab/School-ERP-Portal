import 'dotenv/config';
import { saveSettings, getSettings } from './src/lib/database';
import { storeContext } from './src/lib/storeContext';

async function testSave() {
  const ndId = '00000000-0000-0000-0000-000000000002';

  await storeContext.run({ storeId: ndId }, async () => {
    console.log('--- BEFORE SAVE ---');
    const s1 = await getSettings(ndId);
    console.log('website_theme:', s1.website_theme);
    console.log('website_design:', s1.website_design);

    const newSettings = {
      website_theme: JSON.stringify({ active_preset: 'quiet_luxury' }),
      website_configuration: JSON.stringify({ theme: 'standard' })
    };

    console.log('Saving:', newSettings);
    await saveSettings(newSettings);

    console.log('--- AFTER SAVE ---');
    const s2 = await getSettings(ndId);
    console.log('website_theme:', s2.website_theme);
    console.log('website_design:', s2.website_design);
  });
}

testSave();
