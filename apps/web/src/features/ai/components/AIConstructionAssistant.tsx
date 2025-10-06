'use client';

import React, { useState, useRef, useEffect } from 'react';
import { automatedInspectionAnalyzer } from '@/lib/ai/services/automated-inspection-analyzer';
import type { InspectionData } from '@/lib/ai/types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolResult?: any;
}

interface AIConstructionAssistantProps {
  inspection?: InspectionData;
  projectId?: string;
  onReportGenerated?: (report: string) => void;
}

export function AIConstructionAssistant({
  inspection,
  projectId = 'default-project',
  onReportGenerated,
}: AIConstructionAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [inspectionResult, setInspectionResult] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'system',
        content:
          'Welcome to the AI Construction Assistant! I can help you with:\n• Compliance checking against Australian Standards\n• Weather impact analysis\n• Risk assessment\n• Material calculations\n• Schedule optimization\n• Inspection reports\n\nHow can I assist you today?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Check if this is an inspection analysis request
      if (input.toLowerCase().includes('inspect') || input.toLowerCase().includes('analyze')) {
        if (inspection) {
          await analyzeInspection();
        } else {
          addAssistantMessage('Please provide inspection data to analyze.');
        }
      } else if (input.toLowerCase().includes('weather')) {
        await checkWeather();
      } else if (
        input.toLowerCase().includes('compliance') ||
        input.toLowerCase().includes('standard')
      ) {
        await checkCompliance();
      } else if (input.toLowerCase().includes('risk')) {
        await assessRisk();
      } else if (input.toLowerCase().includes('material')) {
        await calculateMaterials();
      } else if (input.toLowerCase().includes('schedule')) {
        await optimizeSchedule();
      } else {
        // General assistance
        await provideGeneralAssistance(input);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      addAssistantMessage('Sorry, I encountered an error processing your request.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeInspection = async () => {
    if (!inspection) {
      addAssistantMessage('No inspection data available to analyze.');
      return;
    }

    addAssistantMessage('Analyzing inspection data...');
    setActiveTools(['check_compliance', 'analyze_weather_impact', 'identify_defects']);

    const result = await automatedInspectionAnalyzer.analyzeInspection(inspection, {
      projectId,
      location: inspection.location,
      projectSpecifications: { requiresReport: true },
    });

    setInspectionResult(result);
    setActiveTools([]);

    // Display results
    let summary = `## Inspection Analysis Complete\n\n`;
    summary += `**Overall Status:** ${getStatusEmoji(result.overallStatus)} ${result.overallStatus.toUpperCase()}\n\n`;

    if (result.complianceResults.length > 0) {
      summary += `### Compliance Results\n`;
      result.complianceResults.forEach((cr) => {
        summary += `- ${cr.standard}: ${cr.compliant ? '✅ Compliant' : '❌ Non-compliant'}\n`;
      });
      summary += '\n';
    }

    if (result.weatherAssessment) {
      summary += `### Weather Assessment\n`;
      summary += `- Can Proceed: ${result.weatherAssessment.canProceed ? '✅ Yes' : '❌ No'}\n`;
      if (result.weatherAssessment.restrictions?.length > 0) {
        summary += `- Restrictions: ${result.weatherAssessment.restrictions.join(', ')}\n`;
      }
      summary += '\n';
    }

    if (result.defects.length > 0) {
      summary += `### Defects Identified\n`;
      summary += `- Total: ${result.defects.length}\n`;
      summary += `- Critical: ${result.defects.filter((d) => d.severity === 'critical').length}\n`;
      summary += '\n';
    }

    if (result.recommendations.length > 0) {
      summary += `### Recommendations\n`;
      result.recommendations.forEach((rec) => {
        summary += `- ${rec}\n`;
      });
    }

    addAssistantMessage(summary);

    if (result.reportGenerated && result.reportContent) {
      onReportGenerated?.(result.reportContent);
      addAssistantMessage(
        '📄 Full inspection report has been generated and is ready for download.'
      );
    }
  };

  const checkWeather = async () => {
    addToolMessage('analyze_weather_impact', 'Analyzing weather conditions...');

    setTimeout(() => {
      const weatherAdvice = `### Weather Analysis

**Current Conditions:** ${inspection?.weather.conditions || 'Unknown'}
**Temperature:** ${inspection?.weather.temperature || 'N/A'}°C

**Recommendations:**
- Clay work: ${inspection?.weather.conditions === 'rainy' ? '❌ Not suitable - wait for dry conditions' : '✅ Suitable for placement'}
- Concrete pour: ${inspection?.weather.temperature && inspection.weather.temperature > 35 ? '⚠️ Hot weather protocols required' : '✅ Normal procedures'}
- Drainage work: ${inspection?.weather.conditions === 'wet' ? '⚠️ Dewatering may be required' : '✅ Proceed normally'}

Always check the detailed forecast before starting weather-sensitive work.`;

      addAssistantMessage(weatherAdvice);
      setActiveTools([]);
    }, 1500);
  };

  const checkCompliance = async () => {
    addToolMessage('check_compliance', 'Checking compliance against Australian Standards...');

    setTimeout(() => {
      const complianceInfo = `### Compliance Check

**Applicable Standards:**
- AS 3798: Earthworks for commercial and residential developments
- AS/NZS 3500.3: Plumbing and drainage
- AS 2870: Residential slabs and footings
- AS 4671: Steel reinforcing materials

To perform a detailed compliance check, I need:
1. Type of work being inspected
2. Measurements and test results
3. Materials being used
4. Site conditions

Would you like to check compliance for a specific standard?`;

      addAssistantMessage(complianceInfo);
      setActiveTools([]);
    }, 1500);
  };

  const assessRisk = async () => {
    addToolMessage('assess_risk', 'Performing risk assessment...');

    setTimeout(() => {
      const riskInfo = `### Risk Assessment

**Common Construction Risks:**

1. **Weather-Related Risks**
   - Heavy rain: Trench collapse, material damage
   - High temperature: Heat stress, concrete issues
   - Strong wind: Crane operations, dust

2. **Site-Specific Risks**
   - Excavation: Cave-ins, utilities strike
   - Working at height: Falls, dropped objects
   - Heavy machinery: Struck-by, caught-between

3. **Material Risks**
   - Clay: Moisture sensitivity, shrinkage
   - Concrete: Curing issues, strength development
   - Steel: Corrosion, thermal expansion

**Mitigation Strategies:**
- Implement SWMS (Safe Work Method Statements)
- Regular toolbox talks
- PPE compliance
- Weather monitoring
- Quality control checkpoints

Would you like a detailed risk assessment for your specific activity?`;

      addAssistantMessage(riskInfo);
      setActiveTools([]);
    }, 1500);
  };

  const calculateMaterials = async () => {
    addToolMessage('calculate_material_requirements', 'Calculating material requirements...');

    setTimeout(() => {
      const materialInfo = `### Material Calculator

I can help calculate materials for:

**Concrete:**
- Slabs: Volume = Length × Width × Thickness
- Footings: Volume per footing × Number of footings
- Add 10% wastage

**Fill Material:**
- Compacted volume = Loose volume × Compaction factor
- Clay: Factor 0.9
- Sand: Factor 0.95
- Rock: Factor 0.85

**Steel Reinforcement:**
- Mesh: Area + 10% overlap
- Bars: Linear meters + lap lengths

Please provide dimensions to calculate specific quantities.`;

      addAssistantMessage(materialInfo);
      setActiveTools([]);
    }, 1500);
  };

  const optimizeSchedule = async () => {
    addToolMessage('optimize_schedule', 'Analyzing schedule optimization opportunities...');

    setTimeout(() => {
      const scheduleInfo = `### Schedule Optimization

**Optimization Strategies:**

1. **Parallel Activities**
   - Identify non-dependent tasks
   - Resource allocation planning
   - Potential time saving: 15-25%

2. **Fast-Tracking**
   - Overlap sequential activities
   - Increased supervision required
   - Risk: Quality issues if not managed

3. **Weather Windows**
   - Schedule concrete pours for optimal conditions
   - Plan earthworks around dry periods
   - Buffer for weather delays: +10-15%

4. **Council Approvals**
   - Submit early with complete documentation
   - Consider private certification
   - Pre-lodgement meetings

Would you like me to analyze a specific project schedule?`;

      addAssistantMessage(scheduleInfo);
      setActiveTools([]);
    }, 1500);
  };

  const provideGeneralAssistance = async (query: string) => {
    addAssistantMessage(`I understand you're asking about "${query}". Let me help you with that.

Based on your query, I can provide assistance with:
- Technical specifications and standards
- Best practices for construction
- Safety requirements
- Quality control procedures

Please provide more details about what specific information you need.`);
  };

  const addAssistantMessage = (content: string) => {
    const message: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const addToolMessage = (toolName: string, content: string) => {
    const message: Message = {
      id: `tool-${Date.now()}`,
      role: 'tool',
      content,
      toolName,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
    setActiveTools((prev) => [...prev, toolName]);
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const formatMessage = (message: Message) => {
    if (message.content.includes('###') || message.content.includes('**')) {
      // Simple markdown parsing
      return message.content.split('\n').map((line, idx) => {
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="font-bold text-lg mt-2 mb-1">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={idx} className="font-semibold">
              {line.replace(/\*\*/g, '')}
            </p>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <li key={idx} className="ml-4">
              {line.replace('- ', '')}
            </li>
          );
        }
        return <p key={idx}>{line}</p>;
      });
    }
    return message.content;
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b bg-blue-50">
        <h2 className="text-xl font-semibold">AI Construction Assistant</h2>
        <p className="text-sm text-gray-600">Powered by Claude 3.5 Sonnet</p>
      </div>

      {/* Active Tools Indicator */}
      {activeTools.length > 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-yellow-700">Active Tools:</span>
            {activeTools.map((tool) => (
              <span key={tool} className="px-2 py-1 text-xs bg-yellow-200 rounded-full">
                {tool.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                    ? 'bg-gray-100 text-gray-800'
                    : message.role === 'tool'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-200 text-gray-800'
              }`}
            >
              {message.role === 'tool' && (
                <div className="flex items-center mb-2">
                  <span className="text-xs font-semibold">🔧 {message.toolName}</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{formatMessage(message)}</div>
              <div className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about compliance, weather, risks, or materials..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`px-4 py-2 rounded-md font-medium text-white ${
              loading || !input.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Send
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setInput('Check compliance with AS 3798')}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Check Compliance
          </button>
          <button
            type="button"
            onClick={() => setInput('Analyze weather conditions')}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Weather Analysis
          </button>
          <button
            type="button"
            onClick={() => setInput('Assess construction risks')}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Risk Assessment
          </button>
          <button
            type="button"
            onClick={() => setInput('Calculate material requirements')}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Materials
          </button>
          {inspection && (
            <button
              type="button"
              onClick={() => setInput('Analyze current inspection')}
              className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
            >
              Analyze Inspection
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
