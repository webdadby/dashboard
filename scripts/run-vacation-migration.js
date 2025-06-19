#!/usr/bin/env node

/**
 * Script to run the vacation tables migration on a Supabase database
 * Usage: node run-vacation-migration.js
 * 
 * Environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL: The URL of your Supabase project
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: The anon/service key for your Supabase project
 */

// Переменные окружения должны быть доступны из файла .env
// Запускать скрипт следует с помощью: export $(cat .env | xargs) && node scripts/run-vacation-migration.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables must be set');
  process.exit(1);
}

console.log(`Using Supabase URL: ${supabaseUrl}`);
console.log('Service key is available');


// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Path to migration file
const migrationFilePath = path.join(__dirname, '..', 'migrations', 'create_vacation_tables.sql');

// Run migration
async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationFilePath, 'utf8');
    
    console.log('Running migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Error running migration:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
    
    // Initialize vacation settings
    console.log('Initializing vacation settings...');
    const { error: settingsError } = await supabase
      .from('vacation_settings')
      .upsert({
        id: 1,
        calculation_period_months: 12,
        vacation_coefficient: 1.0,
        default_days_per_year: 24
      });
    
    if (settingsError) {
      console.error('Error initializing settings:', settingsError);
    } else {
      console.log('Vacation settings initialized');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Execute
runMigration();
