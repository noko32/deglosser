import { getRecordingWithRels } from "@/lib/musicbrainz";
import Link from "next/link";

export default async function SongPage({
  params,
}: {
  params: Promise<{ mbid: string }>;
}) {
  const { mbid } = await params;

  let recording;
  try {
    recording = await getRecordingWithRels(mbid);
  } catch {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-red-600">Failed to load song data.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Back to search
        </Link>
      </main>
    );
  }

  const artist =
    recording["artist-credit"]
      ?.map((ac: { name: string }) => ac.name)
      .join(", ") || "Unknown Artist";

  const release = recording.releases?.[0];

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        &larr; Back to search
      </Link>

      <div className="mt-6">
        <h1 className="text-3xl font-bold text-gray-900">{recording.title}</h1>
        <p className="mt-1 text-lg text-gray-600">{artist}</p>
        {release && (
          <p className="mt-1 text-sm text-gray-400">
            {release.title}
            {release.date ? ` (${release.date})` : ""}
          </p>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <p className="text-sm font-medium text-gray-500 uppercase">
          Coming soon
        </p>
        <p className="mt-2 text-gray-700">
          Lyrics, BPM, key, credits, samples, and album art will appear here
          once the aggregation layer is built.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          MusicBrainz Recording ID: {mbid}
        </p>
      </div>
    </main>
  );
}
