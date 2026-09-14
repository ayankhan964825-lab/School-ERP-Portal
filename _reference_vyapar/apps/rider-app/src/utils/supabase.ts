import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgfikdhcudyixwbwlcuh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZbDmtiSr8ISF2HsqtwbEDg_pjJEHPt-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
