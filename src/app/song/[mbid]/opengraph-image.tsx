import { ImageResponse } from "next/og";
import { getCachedSong } from "@/lib/cache";

export const alt = "Melomano — Song Info";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ mbid: string }>;
}) {
  const { mbid } = await params;
  const song = await getCachedSong(mbid);

  const title = song?.title ?? "Unknown Song";
  const artist = song?.artist ?? "Unknown Artist";
  const album = song?.albumTitle;

  let albumArtSrc: ArrayBuffer | null = null;
  if (song?.coverArtUrl) {
    try {
      const res = await fetch(song.coverArtUrl);
      if (res.ok) albumArtSrc = await res.arrayBuffer();
    } catch {
      // text-only fallback
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {albumArtSrc && (
          <img
            src={albumArtSrc as unknown as string}
            width={400}
            height={400}
            style={{
              borderRadius: "16px",
              objectFit: "cover",
              marginRight: "50px",
              flexShrink: 0,
            }}
          />
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: "#7c8aff",
              letterSpacing: "2px",
              marginBottom: "16px",
            }}
          >
            MELOMANO
          </div>
          <div
            style={{
              fontSize: albumArtSrc ? 48 : 64,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
              marginBottom: "12px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 32, color: "#a0a0c0", marginBottom: "8px" }}>
            {artist}
          </div>
          {album && (
            <div style={{ fontSize: 24, color: "#606080" }}>{album}</div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
