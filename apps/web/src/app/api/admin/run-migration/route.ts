import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Run the migration SQL directly
    const migrations = [
      `ALTER TABLE diary_labour_entries ADD COLUMN IF NOT EXISTS worker_name VARCHAR(255)`,
      `ALTER TABLE diary_labour_entries ADD COLUMN IF NOT EXISTS company VARCHAR(255)`,
      `ALTER TABLE diary_labour_entries ADD COLUMN IF NOT EXISTS workers INTEGER DEFAULT 1`,
      `ALTER TABLE diary_plant_entries ADD COLUMN IF NOT EXISTS name VARCHAR(255)`,
      `ALTER TABLE diary_plant_entries ADD COLUMN IF NOT EXISTS type VARCHAR(100)`,
      `ALTER TABLE diary_plant_entries ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1`,
      `ALTER TABLE diary_plant_entries ADD COLUMN IF NOT EXISTS hours_used DECIMAL(5, 2)`,
      `ALTER TABLE diary_plant_entries ADD COLUMN IF NOT EXISTS notes TEXT`,
      `ALTER TABLE diary_material_entries ADD COLUMN IF NOT EXISTS name VARCHAR(255)`,
      `ALTER TABLE diary_material_entries ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 3)`,
      `ALTER TABLE diary_material_entries ADD COLUMN IF NOT EXISTS unit VARCHAR(50)`,
      `ALTER TABLE diary_material_entries ADD COLUMN IF NOT EXISTS supplier VARCHAR(255)`,
      `ALTER TABLE diary_material_entries ADD COLUMN IF NOT EXISTS notes TEXT`,
    ];

    const results = [];
    for (const sql of migrations) {
      try {
        const { error } = await supabase.rpc('exec', { sql });
        if (error) {
          results.push({ sql, error: error.message });
        } else {
          results.push({ sql, success: true });
        }
      } catch (err) {
        results.push({ sql, error: String(err) });
      }
    }

    return NextResponse.json({
      message: 'Migration completed',
      results,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Failed to run migration', details: String(error) },
      { status: 500 }
    );
  }
}
