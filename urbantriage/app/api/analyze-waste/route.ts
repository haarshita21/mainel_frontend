import { NextRequest, NextResponse } from "next/server";
import { analyzeWasteWithAI } from "@/lib/ai-vision";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Run primary AI Vision Analysis using Groq
    const analysis = await analyzeWasteWithAI(image);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error("Error in /api/analyze-waste:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze waste" },
      { status: 500 }
    );
  }
}
