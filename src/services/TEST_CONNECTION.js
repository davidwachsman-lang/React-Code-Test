// Test Your Supabase Connection
// Open browser console and import this module to quickly validate connectivity.

import { supabase } from './supabaseClient';

console.log('Testing Supabase connection...');
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('Estimates') // Swap this for any table that should exist
      .select('EstimateID')
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Supabase connection successful!');
    console.log('Sample response:', data);
  } catch (error) {
    console.error('❌ Unable to connect to Supabase');
    console.error('Error:', error.message);
    console.log('Verify that:');
    console.log('1. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
    console.log('2. Row Level Security policies allow this request');
    console.log('3. The table name in TEST_CONNECTION.js exists in your project');
  }
};

// Run `testSupabaseConnection()` from the browser console after importing this module:
// > import('./services/TEST_CONNECTION').then(m => m.testSupabaseConnection());
