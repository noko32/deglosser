const CAA_BASE = "https://coverartarchive.org";

export async function getCoverArt(
  releaseMbid: string
): Promise<string | null> {
  try {
    const res = await fetch(`${CAA_BASE}/release/${releaseMbid}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const front = data.images?.find(
      (img: { front: boolean }) => img.front === true
    );

    const url = front?.thumbnails?.["500"] ?? front?.thumbnails?.large ?? null;
    return url?.replace("http://", "https://") ?? null;
  } catch {
    return null;
  }
}
