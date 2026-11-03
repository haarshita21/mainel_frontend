import { NextRequest, NextResponse } from "next/server";
import { verifyCleanupWithAI } from "@/lib/ai-vision";
import { calculateDistanceMeters, CLEANUP_LOCATION_RADIUS_METERS } from "@/lib/geo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { beforeImage, afterImage, reportLocation, cleanupLocation } = body;

    if (!beforeImage || !afterImage) {
      return NextResponse.json(
        { error: "Both before and after images are required" },
        { status: 400 }
      );
    }

    let distanceMeters: number | undefined;
    let acceptableDistance: boolean | undefined;

    if (
      reportLocation?.latitude &&
      reportLocation?.longitude &&
      cleanupLocation?.latitude &&
      cleanupLocation?.longitude
    ) {
      distanceMeters = calculateDistanceMeters(
        reportLocation.latitude,
        reportLocation.longitude,
        cleanupLocation.latitude,
        cleanupLocation.longitude
      );
      acceptableDistance = distanceMeters <= CLEANUP_LOCATION_RADIUS_METERS;
    }

    // AI Vision Verification with Groq
    const aiResult = await verifyCleanupWithAI(beforeImage, afterImage);

    const isCleaned = Boolean(aiResult.verified) && aiResult.cleanupStatus === "CLEANED" && !aiResult.remainingWaste;

    const finalVerified = isCleaned;
    const finalStatus: "CLEANED" | "NOT_CLEANED" = isCleaned ? "CLEANED" : "NOT_CLEANED";
    let explanation =
      aiResult.explanation ||
      (isCleaned
        ? "Clean scene verified: The reported waste is no longer present in the verification photo."
        : "Verification Failed: Residual waste is still visible in the verification frame. Please ensure all items are cleared and retake the photo.");

    if (acceptableDistance === false && distanceMeters !== undefined) {
      explanation = `${explanation} (Warning: Location is ${distanceMeters}m from reported GPS).`;
    }

    const verification = {
      ...aiResult,
      verified: finalVerified,
      cleanupStatus: finalStatus,
      remainingWaste: !finalVerified,
      isAiGenerated: false,
      explanation,
      distanceMeters,
      acceptableDistance,
      reportLocation,
      cleanupLocation,
      beforeImageUrl: beforeImage.slice(0, 100) + "...",
      afterImageUrl: afterImage.slice(0, 100) + "...",
    };

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error: any) {
    console.error("Error in /api/verify-cleanup:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify cleanup" },
      { status: 500 }
    );
  }
}
