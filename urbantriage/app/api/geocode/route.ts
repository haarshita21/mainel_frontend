import { NextRequest, NextResponse } from "next/server";
import { forwardGeocode } from "@/lib/geo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q.trim()) {
      return NextResponse.json(
        { error: "Query param 'q' is required" },
        { status: 400 }
      );
    }

    const geoData = await forwardGeocode(q);

    if (!geoData) {
      return NextResponse.json(
        { error: "Could not geocode locality" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: geoData,
    });
  } catch (error: any) {
    console.error("Error in /api/geocode:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to geocode query" },
      { status: 500 }
    );
  }
}
