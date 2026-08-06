/**
 * Hypothesis locks for pd_melomano_itunes_resolve (post-fix expectations).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import {
  normalizeMappingKey,
  albumsCompatible,
  verifyMbidMatchesContext,
} from "@/lib/mapping-quality";
import type { MBRecordingDetail } from "@/lib/types";

vi.mock("@/lib/musicbrainz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/musicbrainz")>();
  return {
    ...actual,
    getRecordingWithRels: vi.fn(),
  };
});

import { getRecordingWithRels } from "@/lib/musicbrainz";

const getRecordingMock = vi.mocked(getRecordingWithRels);

function mockRecording(partial: {
  id: string;
  title: string;
  length: number;
  artistName: string;
  artistId: string;
  releaseId: string;
  releaseTitle: string;
}): MBRecordingDetail {
  return {
    id: partial.id,
    title: partial.title,
    length: partial.length,
    "artist-credit": [
      {
        name: partial.artistName,
        artist: { id: partial.artistId, name: partial.artistName },
      },
    ],
    releases: [
      {
        id: partial.releaseId,
        title: partial.releaseTitle,
        date: "2024-01-01",
        "release-group": {
          "primary-type": "Album",
          "secondary-types": [],
        },
      },
    ],
    relations: [],
  };
}

describe("H1 — resolve route 400 when id/artist/title missing", () => {
  it("returns 400 for RSC-style request with only _rsc (console repro)", async () => {
    const { GET } = await import("@/app/api/itunes/resolve/route");
    const req = new NextRequest(
      "https://melomano.dev/api/itunes/resolve?_rsc=6grVi_EUBxTWnLP"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required parameters/i);
  });

  it("SearchResultsList uses plain <a> for unresolved /api/itunes/resolve hrefs", () => {
    const src = readFileSync(
      join(__dirname, "../../components/SearchResultsList.tsx"),
      "utf8"
    );
    expect(src).toMatch(/from "next\/link"/);
    expect(src).toMatch(/\/api\/itunes\/resolve\?id=/);
    expect(src).toMatch(/const Nav = song\.mbid \? Link : "a"/);
    expect(src).toMatch(/<Nav[\s\S]*href=\{href\}/);
  });
});

describe("H3 — accent normalization", () => {
  it("Valentín and Valentin produce the same key", () => {
    expect(normalizeMappingKey("Valentín Elizalde")).toBe(
      normalizeMappingKey("Valentin Elizalde")
    );
    expect(normalizeMappingKey("Valentín Elizalde")).toBe("valentinelizalde");
  });
});

describe("H2 — duration bypass for compilation album mismatch", () => {
  beforeEach(() => {
    getRecordingMock.mockReset();
  });

  it("albumsCompatible: iTunes compilation ≠ MB studio album", () => {
    expect(
      albumsCompatible(
        "Lo mejor del Homenaje a una Vida",
        "El Gallo De Oro"
      )
    ).toBe(false);
  });

  it("verifyMbidMatchesContext: accepts duration-matched Vete Ya despite album mismatch", async () => {
    getRecordingMock.mockResolvedValue(
      mockRecording({
        id: "b080ec62-e0f2-4a8b-aecd-79f2e4e1c3c1",
        title: "Vete Ya",
        length: 155786,
        artistName: "Valentín Elizalde",
        artistId: "f45cbc18-1561-4b76-9850-535e871cdd49",
        releaseId: "d44f0e03-1cd5-44e4-b2a8-fd964235f505",
        releaseTitle: "El Gallo De Oro",
      })
    );

    const result = await verifyMbidMatchesContext(
      "b080ec62-e0f2-4a8b-aecd-79f2e4e1c3c1",
      "Valentín Elizalde",
      "Vete Ya",
      "Lo mejor del Homenaje a una Vida",
      155787
    );

    expect(result.ok).toBe(true);
  });

  it("control: PARTYGIRL duration mismatch still fails album check", async () => {
    getRecordingMock.mockResolvedValue(
      mockRecording({
        id: "partygirl-recording",
        title: "Von dutch",
        length: 420000,
        artistName: "Charli xcx",
        artistId: "charli-artist-id",
        releaseId: "pg-rel",
        releaseTitle: "Boiler Room & Charli XCX Presents PARTYGIRL",
      })
    );

    const result = await verifyMbidMatchesContext(
      "partygirl-recording",
      "Charli xcx",
      "Von dutch",
      "BRAT",
      156000
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/release_mismatch|suspicious_release/);
  });
});
