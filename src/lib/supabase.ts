import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oragtyuyaschfbicgrbj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LJki0EuI1GPFWFRl6Y148A_8tsnR53r';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
