// PDF export: the map on page 1 with a QR code to the online version, then placement, rules for this map and rule checks.
// jsPDF and qrcode are loaded on demand so they don't slow down the first page load.
import type { jsPDF as JsPDF } from "jspdf";
import { MapResult } from "./generate";
import { t } from "./i18n";
import { where, turn } from "./format";
import { rulesSummaryHtml } from "./summary";

/** Where the site is published (GitHub Pages). Used for the QR code when the PDF is made from a local copy. */
export const ONLINE_URL = "https://usulnaib.github.io/battle-march-maps/";

/** Link to this exact map online: the current address, or the published site plus the map's settings when running locally. */
export function onlineMapUrl(loc: Pick<Location, "protocol" | "hostname" | "href" | "hash"> = location): string {
  const local = !/^https?:$/.test(loc.protocol) || /^(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.|10\.)/.test(loc.hostname);
  return local ? ONLINE_URL + loc.hash : loc.href;
}

/** The standard PDF fonts only cover Latin-1 (WinAnsi): map the few other characters the page uses. */
export const pdfText = (s: string) =>
  String(s).replace(/″/g, '"').replace(/′/g, "'").replace(/↔/g, "<->").replace(/→/g, "->").replace(/−/g, "-")
    .replace(/[^\x00-\xff–—‘’“”•…]/g, "");

type Rgb = [number, number, number];
const INK: Rgb = [43, 36, 24], MUTED: Rgb = [108, 97, 80], ACCENT: Rgb = [138, 59, 34], LINE: Rgb = [217, 207, 186];
const OK: Rgb = [61, 122, 58], BAD: Rgb = [178, 58, 42];
const M = 12; // page margin, mm

export async function buildPdf(r: MapResult, mapImage: { url: string; w: number; h: number }, url = onlineMapUrl()): Promise<Blob> {
  const [{ jsPDF }, QR] = await Promise.all([import("jspdf"), import("qrcode")]);
  const qr = await QR.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: 480, color: { dark: "#2b2418", light: "#ffffff" } });
  const doc: JsPDF = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = r.board.w, H = r.board.h;
  const name = t("m_" + r.map.id);

  // ---------- page 1: map + QR ----------
  let pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
  const objText = r.objectiveRoll ? `${t("objectives")}: ${t("rolled", { r: r.objectiveRoll })} -> ${t(r.objectiveMode)}` : `${t("objectives")}: ${t(r.objectiveMode)}`;
  doc.setFont("times", "normal").setFontSize(20).setTextColor(...INK).text(pdfText(name), M, M + 5);
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...MUTED)
    .text(pdfText([`${H}×${W}″`, r.mirrored ? t("mirroredNote") : "", objText, `${t("seed")} ${r.settings.seed}`].filter(Boolean).join("  ·  ")), M, M + 11);

  const side = 48, gap = 6, top = M + 16, foot = 8;
  const aw = pw - 2 * M - side - gap, ah = ph - top - M - foot;
  const k = Math.min(aw / mapImage.w, ah / mapImage.h), iw = mapImage.w * k, ih = mapImage.h * k;
  doc.addImage(mapImage.url, "JPEG", M, top, iw, ih);

  // sidebar: QR code to the online map
  const sx = M + iw + gap, sw = pw - M - sx;
  doc.addImage(qr, "PNG", sx, top, sw, sw);
  doc.link(sx, top, sw, sw, { url });
  let sy = top + sw + 5;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...INK).text(pdfText(t("pdfQr")), sx, sy); sy += 4.5;
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
  const qrNote = doc.splitTextToSize(pdfText(t("pdfQrNote")), sw);
  doc.text(qrNote, sx, sy); sy += qrNote.length * 3.3 + 4;

  const notes: string[] = [];
  if (r.board.id !== "30x44" && r.map.derivedOnLarge) notes.push(t("derived"));
  if (r.objectives.some((o) => o.kind === "trove")) notes.push(t("trovesNote"));
  for (const n of notes) {
    const ls = doc.splitTextToSize(pdfText("* " + n), sw);
    if (sy + ls.length * 3.3 > ph - M - foot) break;
    doc.text(ls, sx, sy); sy += ls.length * 3.3 + 2;
  }

  // ---------- following pages (portrait) ----------
  doc.addPage("a4", "portrait");
  pw = doc.internal.pageSize.getWidth(); ph = doc.internal.pageSize.getHeight();
  const cw = pw - 2 * M;
  let y = M + 4;
  const need = (h: number) => { if (y + h > ph - M - 6) { doc.addPage("a4", "portrait"); y = M + 4; } };
  const h2 = (s: string) => { need(14); doc.setFont("times", "normal").setFontSize(15).setTextColor(...INK).text(pdfText(s), M, y); y += 6.5; };
  const para = (s: string, o: { size?: number; color?: Rgb; bold?: boolean; indent?: number; after?: number } = {}) => {
    const ind = o.indent || 0;
    doc.setFont("helvetica", o.bold ? "bold" : "normal").setFontSize(o.size || 9.5).setTextColor(...(o.color || INK));
    const ls = doc.splitTextToSize(pdfText(s), cw - ind);
    need(ls.length * 4.2);
    doc.text(ls, M + ind, y);
    y += ls.length * 4.2 + (o.after ?? 1.5);
  };

  // placement table
  h2(t("placement"));
  para(t("howTo", { w: W, h: H }), { color: MUTED, size: 8.5, after: 3 });
  const cols = [0, 0.28, 0.4, 0.76];
  const row = (cells: string[], head = false) => {
    const lines = cells.map((c) => (head ? [c.toUpperCase()] : c.split(" · ")));
    const rh = head ? 6 : 2 + Math.max(...lines.map((l) => l.length)) * 4.2;
    need(rh);
    doc.setFont("helvetica", head ? "bold" : "normal").setFontSize(head ? 7.5 : 9).setTextColor(...(head ? MUTED : INK));
    lines.forEach((l, i) => doc.text(l.map(pdfText), M + cols[i] * cw, y));
    doc.setDrawColor(...LINE).setLineWidth(0.2).line(M, y + rh - 4, pw - M, y + rh - 4);
    y += rh;
  };
  row([t("colPiece"), t("colSize"), t("colCentre"), t("colTurn")], true);
  for (const f of r.features) {
    const c = f.poly.reduce((a, p) => ({ x: a.x + p.x / f.poly.length, y: a.y + p.y / f.poly.length }), { x: 0, y: 0 });
    row([`#${f.n}  ${t("k_" + f.kind)}`, `${f.w}×${f.h}″`, where(c.x, c.y, W, H), turn(f.rot)]);
  }
  r.objectives.forEach((o, i) =>
    row([o.kind === "landmark" ? t("o_landmark") : `${t("o_trove")} ${i + 1}`, o.kind === "landmark" ? "100 mm" : "40 mm", where(o.x, o.y, W, H), ""]));
  y += 5;

  // rules for this map: the same summary the page shows, links kept clickable
  const box = document.createElement("div");
  box.innerHTML = rulesSummaryHtml(r);
  h2(box.querySelector("h2")?.textContent || "");
  para(box.querySelector("p")?.textContent || "", { color: MUTED, size: 8.5, after: 3 });
  for (const block of box.querySelectorAll(".rulegrid > div")) {
    need(16);
    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...ACCENT).text(pdfText((block.querySelector("h3")?.textContent || "").toUpperCase()), M, y);
    y += 4.6;
    for (const li of block.querySelectorAll("li")) {
      const anchors = [...li.querySelectorAll("a")];
      const onlyLinks = anchors.length > 0 && anchors.map((a) => a.textContent).join("").replace(/\s/g, "") === (li.textContent || "").replace(/[·\s]/g, "");
      need(5);
      doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...INK).text("•", M, y);
      if (onlyLinks) {
        let x = M + 4;
        anchors.forEach((a, i) => {
          const s = pdfText(a.textContent || "");
          doc.setTextColor(...ACCENT).textWithLink(s, x, y, { url: a.href });
          x += doc.getTextWidth(s);
          if (i < anchors.length - 1) { doc.setTextColor(...MUTED).text("  ·  ", x, y); x += doc.getTextWidth("  ·  "); }
        });
        y += 5.2;
      } else {
        para((li.textContent || "").replace(/\s+/g, " ").trim(), { indent: 4 });
      }
    }
    y += 2.5;
  }

  // rule checks
  y += 3;
  h2(t("checks"));
  const bad = r.checks.filter((c) => !c.ok);
  para(bad.length ? t("someBad", { n: bad.length }) : t("allOk", { n: r.checks.length }), { bold: true, color: bad.length ? BAD : OK, after: 2 });
  for (const c of r.checks) para(`${c.ok ? (c.info ? "i " : "OK") : "X "}   ${t("ck_" + c.key, c.params)}`, { size: 8.5, after: 0.6 });

  // footer on every page: link to the online map + page number
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
    doc.textWithLink(pdfText(t("pdfFooter")), M, h - 6, { url });
    doc.text(`${i} / ${n}`, w - M, h - 6, { align: "right" });
  }
  doc.setProperties({ title: pdfText(`Battle March – ${name} (${r.settings.seed})`), subject: url });
  return doc.output("blob");
}
