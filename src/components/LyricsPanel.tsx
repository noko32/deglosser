function groupVerses(lyrics: string): string[][] {
  const lines = lyrics.split("\n").map((l) => l.trim());
  const verses: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line === "") {
      if (current.length > 0) {
        verses.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) verses.push(current);
  return verses;
}

export function LyricsPanel({ lyrics }: { lyrics: string | null }) {
  if (!lyrics) {
    return (
      <div className="panel p-4">
        <h2 className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
          Lyrics
        </h2>
        <p className="text-sm text-dg-text-muted italic">
          Lyrics not available for this track.
        </p>
      </div>
    );
  }

  const verses = groupVerses(lyrics);

  return (
    <div className="panel p-4">
      <h2 className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
        Lyrics
      </h2>
      <div className="max-h-[500px] overflow-y-auto text-sm text-dg-text-secondary leading-relaxed">
        {verses.map((verse, i) => (
          <p key={i} className="mb-4 last:mb-0">
            {verse.map((line, j) => (
              <span key={j}>
                {line}
                {j < verse.length - 1 && <br />}
              </span>
            ))}
          </p>
        ))}
        <p className="mt-6 text-xs text-dg-text-muted">
          Lyrics provided by{" "}
          <a
            href="https://lrclib.net"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-dg-text-secondary"
          >
            LRCLIB
          </a>
        </p>
      </div>
    </div>
  );
}
