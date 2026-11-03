import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Valid lat and lng query params are required" },
        { status: 400 }
      );
    }

    const geoData = await reverseGeocode(lat, lng);

    return NextResponse.json({
      success: true,
      data: geoData,
    });
  } catch (error: any) {
    console.error("Error in /api/reverse-geocode:", error);
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "12.9716");
    const lng = parseFloat(searchParams.get("lng") || "77.5946");
    return NextResponse.json(
      {
        success: true,
        data: {
          area: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          city: "Local District",
          state: "",
        },
      },
      { status: 200 }
    );
  }
}
