import { describe, it, expect } from "vitest";
import { onlineMapUrl, pdfText, ONLINE_URL } from "../src/pdf";

describe("pdf export", () => {
  it("links the QR code to the published site when run locally", () => {
    const hash = "#s=abc123&b=36x48";
    expect(onlineMapUrl({ protocol: "http:", hostname: "localhost", href: "http://localhost:5173/" + hash, hash })).toBe(ONLINE_URL + hash);
    expect(onlineMapUrl({ protocol: "file:", hostname: "", href: "file:///x/index.html" + hash, hash })).toBe(ONLINE_URL + hash);
  });
  it("keeps the current address when the page is online", () => {
    const href = "https://example.org/maps/#s=zz9";
    expect(onlineMapUrl({ protocol: "https:", hostname: "example.org", href, hash: "#s=zz9" })).toBe(href);
  });
  it("only emits characters the standard PDF fonts can draw", () => {
    expect(pdfText("8×6″ · #1 ↔ #2 → 3° −2")).toBe('8×6" · #1 <-> #2 -> 3° -2');
  });
});

import { victoryPointItems, rulesSummaryHtml } from "../src/summary";
import { generate, DEFAULT_SETTINGS } from "../src/generate";

describe("battle march victory points", () => {
  const map = (objectives: "troves2" | "troves3" | "landmark" | "none") => generate({ ...DEFAULT_SETTINGS, seed: "vp", objectives, candidates: 10 });
  it("scores the objectives that are on this map", () => {
    expect(victoryPointItems(map("troves2"))[0]).toContain("up to 20 VP per turn");
    expect(victoryPointItems(map("troves3"))[0]).toContain("up to 30 VP per turn");
    expect(victoryPointItems(map("landmark"))[0]).toContain("scores 25 VP");
    expect(victoryPointItems(map("none"))[0]).toContain("no objectives");
  });
  it("lists general, standards and battle standard bearer on every map", () => {
    const html = rulesSummaryHtml(map("none"));
    expect(html).toContain("Victory points (Battle March)");
    for (const v of ["General", "50 VP", "standard taken as a trophy: 25 VP", "Battle Standard Bearer"]) expect(html).toContain(v);
  });
});
