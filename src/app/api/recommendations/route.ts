import { NextRequest, NextResponse } from "next/server";
import { fetchHarmonicRecommendations } from "@/lib/recommendations";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Internal server error";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mbid = searchParams.get("mbid");
  const bpmStr = searchParams.get("bpm");
  const key = searchParams.get("key");

  if (!mbid || !bpmStr || !key) {
    return NextResponse.json(
      { error: "Missing required parameters: mbid, bpm, key" },
      { status: 400 }
    );
  }

  const bpm = parseFloat(bpmStr);
  if (isNaN(bpm)) {
    return NextResponse.json(
      { error: "BPM must be a valid number" },
      { status: 400 }
    );
  }

  try {
    const recommendations = await fetchHarmonicRecommendations(mbid, bpm, key);
    return NextResponse.json({
      status: "success",
      recommendations,
    });
  } catch (err: unknown) {
    console.error("Recommendations route handler error:", err);
    return NextResponse.json(
      { error: errorMessage(err) },
      { status: 500 }
    );
  }
}
