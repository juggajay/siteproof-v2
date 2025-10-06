// AI Service Types for ITP Report Generation

export interface InspectionData {
  id: string;
  projectId: string;
  date: Date;
  type: 'earthworks' | 'drainage' | 'concrete' | 'reinforcement' | 'general';
  location: string;
  weather: {
    conditions: 'sunny' | 'cloudy' | 'rainy' | 'wet';
    temperature: number;
    recentRainfall?: {
      amount: number; // in mm
      daysAgo: number;
    };
  };
  measurements?: {
    compaction?: {
      density: number; // percentage
      moisture: number; // percentage
      proctor: number; // percentage
    };
    dimensions?: {
      depth?: number;
      width?: number;
      length?: number;
      thickness?: number;
    };
    gradient?: number; // percentage
  };
  materials?: {
    type: 'clay' | 'sand' | 'rock' | 'concrete' | 'steel' | 'mixed';
    supplier?: string;
    batch?: string;
  };
  images?: string[];
  notes?: string;
  nonConformances?: Array<{
    description: string;
    severity: 'critical' | 'major' | 'minor';
    standardReference?: string;
  }>;
}

export interface ComplianceCheckResult {
  compliant: boolean;
  standard: string;
  section?: string;
  requirements: Array<{
    description: string;
    required: string | number;
    actual?: string | number;
    status: 'pass' | 'fail' | 'warning' | 'not_applicable';
    notes?: string;
  }>;
  recommendations?: string[];
  holdPoints?: Array<{
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    date?: Date;
  }>;
}

export interface ITPReportRequest {
  inspection: InspectionData;
  standards: string[]; // e.g., ['AS_3798', 'AS_2870']
  reportType: 'detailed' | 'summary' | 'non-conformance';
  includeRecommendations?: boolean;
  includePhotos?: boolean;
  customPrompt?: string;
}

export interface ITPReportResponse {
  id: string;
  generatedAt: Date;
  inspection: InspectionData;
  compliance: ComplianceCheckResult[];
  summary: string;
  detailedAnalysis: {
    overview: string;
    findings: string[];
    risks: Array<{
      description: string;
      severity: 'high' | 'medium' | 'low';
      mitigation: string;
    }>;
  };
  recommendations: string[];
  nextActions: string[];
  reportMarkdown: string;
  reportPdf?: string; // Base64 encoded PDF
}

export interface AIAnalysisContext {
  projectHistory?: Array<{
    date: Date;
    type: string;
    result: 'pass' | 'fail' | 'partial';
    issues?: string[];
  }>;
  siteClassification?: string; // e.g., 'H' for highly reactive clay
  weatherHistory?: Array<{
    date: Date;
    rainfall: number;
    temperature: number;
  }>;
  previousNonConformances?: Array<{
    date: Date;
    description: string;
    resolved: boolean;
  }>;
}

export interface AIPromptTemplate {
  role: string;
  context: string;
  task: string;
  format: string;
  examples?: string[];
}

export type ReportSection =
  | 'header'
  | 'summary'
  | 'compliance'
  | 'measurements'
  | 'materials'
  | 'findings'
  | 'recommendations'
  | 'photos'
  | 'certification';

export interface ReportTemplate {
  sections: ReportSection[];
  formatting: {
    includeLogos?: boolean;
    includeStandards?: boolean;
    includeSignatures?: boolean;
    pageSize?: 'A4' | 'Letter';
  };
}
