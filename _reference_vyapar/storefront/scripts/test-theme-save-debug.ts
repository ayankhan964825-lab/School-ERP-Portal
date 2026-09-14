import 'dotenv/config';
import { getSettings, saveSettings } from '../src/lib/database';
import { storeContext } from '../src/lib/storeContext';

async function testThemeSave() {
  const ndId = '00000000-0000-0000-0000-000000000002';
  await storeContext.run({ storeId: ndId }, async () => {
    console.log('=== 1. TEST SAVE SETTINGS ===');
    const res = await saveSettings({
      website_theme: JSON.stringify({ active_preset: 'quiet_luxury' }),
      website_design: JSON.stringify({ active_design: 'beauty' }),
      website_configuration: JSON.stringify({ theme: 'standard' })
    });
    console.log('saveSettings returned:', res?.pages_content?.website_theme, res?.pages_content?.website_design);

    console.log('=== 2. FETCH AFTER SAVE ===');
    const s2 = await getSettings(ndId);
    console.log('Fetched website_theme after save:', s2?.website_theme);
    console.log('Fetched website_design after save:', s2?.website_design);
    console.log('Fetched website_configuration after save:', s2?.website_configuration);

    // Revert back to original so we don't mess up user's DB
    console.log('=== 3. REVERT TO ORIGINAL ===');
    await saveSettings({
      website_theme: JSON.stringify({ active_preset: 'original' }),
      website_design: JSON.stringify({ active_design: 'classic' })
    });
  });
}

testThemeSave();
