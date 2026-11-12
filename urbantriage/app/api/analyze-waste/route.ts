import { NextRequest, NextResponse } from "next/server";
import { analyzeWasteWithAI } from "@/lib/ai-vision";

export async function POST(req: NextRequest) {
  try {
    let image: string | null = null;
    let mode: string = "piled";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const imageField = formData.get("image");
      const modeField = formData.get("mode");

      if (typeof imageField === "string") {
        image = imageField;
      } else if (imageField instanceof File) {
        const buffer = Buffer.from(await imageField.arrayBuffer());
        image = `data:${imageField.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
      }

      if (typeof modeField === "string") {
        mode = modeField;
      }
    } else {
      const body = await req.json();
      image = body.image;
      if (body.mode) mode = body.mode;
    }

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
      mode,
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
