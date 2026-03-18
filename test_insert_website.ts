import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testInsert() {
  console.log('Fetching profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profileError) {
    console.error('Error fetching profiles:', profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profiles found. Cannot test insert.');
    return;
  }

  const userId = profiles[0].id;
  console.log('Using user ID:', userId);

  const websiteData = {
    user_id: userId,
    name: 'Test Website Script',
    url: 'https://example.com',
    check_interval: 5,
    is_owned: true,
    response_time_threshold: 5000,
    failure_threshold: 2,
    recovery_threshold_minutes: 10
  };

  console.log('Inserting website...');
  const { data, error } = await supabase
    .from('websites')
    .insert([websiteData])
    .select()
    .single();

  if (error) {
    console.error('Error inserting website:', error);
  } else {
    console.log('Successfully inserted website:', data);
    
    // Clean up
    console.log('Cleaning up...');
    await supabase.from('websites').delete().eq('id', data.id);
  }
}

testInsert();