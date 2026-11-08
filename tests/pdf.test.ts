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
