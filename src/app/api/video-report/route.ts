import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const OVERRIDES_FILE = join(DATA_DIR, "video-overrides.json");

interface VideoOverride {
  videoId: string;
  reportedAt: string;
  reason: "wrong_song" | "correction";
  previousVideoId: string | null;
}

type OverridesMap = Record<string, VideoOverride>;

async function readOverrides(): Promise<OverridesMap> {
  try {
    const raw = await readFile(OVERRIDES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeOverrides(data: OverridesMap): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OVERRIDES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(request: NextRequest) {
  const mbid = request.nextUrl.searchParams.get("mbid");
  const overrides = await readOverrides();

  if (mbid) {
    const entry = overrides[mbid];
    return NextResponse.json({ override: entry ?? null });
  }

  return NextResponse.json({ overrides });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mbid, videoId, reason, correctUrl, previousVideoId } = body;

    if (!mbid || !reason) {
      return NextResponse.json({ error: "Missing mbid or reason" }, { status: 400 });
    }

    if (reason === "correction" && !correctUrl) {
      return NextResponse.json({ error: "Missing correctUrl for correction" }, { status: 400 });
    }

    // Extract YouTube ID from the provided URL
    let resolvedVideoId: string | null = null;
    if (reason === "correction" && correctUrl) {
      const match = correctUrl.match(
        /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
      );
      resolvedVideoId = match && match[2].length === 11 ? match[2] : null;
      if (!resolvedVideoId) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }
    }

    // For "wrong_song" without a correction, we just flag it (no override video).
    // For "correction", we save the new video ID as the override.
    if (reason === "wrong_song" && !resolvedVideoId) {
      // Flag only — no video to substitute yet.
      const overrides = await readOverrides();
      overrides[mbid] = {
        videoId: "__flagged__",
        reportedAt: new Date().toISOString(),
        reason,
        previousVideoId: previousVideoId ?? videoId ?? null,
      };
      await writeOverrides(overrides);
      return NextResponse.json({ status: "flagged" });
    }

    const overrides = await readOverrides();
    overrides[mbid] = {
      videoId: resolvedVideoId!,
      reportedAt: new Date().toISOString(),
      reason,
      previousVideoId: previousVideoId ?? videoId ?? null,
    };
    await writeOverrides(overrides);

    return NextResponse.json({ status: "saved", videoId: resolvedVideoId });
  } catch {
    return NextResponse.json({ error: "Failed to process report" }, { status: 500 });
  }
}
