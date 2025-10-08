const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://slzmbpntjoaltasfxiiv.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsem1icG50am9hbHRhc2Z4aWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA0NjM3NiwiZXhwIjoyMDY2NjIyMzc2fQ.i6G2wbQJJFdq-ePZn3yvNwIXFqAfQLA8Stu_1YYVcNM';

console.log('Supabase URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('./supabase/migrations/fix_diary_labour_entries.sql', 'utf8');

    console.log('Running migration...');
    console.log(sql);

    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error('Migration failed:', error);
      // Try direct query if RPC doesn't exist
      const { error: directError } = await supabase
        .from('_migrations')
        .insert({ name: 'fix_diary_labour_entries' });
      if (directError) console.error('Direct insert failed:', directError);
    } else {
      console.log('Migration successful!', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

runMigration();
