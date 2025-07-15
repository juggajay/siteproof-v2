export type InspectionStatus = 'pending' | 'approved' | 'rejected';

export interface BaseITPForm {
  id?: string;
  formType: string;
  projectId: string;
  inspectorName: string;
  inspectionDate: Date;
  inspectionStatus: InspectionStatus;
  comments?: string;
  evidenceFiles?: File[] | string[];
  syncStatus?: 'pending' | 'synced' | 'failed';
  localId?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  organizationId?: string;
}

export interface EarthworksPreconstructionForm extends BaseITPForm {
  formType: 'earthworks_preconstruction';
  approvedPlansAvailable: boolean;
  startDateAdvised?: Date;
  erosionControlImplemented: boolean;
  erosionControlPhoto?: string | File;
  holdPointSignature?: string;
  holdPointDate?: Date;
}

export interface EarthworksSubgradeForm extends BaseITPForm {
  formType: 'earthworks_subgrade';
  erosionControlsInPlace: boolean;
  groundwaterControlMeasures: boolean;
  compactionPercentage?: number;
  surfaceTolerancesMet: boolean;
  surfaceMeasurements?: Record<string, number>;
  proofRollingCompleted: boolean;
  proofRollingPhoto?: string | File;
  nataCertificates?: (string | File)[];
}

export interface RoadServicesForm extends BaseITPForm {
  formType: 'road_services';
  servicesBackfilledCorrectly: boolean;
  subgradePrepared: boolean;
  subBaseGradings?: number;
  subBasePi?: number;
  subBaseCbr?: number;
  kerbingInstalled: boolean;
  kerbingLevelMeasurements?: Record<string, number>;
  kerbingWidthMeasurements?: Record<string, number>;
  nataCertificates?: (string | File)[];
}

export interface BasecourseForm extends BaseITPForm {
  formType: 'basecourse';
  kerbingConformity: boolean;
  baseMaterialGradings?: number;
  baseMaterialPi?: number;
  baseMaterialCbr?: number;
  layerSpreadCompacted: boolean;
  deflectionTestingResults?: number;
  nataCertificates?: (string | File)[];
}

export interface AsphaltSealForm extends BaseITPForm {
  formType: 'asphalt_seal';
  basecourseCompleted: boolean;
  pavementSurfaceCondition: boolean;
  weatherSuitable: boolean;
  temperature?: number;
  tackCoatApplied: boolean;
  thicknessMm?: number;
  manufacturerCertificates?: (string | File)[];
  weighBridgeDockets?: (string | File)[];
}

export interface SignsLinemarkingForm extends BaseITPForm {
  formType: 'signs_linemarking';
  sealCompletion: boolean;
  materialsConform: boolean;
  installationPerPlans: boolean;
  installationPhotos?: (string | File)[];
  concreteFootings: boolean;
  strengthTestMpa?: number;
  linemarkingWithTrafficControl: boolean;
}

export interface DrainagePreconstructionForm extends BaseITPForm {
  formType: 'drainage_preconstruction';
  approvedPlansAvailable: boolean;
  earthworksCompleted: boolean;
  startDateAdvised?: Date;
  materialsComply: boolean;
  complianceCertificates?: (string | File)[];
  holdPointSignature?: string;
  holdPointDate?: Date;
}

export interface DrainageExcavationForm extends BaseITPForm {
  formType: 'drainage_excavation';
  trenchMarkedExcavated: boolean;
  trenchDepthM?: number;
  sedimentControl: boolean;
  shoringDeepTrenches: boolean;
  groundwaterControl: boolean;
  beddingCompactedPipesLaid: boolean;
  jointCheckCompleted: boolean;
  holdPointSignature?: string;
  holdPointDate?: Date;
}

export interface DrainageBackfillForm extends BaseITPForm {
  formType: 'drainage_backfill';
  pipelayingComplete: boolean;
  bulkheadsInstalled: boolean;
  backfillMaterialGradings?: number;
  compactionCompleted: boolean;
  nataCertificates?: (string | File)[];
}

export interface DrainagePitsForm extends BaseITPForm {
  formType: 'drainage_pits';
  pipelayingComplete: boolean;
  pitsAlignedInstalled: boolean;
  plumbCheckCompleted: boolean;
  subsoilDrainageConnected: boolean;
  pitsPoured: boolean;
  jointsFlush: boolean;
  holdPointSignature?: string;
  holdPointDate?: Date;
}

export interface SubsoilDrainageForm extends BaseITPForm {
  formType: 'subsoil_drainage';
  pipelayingPitsConform: boolean;
  selectFillPlaced: boolean;
  grateCoversInstalled: boolean;
  subsoilDrainsConnected: boolean;
  gradingPercentage?: number;
  nataCertificates?: (string | File)[];
  waeSpreadsheet?: (string | File)[];
}

export interface ConcretePreplacementForm extends BaseITPForm {
  formType: 'concrete_preplacement';
  surveyVerification: boolean;
  formworkErected: boolean;
  formworkMeasurements?: Record<string, number>;
  reinforcementPlaced: boolean;
  coverSpacingMeasurements?: Record<string, number>;
  embeddedItemsPrepared: boolean;
  holdPointSignature?: string;
  holdPointDate?: Date;
  nataCertificates?: (string | File)[];
}

export interface ConcretePlacementForm extends BaseITPForm {
  formType: 'concrete_placement';
  preplacementReleased: boolean;
  evaporationRate?: number;
  concreteSlumpMm?: number;
  concreteTemperature?: number;
  placementMethod?: string;
  compactionAchieved: boolean;
  vibrationChecks?: string;
  holdPointSignature?: string;
  holdPointDate?: Date;
  testResults?: (string | File)[];
}

export interface ConcreteCuringForm extends BaseITPForm {
  formType: 'concrete_curing';
  placementComplete: boolean;
  curingMethodApplied: boolean;
  curingMethodType?: string;
  curingDurationDays?: number;
  surfaceFinishTolerances: boolean;
  surfaceMeasurements?: Record<string, number>;
  earlyLoadingTests?: number;
  holdPointSignature?: string;
  holdPointDate?: Date;
  testCertificates7_28Day?: (string | File)[];
}

export type ITPFormType = 
  | EarthworksPreconstructionForm
  | EarthworksSubgradeForm
  | RoadServicesForm
  | BasecourseForm
  | AsphaltSealForm
  | SignsLinemarkingForm
  | DrainagePreconstructionForm
  | DrainageExcavationForm
  | DrainageBackfillForm
  | DrainagePitsForm
  | SubsoilDrainageForm
  | ConcretePreplacementForm
  | ConcretePlacementForm
  | ConcreteCuringForm;

export const FORM_TYPE_LABELS: Record<string, string> = {
  earthworks_preconstruction: 'Earthworks Preconstruction & Erosion/Sediment Control',
  earthworks_subgrade: 'Earthworks Subgrade Preparation & Sub Base',
  road_services: 'Road Services Crossings & Kerbing',
  basecourse: 'Basecourse Construction',
  asphalt_seal: 'Asphalt Seal / Bitumen Seal',
  signs_linemarking: 'Signs, Devices and Linemarking',
  drainage_preconstruction: 'Drainage Preconstruction',
  drainage_excavation: 'Drainage Excavation & Pipelaying',
  drainage_backfill: 'Drainage Backfill',
  drainage_pits: 'Drainage Pits / Lintels / Grates',
  subsoil_drainage: 'Subsoil Drainage / Pit Grate Covers & Surrounds',
  concrete_preplacement: 'Concrete Pre-Placement (Formwork & Reinforcement)',
  concrete_placement: 'Concrete Placement & Compaction',
  concrete_curing: 'Concrete Curing & Finishing'
};