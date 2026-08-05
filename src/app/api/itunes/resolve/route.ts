import { NextRequest, NextResponse } from "next/server";
import { resolveItunesToMbid } from "@/lib/itunes";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Internal server error during resolution";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const artist = searchParams.get("artist");
  const title = searchParams.get("title");
  const cover = searchParams.get("cover");
  const duration = searchParams.get("duration");
  const preview = searchParams.get("preview");
  const album = searchParams.get("album");

  if (!id || !artist || !title) {
    return NextResponse.json(
      { error: "Missing required parameters: id, artist, title" },
      { status: 400 }
    );
  }

  const durationMs = duration ? parseInt(duration, 10) : undefined;

  try {
    const mbid = await resolveItunesToMbid(
      id,
      artist,
      title,
      cover || undefined,
      durationMs,
      preview || undefined,
      album || undefined
    );

    if (mbid) {
      const url = new URL(`/song/${mbid}`, request.nextUrl.origin);
      url.searchParams.set("artist", artist);
      url.searchParams.set("title", title);
      if (cover) url.searchParams.set("cover", cover);
      if (album) url.searchParams.set("album", album);
      return NextResponse.redirect(url);
    } else {
      const url = new URL("/search", request.nextUrl.origin);
      url.searchParams.set("q", `${title} ${artist}`);
      url.searchParams.set("error", "resolution_failed");
      return NextResponse.redirect(url);
    }
  } catch (err: unknown) {
    console.error("Resolution route handler failed:", err);
    return NextResponse.json(
      { error: errorMessage(err) },
      { status: 500 }
    );
  }
}
