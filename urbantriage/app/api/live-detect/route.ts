import { NextRequest, NextResponse } from "next/server";
import { liveDetectFrame } from "@/lib/ai-vision";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { frame } = body;

    if (!frame) {
      return NextResponse.json(
        { error: "Frame is required" },
        { status: 400 }
      );
    }

    // Real-time Groq Multimodal live frame classifier
    try {
      const detection = await liveDetectFrame(frame);
      return NextResponse.json({
        success: true,
        detection,
      });
    } catch (vlmErr) {
      console.warn("Live Groq detection fallback:", vlmErr);
    }

    return NextResponse.json({
      success: true,
      detection: {
        personDetected: false,
        wasteDetected: false,
        category: "None",
        wasteType: "Area Clear",
        wasteTypes: [],
        itemCount: 0,
        confidence: 0.0,
      },
    });
  } catch (error: any) {
    console.warn("Live detection frame warning:", error?.message || error);
    return NextResponse.json(
      {
        success: true,
        detection: {
          personDetected: false,
          wasteDetected: false,
          category: "None",
          wasteType: "Area Clear",
          wasteTypes: [],
          itemCount: 0,
          confidence: 0.0,
        },
      },
      { status: 200 }
    );
  }
}
