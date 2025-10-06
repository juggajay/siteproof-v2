# AI-Powered Construction Management System

## Overview

This system integrates Claude 3.5 Sonnet with specialized construction tools to provide intelligent assistance for compliance checking, weather analysis, project scheduling, and inspection management.

## 🛠️ Available Tools

### 1. Australian Standards Tool

```typescript
// Get standard requirements
const result = await askClaude('What are the compaction requirements for clay under AS 3798?');
// Uses: get_australian_standard
```

### 2. Weather Analysis Tool

```typescript
// Check weather suitability with alerts
const result = await askClaude('Can we pour concrete today if the temperature is 38°C?');
// Uses: check_weather_restrictions, make_weather_decision
// Returns: Temperature alerts, rain warnings, can_proceed status

// Check earthworks conditions
const result = await askClaude('Can we place clay fill with rain forecast tomorrow?');
// Uses: check_weather_restrictions
// Returns: Material-specific restrictions, drying requirements
```

### 3. Council Approval Tool

```typescript
// Predict approval timeline with risk assessment
const result = await askClaude(
  'How long will Georges River council take for a complex development?'
);
// Uses: get_council_approval_timeline, predict_project_timeline
// Returns: Average days, risk level, planning recommendations
```

### 4. Compliance Verification Tool

```typescript
// Verify measurements against standards
const result = await askClaude(
  'Check if 95% proctor compaction meets requirements for high-risk earthworks'
);
// Uses: get_australian_standard, verify_compliance
```

### 5. Test Frequency Calculator

```typescript
// Calculate required testing
const result = await askClaude(
  'How many compaction tests do I need for 5000m³ of fill at a level 1 site?'
);
// Uses: calculate_test_frequency
```

### 6. Concrete Curing Tool

```typescript
// Get curing requirements
const result = await askClaude(
  'What are the curing requirements for high-strength concrete at 8°C?'
);
// Uses: get_curing_requirements
```

### 7. Compaction Compliance Tool

```typescript
// Check compaction test results
const result = await askClaude(
  'Check if 19.8 kN/m³ dry density meets 98% proctor requirement with 20.2 kN/m³ MDD'
);
// Uses: check_compaction_compliance
// Returns: Pass/fail, achieved percentage, cost impact warnings
```

## 📡 API Usage

### Basic Query

```typescript
// POST /api/ai/ask
const response = await fetch('/api/ai/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'Your question here',
    context: {
      projectId: 'project-123',
      sessionId: 'session-456',
    },
  }),
});

const result = await response.json();
// {
//   success: true,
//   answer: "Detailed response...",
//   toolsUsed: [...],
//   recommendations: [...],
//   confidence: 85
// }
```

### Get Available Tools

```typescript
// GET /api/ai/ask?examples=true
const response = await fetch('/api/ai/ask?examples=true');
const tools = await response.json();
// Returns list of tools with examples
```

## 🏗️ Knowledge Base

### Australian Standards

- **AS 3798**: Earthworks for commercial and residential developments
  - Compaction requirements: 95-98% of Maximum Dry Density (MDD)
  - Supervision levels: Level 1 (high risk), Level 2 (medium), Level 3 (low)
  - Testing frequencies based on fill volume
- **AS/NZS 3500.3**: Plumbing and drainage - Stormwater
- **AS 2870**: Residential slabs and footings
- **AS 4671**: Steel reinforcing materials

### Weather Rules

- Material-specific drying times
- Temperature restrictions for concrete
- Clay placement after rainfall
- Hot and cold weather protocols

### Council Data

- Approval timeframes by council (Georges River: 259 days, Sydney: 95 days)
- Performance ratings and risk levels (HIGH/MEDIUM/LOW)
- Typical delays vs statutory targets
- Planning recommendations based on historical performance
- Fast-track options and strategies

## 💡 Example Queries

### Compliance Checking

```
"Check earthworks compliance for clay fill with 96% proctor,
18% moisture, after 30mm rain 5 days ago"
```

### Weather Decision

```
"Is it safe to place concrete if it's 35°C with 20% chance
of rain this afternoon?"

"Check if we can do earthworks with clay at 40°C temperature"

"Can we continue drainage work with heavy rain forecast?"
```

### Project Planning

```
"Create a timeline for a project in North Sydney council area
with heritage considerations"
```

### Material Calculations

```
"Calculate material requirements for a 500m² slab,
150mm thick with 10% wastage"
```

### Risk Assessment

```
"Assess risks for excavation work after recent heavy rainfall"
```

### Compaction Testing

```
"Check if test results show 19.5 kN/m³ dry density with MDD of 20 kN/m³
for level 1 supervision earthworks"
```

## 🔄 Tool Execution Flow

1. **Query Processing**: User submits natural language query
2. **Intent Analysis**: Claude determines which tools to use
3. **Tool Selection**: Appropriate tools are selected based on query
4. **Tool Execution**: Tools are called with proper parameters
5. **Result Integration**: Tool results are integrated into response
6. **Final Answer**: Comprehensive answer with recommendations

## 📊 Response Structure

```typescript
interface QueryResult {
  answer: string; // Main response
  toolsUsed: Tool[]; // Tools that were executed
  recommendations: string[]; // Actionable recommendations
  warnings: string[]; // Important warnings
  confidence: number; // Confidence score (0-100)
}
```

## 🎯 Best Practices

### For Developers

1. Always provide context (projectId, location, etc.)
2. Be specific in queries for better tool selection
3. Check tool execution status in responses
4. Handle rate limiting gracefully

### For Users

1. Ask specific questions with measurements
2. Include weather conditions when relevant
3. Specify council names for approval queries
4. Mention material types for accurate analysis

## 🚀 Quick Start

### React Hook Usage

```typescript
import { useAIAssistant } from '@/lib/ai/hooks/use-ai-assistant';

function MyComponent() {
  const { ask, loading, response } = useAIAssistant();

  const handleQuery = async () => {
    const result = await ask(
      "Check AS 3798 requirements for clay compaction"
    );
    console.log(result.answer);
  };

  return (
    <button onClick={handleQuery} disabled={loading}>
      Ask AI Assistant
    </button>
  );
}
```

### Direct API Call

```typescript
import {
  askClaude,
  checkCompliance,
  analyzeWeather,
  planProject,
} from '@/lib/ai/services/tool-coordinator';

// General query
const result = await askClaude('What are AS 3798 requirements?');

// Compliance-focused analysis (uses specialized prompt)
const compliance = await checkCompliance(
  'Check if 95% proctor meets AS 3798 Level 1 requirements',
  { projectId: 'project-123' }
);
// Returns: PASS/FAIL, financial impact, recommendations

// Weather-focused analysis (uses weather prompt)
const weather = await analyzeWeather('Can we pour concrete at 38°C with rain forecast?', {
  location: 'Sydney',
});
// Returns: Go/no-go decision, recovery times, mitigation

// Project planning (uses planning prompt)
const timeline = await planProject('Create schedule for Georges River council project', {
  projectType: 'subdivision',
});
// Returns: Critical path, risk areas, optimizations
```

## 🧠 Specialized System Prompts

The AI system automatically selects the appropriate expert persona based on your query:

### Compliance Assistant

- **Triggers**: compliance, standard, AS/NZS, proctor, check, verify
- **Focus**: Conservative analysis, financial impact, specific standard citations
- **Response**: PASS/FAIL status, cost estimates, prioritized recommendations

### Weather Analyst

- **Triggers**: weather, rain, temperature, concrete pour, forecast
- **Focus**: Go/no-go decisions, material behavior, safety protocols
- **Response**: Current assessment, weather alerts, recovery times

### Project Planner

- **Triggers**: schedule, timeline, council, approval, critical path
- **Focus**: CPM analysis, council intelligence, resource optimization
- **Response**: Timeline summary, critical path, risk areas, contingencies

### General Assistant

- **Default**: Balanced approach for general construction queries
- **Focus**: Comprehensive knowledge across all domains
- **Response**: Flexible format based on query type

## 🔧 Configuration

### Environment Variables

```env
ANTHROPIC_API_KEY=your-api-key-here
```

### Model Settings

```typescript
// In config.ts
export const AI_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4096,
  temperature: 0.2, // Low for consistency
};
```

## 📈 Performance

- Average tool execution: ~200ms
- Claude response time: 1-3 seconds
- Tool success rate: >95%
- Confidence scores: 70-95% typical

## 🛡️ Error Handling

The system handles:

- Invalid tool inputs
- API rate limiting
- Network failures
- Malformed queries
- Missing context

## 📝 Compliance Features

### Automatic Checks

- Proctor density requirements
- Moisture content ranges
- Layer thickness limits
- Drying time requirements
- Hold point identification

### Standards Coverage

- Earthworks (AS 3798)
- Drainage (AS/NZS 3500.3)
- Footings (AS 2870)
- Reinforcement (AS 4671)

## 🌦️ Weather Intelligence

### Automatic Analysis

- Material-specific restrictions
- Drying time calculations
- Temperature impact assessment
- Rain delay recommendations
- Optimal work windows

## 📅 Scheduling Features

### Council Integration

- Approval time predictions
- Performance-based estimates
- Fast-track identification
- Bottleneck warnings

### Timeline Optimization

- Critical path analysis
- Parallel task identification
- Weather-aware scheduling
- Resource leveling

## Support

For issues or questions, contact the development team or refer to the inline documentation in each service file.
