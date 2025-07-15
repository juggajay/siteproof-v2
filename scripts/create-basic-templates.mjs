#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const basicTemplates = [
  {
    name: 'Site Establishment',
    description: 'Basic site establishment and preparation inspection template',
    category: 'Site Works',
    structure: {
      sections: [
        {
          id: 'section-1',
          title: 'Site Setup',
          description: 'Initial site setup and preparation',
          items: [
            {
              id: 'item-1',
              type: 'checkbox',
              label: 'Site boundaries marked and secured',
              required: true
            },
            {
              id: 'item-2', 
              type: 'checkbox',
              label: 'Safety signage installed',
              required: true
            },
            {
              id: 'item-3',
              type: 'textarea',
              label: 'Additional notes',
              required: false
            }
          ]
        }
      ]
    }
  },
  {
    name: 'Concrete Works',
    description: 'Concrete placement and finishing inspection template',
    category: 'Structural',
    structure: {
      sections: [
        {
          id: 'section-1',
          title: 'Pre-Pour Inspection',
          description: 'Checks before concrete placement',
          items: [
            {
              id: 'item-1',
              type: 'checkbox',
              label: 'Formwork checked and approved',
              required: true
            },
            {
              id: 'item-2',
              type: 'checkbox', 
              label: 'Reinforcement in place and tied',
              required: true
            },
            {
              id: 'item-3',
              type: 'number',
              label: 'Concrete temperature (°C)',
              required: true,
              min: 5,
              max: 35
            }
          ]
        }
      ]
    }
  },
  {
    name: 'Earthworks',
    description: 'Earthworks and compaction inspection template',
    category: 'Earthworks',
    structure: {
      sections: [
        {
          id: 'section-1',
          title: 'Compaction Testing',
          description: 'Soil compaction verification',
          items: [
            {
              id: 'item-1',
              type: 'number',
              label: 'Compaction percentage (%)',
              required: true,
              min: 90,
              max: 100
            },
            {
              id: 'item-2',
              type: 'select',
              label: 'Test method',
              required: true,
              options: ['Sand replacement', 'Nuclear densometer', 'Core cutter']
            },
            {
              id: 'item-3',
              type: 'checkbox',
              label: 'Moisture content within specification',
              required: true
            }
          ]
        }
      ]
    }
  }
];

async function createTemplates() {
  try {
    console.log('Creating basic ITP templates...');
    
    // Get the first organization (you may need to adjust this)
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
      
    if (orgError || !orgs || orgs.length === 0) {
      console.error('No organizations found:', orgError);
      return;
    }
    
    const orgId = orgs[0].id;
    console.log('Using organization ID:', orgId);
    
    // Get the first user as creator (you may need to adjust this)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (userError || !users || users.length === 0) {
      console.error('No users found:', userError);
      return;
    }
    
    const userId = users[0].id;
    console.log('Using user ID:', userId);
    
    for (const template of basicTemplates) {
      const { data, error } = await supabase
        .from('itp_templates')
        .insert({
          organization_id: orgId,
          name: template.name,
          description: template.description,
          category: template.category,
          structure: template.structure,
          is_active: true,
          version: 1,
          usage_count: 0,
          created_by: userId
        })
        .select()
        .single();
        
      if (error) {
        console.error(`Failed to create template ${template.name}:`, error);
      } else {
        console.log(`✅ Created template: ${template.name}`);
      }
    }
    
    console.log('Finished creating templates');
    
  } catch (error) {
    console.error('Error creating templates:', error);
  }
}

createTemplates();