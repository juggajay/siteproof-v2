const { createClient } = require('@supabase/supabase-js');

// This script creates sample ITP templates for testing
// You'll need to run this after authentication in your application

const sampleTemplates = [
  {
    name: "Foundation Inspection",
    description: "Comprehensive foundation inspection checklist",
    category: "Construction",
    structure: {
      sections: [
        {
          id: "foundation-prep",
          title: "Foundation Preparation",
          description: "Check foundation preparation requirements",
          items: [
            {
              id: "excavation",
              type: "checkpoint",
              title: "Excavation Complete",
              description: "Verify excavation depth and dimensions are correct",
              required: true,
              fields: [
                {
                  id: "depth",
                  type: "text",
                  label: "Depth (meters)",
                  required: true,
                  placeholder: "Enter depth measurement"
                },
                {
                  id: "width",
                  type: "text",
                  label: "Width (meters)",
                  required: true,
                  placeholder: "Enter width measurement"
                },
                {
                  id: "weather",
                  type: "select",
                  label: "Weather Conditions",
                  options: ["Dry", "Wet", "Frozen"],
                  required: true
                }
              ]
            },
            {
              id: "soil-condition",
              type: "checkpoint",
              title: "Soil Condition Assessment",
              description: "Check soil conditions and bearing capacity",
              required: true,
              fields: [
                {
                  id: "soil-type",
                  type: "select",
                  label: "Soil Type",
                  options: ["Clay", "Sand", "Gravel", "Rock", "Mixed"],
                  required: true
                },
                {
                  id: "bearing-capacity",
                  type: "text",
                  label: "Bearing Capacity (kPa)",
                  required: false
                }
              ]
            }
          ]
        },
        {
          id: "concrete-work",
          title: "Concrete Work",
          description: "Concrete pouring and finishing inspection",
          items: [
            {
              id: "concrete-mix",
              type: "checkpoint",
              title: "Concrete Mix Verification",
              description: "Verify concrete mix design and delivery",
              required: true,
              fields: [
                {
                  id: "mix-design",
                  type: "text",
                  label: "Mix Design Reference",
                  required: true
                },
                {
                  id: "slump-test",
                  type: "text",
                  label: "Slump Test Result (mm)",
                  required: true
                },
                {
                  id: "delivery-time",
                  type: "date",
                  label: "Delivery Time",
                  required: true
                }
              ]
            },
            {
              id: "reinforcement",
              type: "checkpoint",
              title: "Reinforcement Inspection",
              description: "Check reinforcement placement and spacing",
              required: true,
              fields: [
                {
                  id: "rebar-size",
                  type: "text",
                  label: "Rebar Size",
                  required: true
                },
                {
                  id: "spacing",
                  type: "text",
                  label: "Spacing (mm)",
                  required: true
                },
                {
                  id: "coverage",
                  type: "text",
                  label: "Concrete Coverage (mm)",
                  required: true
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "Electrical Safety Check",
    description: "Basic electrical safety inspection",
    category: "Electrical",
    structure: {
      sections: [
        {
          id: "power-systems",
          title: "Power Systems",
          description: "Check electrical power systems and connections",
          items: [
            {
              id: "main-panel",
              type: "checkpoint",
              title: "Main Panel Inspection",
              description: "Inspect main electrical panel and connections",
              required: true,
              fields: [
                {
                  id: "panel-rating",
                  type: "text",
                  label: "Panel Rating (A)",
                  required: true
                },
                {
                  id: "grounding",
                  type: "checkbox",
                  label: "Proper grounding verified",
                  required: true
                }
              ]
            },
            {
              id: "circuits",
              type: "checkpoint",
              title: "Circuit Testing",
              description: "Test individual circuits and breakers",
              required: true,
              fields: [
                {
                  id: "circuit-count",
                  type: "text",
                  label: "Number of Circuits",
                  required: true
                },
                {
                  id: "voltage-reading",
                  type: "text",
                  label: "Voltage Reading (V)",
                  required: true
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "Quality Control Checklist",
    description: "General quality control inspection",
    category: "Quality",
    structure: {
      sections: [
        {
          id: "documentation",
          title: "Documentation Review",
          description: "Review project documentation and specifications",
          items: [
            {
              id: "drawings",
              type: "checkpoint",
              title: "Drawing Review",
              description: "Verify work matches approved drawings",
              required: true,
              fields: [
                {
                  id: "drawing-number",
                  type: "text",
                  label: "Drawing Number",
                  required: true
                },
                {
                  id: "revision",
                  type: "text",
                  label: "Revision",
                  required: true
                },
                {
                  id: "compliance",
                  type: "select",
                  label: "Compliance Status",
                  options: ["Compliant", "Non-compliant", "Requires clarification"],
                  required: true
                }
              ]
            }
          ]
        },
        {
          id: "workmanship",
          title: "Workmanship",
          description: "Assess quality of workmanship",
          items: [
            {
              id: "finish-quality",
              type: "checkpoint",
              title: "Finish Quality",
              description: "Inspect finish quality and appearance",
              required: true,
              fields: [
                {
                  id: "finish-rating",
                  type: "select",
                  label: "Finish Rating",
                  options: ["Excellent", "Good", "Fair", "Poor"],
                  required: true
                },
                {
                  id: "defects",
                  type: "textarea",
                  label: "Defects Noted",
                  required: false,
                  placeholder: "List any defects or issues"
                }
              ]
            }
          ]
        }
      ]
    }
  }
];

console.log('Sample ITP Templates:');
console.log('====================');

sampleTemplates.forEach((template, index) => {
  console.log(`\n${index + 1}. ${template.name}`);
  console.log(`   Category: ${template.category}`);
  console.log(`   Description: ${template.description}`);
  console.log(`   Sections: ${template.structure.sections.length}`);
  
  template.structure.sections.forEach((section, sIndex) => {
    console.log(`     ${sIndex + 1}. ${section.title} (${section.items.length} items)`);
  });
});

console.log('\n\nTo create these templates in your application:');
console.log('1. Sign in to your application');
console.log('2. Go to Settings > ITP Templates');
console.log('3. Create each template using the structure above');
console.log('4. Or use the API to create them programmatically');

module.exports = { sampleTemplates };