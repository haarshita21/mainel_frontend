export interface LocationData {
  latitude: number;
  longitude: number;
  area: string;
  city?: string;
  state?: string;
}

export type WasteCategory =
  | "Wet waste"
  | "Dry waste"
  | "Biodegradable waste"
  | "Non-biodegradable waste"
  | "Recyclable waste"
  | "Hazardous waste"
  | "E-waste"
  | "Mixed waste"
  | "Other";

export interface WasteAnalysis {
  category: string;
  wasteType: string;
  types: string[];
  quantity: {
    scale: "small" | "medium" | "large";
    estimatedVolume?: string;
    confidence: number;
  };
  visibleItems: string[];
  severity?: "Low" | "Medium" | "High" | "Critical" | string;
  recommendedDisposal: string[];
  recommendedEquipment: string[];
  precautions?: string[];
  confidence: number;
  scatteredOrConcentrated?: "scattered" | "concentrated" | "mixed";
  environmentalImpact?: string;
  threatDetected?: boolean;
  threatScore?: number;
  environmentalContext?: {
    is_designated_waste_zone?: boolean;
    environmental_sensitivity?: number;
    macro_description?: string;
  };
  detections?: Array<{
    label: string;
    superclass: string;
    confidence: number;
    bbox: number[];
  }>;
  annotatedImage?: string;
  isAuthentic?: boolean;
  extractedGps?: {
    latitude: number;
    longitude: number;
  };
  hazmatInfo?: {
    isHazmat: boolean;
    hazmatType?: string;
    priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "STANDARD" | string;
    requiredPPE?: string[];
    hazmatAdvisory?: string;
  };
  isAiGenerated?: boolean;
  aiReason?: string;
  isWaste?: boolean;
  nonWasteReason?: string;
  isInvalidReport?: boolean;
}

export type ReportStatus =
  | "reported"
  | "analysed"
  | "open"
  | "assigned"
  | "in_progress"
  | "cleanup_submitted"
  | "verification"
  | "completed"
  | "verification_failed";

export interface CleanupVerification {
  verified: boolean;
  cleanupStatus: "CLEANED" | "PARTIALLY_CLEANED" | "NOT_CLEANED" | "UNABLE_TO_VERIFY" | "VERIFICATION_FAILED";
  confidence: number;
  remainingWaste?: boolean;
  isAiGenerated?: boolean;
  aiReason?: string;
  explanation?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  verifiedAt?: string;
  distanceMeters?: number;
  acceptableDistance?: boolean;
  ssimTelemetry?: any;
  reportLocation?: {
    latitude: number;
    longitude: number;
  };
  cleanupLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface WasteReport {
  id: string;
  imageUrl: string;
  source: "active" | "passive";
  location: LocationData;
  capturedAt: string;
  reportedAt: string;
  wasteAnalysis: WasteAnalysis;
  status: ReportStatus;
  volunteerId?: string;
  cleanupVerification?: CleanupVerification;
}

export interface CleanupTask {
  id: string;
  reportId: string;
  imageUrl: string;
  location: LocationData;
  wasteCategory: string;
  wasteTypes: string[];
  quantity: {
    scale: "small" | "medium" | "large";
    estimatedVolume?: string;
    confidence: number;
  };
  severity: string;
  recommendedDisposal: string[];
  requiredEquipment: string[];
  precautions?: string[];
  reportedAt: string;
  deadline?: string;
  status: ReportStatus;
  joinedVolunteers: string[];
  maxVolunteers: number;
  assignedVolunteer?: string;
  confidence: number;
  cleanupProof?: {
    imageUrl: string;
    submittedAt: string;
    location?: {
      latitude: number;
      longitude: number;
      area?: string;
    };
    distanceMeters?: number;
    source: "camera" | "upload";
    verificationResult?: CleanupVerification;
  };
  threatScore?: number;
  threatDetected?: boolean;
  isAuthentic?: boolean;
  environmentalSensitivity?: number;
  macroDescription?: string;
  hazmatInfo?: {
    isHazmat: boolean;
    hazmatType?: string;
    priority?: string;
    requiredPPE?: string[];
    hazmatAdvisory?: string;
  };
}
