# Melomano

[![CI](https://github.com/noko32/deglosser/actions/workflows/ci.yml/badge.svg)](https://github.com/noko32/deglosser/actions/workflows/ci.yml)

**Search any song. Get lyrics, BPM, key, credits, samples, and album art — all on one page.**

[melomano.dev](https://melomano.dev)

![Song detail page showing lyrics, audio features, credits, and album art](docs/screenshots/song-detail.png)

## About

Finding complete information about a song — lyrics, BPM, musical key, writing credits, sample relationships, album art — requires searching 5+ different sites. Melomano aggregates data from six free APIs into a single page with streaming UI that shows fast data immediately while slower sources load in the background.

## Features

- **Search** — MusicBrainz-backed with Lucene query building and artist-scoped results
- **Lyrics** — LRCLIB with exact match + fuzzy fallback (88%+ hit rate on mainstream songs)
- **Audio features** — BPM, key, energy, danceability, mood, genre via FreqBlog
- **Credits** — Writers and producers from MusicBrainz + supplemental credits (mastering, photography, etc.) from Discogs
- **Sample relationships** — "samples" and "sampled by" from MusicBrainz work-level relations
- **Album art** — Cover Art Archive with shimmer loading and gradient fallback
- **Streaming UI** — MusicBrainz fires first, then four sources load in parallel, each in its own Suspense boundary. Fast data appears in ~0.4s; full page in ~2.5s cold, <100ms cached
- **Favorites & recent searches** — localStorage-based, no sign-up required
- **Dynamic OG images** — Per-song 1200x630 cards with album art, generated via Satori
- **Postgres caching** — Aggregated song data cached in Neon; repeat lookups skip all API calls

| | |
|---|---|
| ![Home page](docs/screenshots/home.png) | ![Search results](docs/screenshots/search-results.png) |

## Tech Stack

- [Next.js 16](https://nextjs.org/) – framework (App Router, Server Components)
- [React 19](https://react.dev/) – UI
- [TypeScript](https://www.typescriptlang.org/) – language
- [Tailwind CSS v4](https://tailwindcss.com/) – styling
- [Neon Postgres](https://neon.tech/) – database
- [Drizzle ORM](https://orm.drizzle.team/) – query builder
- [Vitest](https://vitest.dev/) – testing
- [GitHub Actions](https://github.com/features/actions) – CI
- [Vercel](https://vercel.com/) – deployment

## Getting Started

```bash
git clone https://github.com/noko32/deglosser.git
cd deglosser
npm install
cp .env.example .env.local
# Fill in your API keys (see below)
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `FREQBLOG_API_KEY` | Yes | [FreqBlog](https://freqblog.com) API key (free tier: 1k requests/mo) |
| `DISCOGS_TOKEN` | Yes | [Discogs developer token](https://www.discogs.com/settings/developers) (free: 60 req/min) |
| `NEXT_PUBLIC_SITE_URL` | No | Base URL for OG tags (defaults to `https://melomano.dev`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | No | Clerk auth (app works without it) |
| `CLERK_SECRET_KEY` | No | Clerk auth (app works without it) |

## Testing

```bash
npm test          # Run all 46 tests
npx vitest --ui   # Interactive test UI
```

Tests cover the pure business logic in `src/lib/`: search query building, release selection heuristics, credit extraction, fuzzy lyric matching, format normalization, and API response mapping. Each API wrapper has mocked-fetch tests for success, failure, and edge cases.

## Note on Repo Name

This project was originally scaffolded as "deglosser" and later rebranded to Melomano. The GitHub repository name reflects the original scaffold name.
