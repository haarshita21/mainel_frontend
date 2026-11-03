import { WasteAnalysis, CleanupVerification } from "./types";
import { callGroqVision, extractJsonFromText, GROQ_API_KEY } from "./groq";

export { GROQ_API_KEY };

/**
 * ==============================================================================
 * SECTION 1: WASTE REPORTING AI ANALYSIS (GROQ VISION)
 * Accurately detects and classifies the true material and physical objects
 * present in the photograph with high precision and hazmat detection.
 * ==============================================================================
 */
export async function analyzeWasteWithAI(imageBase64: string): Promise<WasteAnalysis> {
  const systemPrompt = `You are an expert AI computer vision analyzer for an environmental incident reporting, municipal cleanup, and material triage system.
Analyze the provided photograph with high accuracy and precision:

1. MATERIAL & CATEGORY CLASSIFICATION:
   Accurately determine the exact true material and primary category of the objects present:
   - Plastic bottles, plastic cups, containers, polythene bags, wrappers, plastic cutlery, plastic pens/markers -> "Plastic"
   - Cardboard boxes, paper sheets, newspapers, notebooks, paper packaging, cartons -> "Paper"
   - Beverage cans, food tins, aluminum foil, scrap metal, wire -> "Metal"
   - Glass bottles, broken glass, jars -> "Glass"
   - Phone chargers, power adapters, cables, batteries, electronic gadgets, circuit boards -> "E-waste"
   - Food waste, organic scraps, vegetable/fruit peel, leftover meals -> "Wet waste"
   - Medical waste, syringes, chemical containers, toxic materials, hazardous industrial items -> "Hazardous waste"
   - General mixed litter, construction rubble, mixed debris -> "Mixed waste"

2. PRECISE OBJECT IDENTIFICATION:
   Identify the actual physical items visible in the frame without guessing or defaulting.
   - If it is a cardboard box or paper sheet, label it as "Cardboard Box" or "Paper Sheet", category "Paper".
   - If it is a water bottle, label it as "Plastic Bottle", category "Plastic".
   - If it is an aluminum beverage can, label it as "Beverage Can", category "Metal".
   - If it is a power adapter or charger cable, label it as "Charger / Cable", category "E-waste".
   - If multiple distinct items exist, list each distinct object in "wasteTypes" and "visibleItems".
   - Do NOT duplicate synonyms for a single item.

3. 2D OBJECT LOCALIZATION (BOUNDING BOXES):
   For each distinct object detected, provide:
   - "box_2d": [ymin, xmin, ymax, xmax] as normalized integers from 0 to 1000
   - "label": specific descriptive item label
   - "category": primary category
   - "confidence": number between 0.75 and 0.99

4. HAZMAT & THREAT EVALUATION:
   - "isHazmat": true if medical, biohazard, syringes, chemicals, corroded batteries, or toxic waste
   - "threatDetected": true if biohazard, toxic chemicals, sharp hazards, or electrical hazard
   - "threatScore": float between 0.0 and 1.0

5. DISPOSAL GUIDANCE & PPE:
   - "quantity": scale ("small" | "medium" | "large"), estimatedVolume (e.g. "0.01 m³")
   - "severity": "Low" | "Medium" | "High" | "Critical" (use Critical for HazMat/threats)
   - "recommendedDisposal": practical municipal disposal directions
   - "recommendedEquipment": appropriate PPE (gloves, tongs, dust mask, etc.)
   - "precautions": practical safety tips

Return strictly a valid JSON object matching this schema:
{
  "wasteCategory": string,
  "wasteType": string,
  "wasteTypes": string[],
  "visibleItems": string[],
  "detected_objects": [
    {
      "box_2d": [ymin, xmin, ymax, xmax],
      "label": string,
      "category": string,
      "confidence": number
    }
  ],
  "isHazmat": boolean,
  "hazmatType": string,
  "threatDetected": boolean,
  "threatScore": number,
  "quantity": {
    "scale": "small" | "medium" | "large",
    "estimatedVolume": string,
    "confidence": number
  },
  "severity": "Low" | "Medium" | "High" | "Critical",
  "recommendedDisposal": string[],
  "recommendedEquipment": string[],
  "precautions": string[],
  "scatteredOrConcentrated": "scattered" | "concentrated" | "mixed",
  "environmentalImpact": string,
  "confidence": number
}`;

  try {
    const jsonText = await callGroqVision({
      systemPrompt,
      userPrompt:
        "Analyze this photograph: accurately identify the true items and materials shown, their bounding boxes [ymin, xmin, ymax, xmax], hazmat threat status, and disposal triage.",
      images: [imageBase64],
    });

    const parsed = extractJsonFromText(jsonText);

    let sureCategory = (parsed.wasteCategory || parsed.category || "Dry waste").trim();
    let sureType = (parsed.wasteType || "").trim();

    if (!sureType && Array.isArray(parsed.wasteTypes) && parsed.wasteTypes.length > 0) {
      sureType = String(parsed.wasteTypes[0]).trim();
    }
    if (!sureType && Array.isArray(parsed.detected_objects) && parsed.detected_objects.length > 0) {
      sureType = String(parsed.detected_objects[0].label || "").trim();
    }
    if (!sureType) {
      sureType = sureCategory !== "None" ? `${sureCategory} Waste` : "Waste Item";
    }

    // Deduplicate and clean distinct waste types
    const distinctTypes: string[] = [];
    const addTypeClean = (t: string) => {
      let cleaned = t.trim();
      cleaned = cleaned.replace(/^(1x|\d+x|one|a|an)\s+/i, "");
      cleaned = cleaned.replace(/\s+(being\s+)?held(\s+by\s+.*)?$/i, "");
      cleaned = cleaned.replace(/\s+(on\s+a\s+|in\s+a\s+).*$/i, "");
      cleaned = cleaned.trim();
      if (!cleaned) return;

      const lower = cleaned.toLowerCase();
      if (lower === "general item" || lower === "waste item" || lower === "trash" || lower === "item") {
        return;
      }

      const alreadyPresent = distinctTypes.some((existing) => existing.toLowerCase() === lower);
      if (!alreadyPresent) {
        distinctTypes.push(cleaned);
      }
    };

    addTypeClean(sureType);

    if (Array.isArray(parsed.wasteTypes)) {
      parsed.wasteTypes.forEach((wt: string) => {
        if (typeof wt === "string") addTypeClean(wt);
      });
    }

    if (distinctTypes.length === 0) {
      distinctTypes.push(sureType);
    }

    // Normalized detections with bounding boxes
    const detections: Array<{ label: string; superclass: string; confidence: number; bbox: number[] }> = [];
    if (Array.isArray(parsed.detected_objects)) {
      parsed.detected_objects.forEach((obj: any) => {
        const coords = obj.box_2d || obj.bbox;
        if (Array.isArray(coords) && coords.length === 4) {
          const rawLabel = String(obj.label || sureType).trim();
          detections.push({
            label: rawLabel,
            superclass: obj.category || sureCategory,
            confidence: typeof obj.confidence === "number" ? obj.confidence : 0.94,
            bbox: coords, // [ymin, xmin, ymax, xmax] 0-1000
          });
        }
      });
    }

    if (detections.length === 0 && distinctTypes.length > 0) {
      detections.push({
        label: sureType,
        superclass: sureCategory,
        confidence: 0.92,
        bbox: [180, 220, 820, 780],
      });
    }

    const visibleItemsList = distinctTypes.map((t) => (t.startsWith("1x") ? t : `1x ${t}`));

    const isHazmat = Boolean(parsed.isHazmat || sureCategory.toLowerCase().includes("hazard"));
    const threatDetected = Boolean(parsed.threatDetected || isHazmat);
    const threatScore = typeof parsed.threatScore === "number" ? parsed.threatScore : (threatDetected ? 0.85 : 0.0);

    const severity: "Low" | "Medium" | "High" | "Critical" =
      threatDetected || isHazmat
        ? "Critical"
        : (parsed.severity as any) || "Low";

    const recommendedEquipment: string[] = Array.isArray(parsed.recommendedEquipment) && parsed.recommendedEquipment.length > 0
      ? parsed.recommendedEquipment
      : ["Protective work gloves"];

    if (isHazmat && !recommendedEquipment.includes("Chemical-resistant gloves / Respirator")) {
      recommendedEquipment.push("Chemical-resistant gloves / Respirator");
    }

    return {
      category: sureCategory,
      wasteType: sureType,
      types: distinctTypes,
      quantity: {
        scale: parsed.quantity?.scale || "small",
        estimatedVolume: parsed.quantity?.estimatedVolume || "0.005–0.02 m³",
        confidence: typeof parsed.quantity?.confidence === "number" ? parsed.quantity.confidence : 0.90,
      },
      visibleItems: visibleItemsList.length > 0 ? visibleItemsList : distinctTypes,
      severity,
      recommendedDisposal: Array.isArray(parsed.recommendedDisposal) && parsed.recommendedDisposal.length > 0
        ? parsed.recommendedDisposal
        : [
            "Segregate dry recyclable materials and containers",
            "Route to authorized municipal dry recovery collection",
          ],
      recommendedEquipment,
      precautions: Array.isArray(parsed.precautions) && parsed.precautions.length > 0
        ? parsed.precautions
        : ["Ensure dry segregation and use protective gear"],
      scatteredOrConcentrated: parsed.scatteredOrConcentrated || "concentrated",
      environmentalImpact:
        parsed.environmentalImpact ||
        "Routine municipal triage recommended.",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.94,
      detections: detections.length > 0 ? detections : undefined,
      isAiGenerated: false,
      isWaste: true,
      nonWasteReason: undefined,
      isInvalidReport: false,
      threatDetected,
      threatScore,
      hazmatInfo: isHazmat
        ? {
            isHazmat: true,
            hazmatType: parsed.hazmatType || sureCategory,
            priority: "CRITICAL",
            requiredPPE: recommendedEquipment,
            hazmatAdvisory: "Hazardous waste detected. Exercise extreme caution and use recommended PPE.",
          }
        : undefined,
    };
  } catch (err: any) {
    console.warn("Groq AI Analysis failed or API key pending, using standalone fallback:", err?.message || err);
    return {
      category: "Dry waste",
      wasteType: "General Waste Item",
      types: ["General Waste Item"],
      quantity: {
        scale: "small",
        estimatedVolume: "0.01 m³",
        confidence: 0.70,
      },
      visibleItems: ["1x General Waste Item"],
      severity: "Low",
      recommendedDisposal: [
        "Segregate recyclable materials and dry waste",
        "Route to municipal dry waste collection center",
      ],
      recommendedEquipment: ["Protective work gloves"],
      precautions: ["Ensure dry segregation"],
      scatteredOrConcentrated: "concentrated",
      environmentalImpact: "Routine segregation recommended.",
      confidence: 0.70,
      detections: [
        {
          label: "Waste Item",
          superclass: "Dry waste",
          confidence: 0.70,
          bbox: [180, 220, 820, 780],
        },
      ],
      isAiGenerated: false,
      isWaste: true,
      nonWasteReason: undefined,
      isInvalidReport: false,
    };
  }
}

/**
 * ==============================================================================
 * SECTION 2: VOLUNTEER CLEANUP VERIFICATION (GROQ VISION)
 * Compares BEFORE dump image with AFTER cleanup proof photograph
 * ==============================================================================
 */
export async function verifyCleanupWithAI(
  beforeImageBase64: string,
  afterImageBase64: string
): Promise<CleanupVerification> {
  const systemPrompt = `You are an expert AI cleanup verification auditor for UrbanTriage.
Compare two photographs to verify whether a reported waste site or item has been cleaned:
Image 1 (BEFORE): Shows the reported waste, items, litter, or debris at the location.
Image 2 (AFTER): The volunteer's cleanup proof photograph of the same scene after cleaning.

VERIFICATION RULES:
1. TARGET ITEM & WASTE REMOVAL:
   - Identify what specific waste, litter, or items were present in Image 1 (BEFORE).
   - Check if that waste/item has been removed and is no longer present in Image 2 (AFTER).
   - If the reported waste from Image 1 is no longer there in Image 2, the cleanup is SUCCESSFUL!

2. DISTINGUISH WASTE FROM AMBIENT ENVIRONMENT & VOLUNTEERS:
   - A volunteer, person, hands, or camera in the frame is NOT waste.
   - Normal physical room and outdoor features (walls, bulletin boards, window frames, doors, fixtures, floor tiles, pavement, trees, soil) are PART OF THE ENVIRONMENT, NOT waste.

3. DECISION SCHEMA:
   - If the reported waste/item from Image 1 is no longer present in Image 2:
     "verified": true, "cleanupStatus": "CLEANED", "remainingWaste": false,
     "explanation": "Cleanup verified: The reported waste has been cleared from the scene."
   - If the reported waste/item from Image 1 is still present in Image 2:
     "verified": false, "cleanupStatus": "NOT_CLEANED", "remainingWaste": true,
     "explanation": "Verification Failed: The reported item is still visible in the verification frame."

Return strictly valid JSON:
{
  "verified": boolean,
  "cleanupStatus": "CLEANED" | "NOT_CLEANED",
  "confidence": number,
  "remainingWaste": boolean,
  "explanation": string
}`;

  try {
    const jsonText = await callGroqVision({
      systemPrompt,
      userPrompt:
        "Compare Image 1 (BEFORE) and Image 2 (AFTER). If the waste shown in Image 1 is no longer present in Image 2, verify the cleanup.",
      images: [beforeImageBase64, afterImageBase64],
    });

    const parsed = extractJsonFromText(jsonText);

    const isCleaned = Boolean(parsed.verified) && parsed.cleanupStatus === "CLEANED" && !parsed.remainingWaste;
    const cleanupStatus: "CLEANED" | "NOT_CLEANED" = isCleaned ? "CLEANED" : "NOT_CLEANED";

    const defaultExplanation = isCleaned
      ? "Visual audit confirmed: The reported waste has been completely cleared from the scene."
      : "Verification Failed: Residual waste is still visible in the frame. Please clear all remaining items and retake the photo.";

    return {
      verified: isCleaned,
      cleanupStatus,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : (isCleaned ? 0.95 : 0.85),
      remainingWaste: !isCleaned,
      isAiGenerated: false,
      explanation: parsed.explanation || defaultExplanation,
      verifiedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn("Groq AI verification failed or API key pending:", err?.message || err);
    return {
      verified: false,
      cleanupStatus: "NOT_CLEANED",
      confidence: 0.0,
      remainingWaste: true,
      isAiGenerated: false,
      explanation:
        "Automated verification audit was unable to confirm clean surface. Please ensure your Groq API key is configured and the scene is brightly lit.",
      verifiedAt: new Date().toISOString(),
    };
  }
}

/**
 * ==============================================================================
 * SECTION 3: LIVE CAMERA FRAME AI DETECTION (GROQ VISION)
 * Real-time video frame evaluation for waste classification.
 * Filters out humans and clothing so they are never classified as waste.
 * ==============================================================================
 */
export async function liveDetectFrame(frameBase64: string): Promise<{
  personDetected: boolean;
  wasteDetected: boolean;
  category: string;
  wasteType: string;
  wasteTypes: string[];
  itemCount: number;
  confidence: number;
}> {
  const systemPrompt = `You are a real-time computer vision classifier for an environmental and municipal waste triage camera feed.
Examine this video frame for waste, discarded litter, or recyclable materials.

CRITICAL RULES:
1. HUMANS AND CLOTHING ARE NEVER WASTE:
   Human faces, people, bodies, hands, skin, and normal clothing (t-shirts, shirts, jackets, sweaters, pants) ARE NEVER WASTE OR PLASTIC.
   NEVER label a person, body part, face, or clothing as plastic, trash, or waste.
2. If the frame only shows a person, human face, clothing, indoor room, background, wall, or ceiling with NO waste or litter, RETURN:
   "wasteDetected": false,
   "category": "None",
   "wasteType": "Area Clear",
   "wasteTypes": [],
   "itemCount": 0,
   "confidence": 0.0
3. Only return "wasteDetected": true if a specific physical waste item, discarded object, recyclable material, or litter is clearly visible (such as an empty plastic bottle, cup, carry bag, food wrapper, cardboard, notebook, paper, cable, charger/adapter, battery, metal can, glass bottle, electronic scrap).
4. If a person is holding a specific item up to the camera (e.g. a notebook, adapter, bottle, pen), classify ONLY that item, NOT the person or their clothing.

Return strictly valid JSON:
{
  "wasteDetected": boolean,
  "category": string,
  "wasteType": string,
  "wasteTypes": string[],
  "itemCount": number,
  "confidence": number
}`;

  try {
    const jsonText = await callGroqVision({
      systemPrompt,
      userPrompt:
        "Analyze this live camera frame for waste/recyclable items. Humans and clothing are NOT waste. Ignore humans and clothes.",
      images: [frameBase64],
    });

    const parsed = extractJsonFromText(jsonText);

    const isWaste = Boolean(parsed.wasteDetected);
    const sureCat = isWaste ? (parsed.category || "Dry waste") : "None";
    const sureType = isWaste ? (parsed.wasteType || "Item Detected") : "Area Clear";
    const types = Array.isArray(parsed.wasteTypes) && parsed.wasteTypes.length > 0
      ? parsed.wasteTypes
      : (isWaste ? [sureType] : []);

    return {
      personDetected: false,
      wasteDetected: isWaste,
      category: sureCat,
      wasteType: sureType,
      wasteTypes: types,
      itemCount: typeof parsed.itemCount === "number" ? parsed.itemCount : (isWaste ? 1 : 0),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : (isWaste ? 0.92 : 0.0),
    };
  } catch (err) {
    return {
      personDetected: false,
      wasteDetected: false,
      category: "None",
      wasteType: "Area Clear",
      wasteTypes: [],
      itemCount: 0,
      confidence: 0.0,
    };
  }
}
