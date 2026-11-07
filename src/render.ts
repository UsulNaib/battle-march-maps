import { MapResult, Feature } from "./generate";
import { Pt, Poly, bbox, polyGap, pointGap, centroid } from "./geom";
import { isObstacle, RULES } from "./rules";
import { t } from "./i18n";

export type Layers = { grid: boolean; dist: boolean; gaps: boolean; centre: boolean; zones: boolean; names: boolean };

// The map is drawn like a printed battle plan, so it keeps the same colours in light and dark mode.
const C = {
  table: "#e9dfc6", grid: "#cdbf9c", grid6: "#b4a37c", edge: "#5b4a2e", ink: "#2f2717",
  A: "#2f6f8f", B: "#a2452c", centre: "#7a6a48", dim: "#3b3424", obj: "#b8860b",
};
const KIND: Record<string, { fill: string; stroke: string; pat: string }> = {
  hill: { fill: "#c9b47a", stroke: "#8a7340", pat: "pHill" },
  wood: { fill: "#8fae6b", stroke: "#4f6e33", pat: "pWood" },
  building: { fill: "#b9a48a", stroke: "#5e4a35", pat: "pBuild" },
  ruins: { fill: "#c8bba5", stroke: "#6f6150", pat: "pRuins" },
  marsh: { fill: "#9fb7a8", stroke: "#4d6b5d", pat: "pMarsh" },
  rocky: { fill: "#bdb3a2", stroke: "#6d6455", pat: "pRocky" },
  wall: { fill: "#8d8577", stroke: "#3f3a32", pat: "" },
  hedge: { fill: "#5f8a45", stroke: "#33502a", pat: "" },
  fence: { fill: "#a68558", stroke: "#5a4227", pat: "" },
};

const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "");
const pts = (p: Poly) => p.map((q) => `${q.x.toFixed(3)},${q.y.toFixed(3)}`).join(" ");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function label(x: number, y: number, text: string, size = 0.85, color = C.dim, anchor = "middle", halo = true) {
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${size}" fill="${color}" text-anchor="${anchor}" dominant-baseline="middle"${halo ? ' class="halo"' : ""}>${esc(text)}</text>`;
}
function dimLine(a: Pt, b: Pt, text: string, color = C.dim) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="0.08" marker-start="url(#arr)" marker-end="url(#arr)"/>` +
    label(mx, my, text + "″", 0.8, color);
}

function edgeDims(f: Feature, W: number, H: number): string {
  const bb = bbox(f.poly);
  const left = bb.x0 <= W - bb.x1;
  const top = bb.y0 <= H - bb.y1;
  const vx = f.poly.reduce((m, p) => (left ? (p.x < m.x ? p : m) : p.x > m.x ? p : m));
  const vy = f.poly.reduce((m, p) => (top ? (p.y < m.y ? p : m) : p.y > m.y ? p : m));
  let s = "";
  const dx = left ? vx.x : W - vx.x, dy = top ? vy.y : H - vy.y;
  if (dx > 0.3) s += dimLine({ x: left ? 0 : W, y: vx.y }, vx, f1(dx));
  if (dy > 0.3) s += dimLine({ x: vy.x, y: top ? 0 : H }, vy, f1(dy));
  return s;
}

function featureArt(f: Feature): string {
  const k = KIND[f.kind];
  const c = centroid(f.poly);
  if (isObstacle(f.kind)) {
    const dash = f.kind === "fence" ? ` stroke-dasharray="0.6 0.3"` : "";
    return `<polygon points="${pts(f.poly)}" fill="${k.fill}" stroke="${k.stroke}" stroke-width="0.12"${dash}/>`;
  }
  let s = `<polygon points="${pts(f.poly)}" fill="${k.fill}" stroke="${k.stroke}" stroke-width="0.12" stroke-linejoin="round"/>`;
  s += `<polygon points="${pts(f.poly)}" fill="url(#${k.pat})" stroke="none"/>`;
  const g = `transform="translate(${c.x.toFixed(3)} ${c.y.toFixed(3)}) rotate(${f.rot})"`;
  if (f.kind === "hill") s += `<g ${g} fill="none" stroke="${k.stroke}" stroke-width="0.07"><rect x="${-f.w / 2 + 1}" y="${-f.h / 2 + 1}" width="${f.w - 2}" height="${f.h - 2}" rx="${Math.min(f.w, f.h) / 3}"/><rect x="${-f.w / 2 + 2.3}" y="${-f.h / 2 + 2.3}" width="${f.w - 4.6}" height="${f.h - 4.6}" rx="${Math.min(f.w, f.h) / 5}"/></g>`;
  if (f.kind === "building") s += `<g ${g}><rect x="${-f.w / 2 + 1.5}" y="${-f.h / 2 + 1.5}" width="${f.w - 3}" height="${f.h - 3}" fill="#8c6f50" stroke="#4b3a28" stroke-width="0.1"/><line x1="${-f.w / 2 + 1.5}" y1="0" x2="${f.w / 2 - 1.5}" y2="0" stroke="#4b3a28" stroke-width="0.08"/></g>`;
  if (f.kind === "ruins") s += `<g ${g} stroke="#5d5040" stroke-width="0.35" stroke-linecap="square" fill="none"><path d="M${-f.w / 2 + 1} ${-f.h / 2 + 1}h3 M${-f.w / 2 + 1} ${-f.h / 2 + 1}v2.5 M${f.w / 2 - 1} ${f.h / 2 - 1}h-2.5 M${f.w / 2 - 1} ${f.h / 2 - 1}v-2"/></g>`;
  return s;
}

const DEFS = `<defs>
<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.dim}"/></marker>
<pattern id="pWood" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><circle cx="1.1" cy="1.1" r="0.75" fill="#5f8441" opacity=".75"/></pattern>
<pattern id="pHill" width="1" height="1" patternUnits="userSpaceOnUse"><circle cx=".5" cy=".5" r=".07" fill="#8a7340" opacity=".5"/></pattern>
<pattern id="pBuild" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="none"/></pattern>
<pattern id="pRuins" width="1.4" height="1.4" patternUnits="userSpaceOnUse"><rect x=".3" y=".4" width=".35" height=".25" fill="#8a7c66"/></pattern>
<pattern id="pMarsh" width="2" height="1" patternUnits="userSpaceOnUse"><path d="M0 .5q.5-.3 1 0t1 0" fill="none" stroke="#4d6b5d" stroke-width=".07"/></pattern>
<pattern id="pRocky" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><path d="M.3 .9l.3-.4.4.1.2.4-.4.2z" fill="#7d7364"/></pattern>
</defs>`;

export const MARGIN = 2.4, LEGEND = 1.6;
/** Size of the drawing in inches (table plus rulers and legend). */
export const svgSize = (r: MapResult) => ({ w: r.board.w + 2 * MARGIN, h: r.board.h + 2 * MARGIN + LEGEND });

export function renderSvg(r: MapResult, L: Layers): string {
  const { board: b } = r;
  const W = b.w, H = b.h, M = MARGIN, LB = LEGEND;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-M} ${-M} ${W + 2 * M} ${H + 2 * M + LB}" font-family="Georgia, 'Times New Roman', serif" role="img" aria-label="${esc(t("m_" + r.map.id))}, ${W}×${H}″">`;
  s += `<style>.halo{paint-order:stroke;stroke:${C.table};stroke-width:.28px;stroke-linejoin:round}</style>${DEFS}`;
  s += `<rect x="${-M}" y="${-M}" width="${W + 2 * M}" height="${H + 2 * M + LB}" fill="#f6f0e1"/>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="${C.table}"/>`;
  if (L.grid) {
    for (let x = 1; x < W; x++) s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${x % 6 ? C.grid : C.grid6}" stroke-width="${x % 6 ? 0.03 : 0.06}"/>`;
    for (let y = 1; y < H; y++) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${y % 6 ? C.grid : C.grid6}" stroke-width="${y % 6 ? 0.03 : 0.06}"/>`;
  }
  // rulers
  for (let x = 0; x <= W; x++) {
    const len = x % 6 === 0 ? 0.7 : 0.3;
    s += `<line x1="${x}" y1="${-len}" x2="${x}" y2="0" stroke="${C.edge}" stroke-width="0.05"/><line x1="${x}" y1="${H}" x2="${x}" y2="${H + len}" stroke="${C.edge}" stroke-width="0.05"/>`;
    if (x % 6 === 0) s += `<text x="${x}" y="${-1.2}" font-size="0.75" text-anchor="middle" fill="${C.edge}">${x}</text><text x="${x}" y="${H + 1.6}" font-size="0.75" text-anchor="middle" fill="${C.edge}">${x}</text>`;
  }
  for (let y = 0; y <= H; y++) {
    const len = y % 6 === 0 ? 0.7 : 0.3;
    s += `<line x1="${-len}" y1="${y}" x2="0" y2="${y}" stroke="${C.edge}" stroke-width="0.05"/><line x1="${W}" y1="${y}" x2="${W + len}" y2="${y}" stroke="${C.edge}" stroke-width="0.05"/>`;
    if (y % 6 === 0) s += `<text x="${-1.1}" y="${y}" font-size="0.75" text-anchor="end" dominant-baseline="middle" fill="${C.edge}">${y}</text><text x="${W + 1.1}" y="${y}" font-size="0.75" dominant-baseline="middle" fill="${C.edge}">${y}</text>`;
  }
  // zones
  if (L.zones) {
    for (const z of r.zones) {
      const col = z.side === "A" ? C.A : C.B;
      s += `<polygon points="${pts(z.poly)}" fill="${col}" fill-opacity="0.16" stroke="${col}" stroke-width="0.12" stroke-dasharray="0.5 0.25"/>`;
      const c = centroid(z.poly);
      s += label(c.x, c.y, t(z.side === "A" ? "sideA" : "sideB"), 1.3, col);
    }
    s += `<circle cx="${W / 2}" cy="${H / 2}" r="${RULES.centreExclusion}" fill="none" stroke="${C.centre}" stroke-width="0.09" stroke-dasharray="0.35 0.3"/>`;
    s += `<path d="M${W / 2 - 0.5} ${H / 2}h1M${W / 2} ${H / 2 - 0.5}v1" stroke="${C.centre}" stroke-width="0.08"/>`;
  }
  // objectives (keep-out ring first)
  for (const o of r.objectives) {
    s += `<circle cx="${o.x}" cy="${o.y}" r="${o.r + RULES.objectiveClearance}" fill="${C.obj}" fill-opacity="0.07" stroke="${C.obj}" stroke-width="0.07" stroke-dasharray="0.3 0.25"/>`;
  }
  for (const f of r.features) s += featureArt(f);
  r.objectives.forEach((o, i) => {
    if (o.kind === "landmark") s += `<circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="#6b5a3a" stroke="${C.ink}" stroke-width="0.12"/><path d="M${o.x} ${o.y - 1.2}l.9 1.8h-1.8z" fill="#e9dfc6"/>`;
    else s += `<circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="${C.obj}" stroke="${C.ink}" stroke-width="0.1"/>` + label(o.x, o.y + 0.05, String(i + 1), 0.8, C.ink, "middle", false);
  });
  // distance markers
  if (L.dist) for (const f of r.features) s += edgeDims(f, W, H);
  if (L.centre) for (const f of r.features) {
    const g = pointGap({ x: W / 2, y: H / 2 }, f.poly);
    s += `<line x1="${g.a.x}" y1="${g.a.y}" x2="${g.b.x}" y2="${g.b.y}" stroke="${C.centre}" stroke-width="0.06" stroke-dasharray="0.2 0.2"/>`;
    const k = 0.72;
    s += label(g.a.x + (g.b.x - g.a.x) * k, g.a.y + (g.b.y - g.a.y) * k, f1(g.d) + "″", 0.75, C.centre);
  }
  if (L.gaps) {
    const seen = new Set<string>();
    for (const f of r.features) {
      let best: { d: number; a: Pt; b: Pt; o: Feature } | null = null;
      for (const o of r.features) if (o !== f) { const g = polyGap(f.poly, o.poly); if (!best || g.d < best.d) best = { ...g, o }; }
      if (!best) continue;
      const key = [f.n, best.o.n].sort().join("-");
      if (seen.has(key)) continue;
      seen.add(key);
      if (best.d > 0.2) s += dimLine(best.a, best.b, f1(best.d), "#5a3f78");
    }
  }
  // objective names
  if (L.names) r.objectives.forEach((o, i) => {
    const name = o.kind === "landmark" ? t("o_landmark") : `${t("o_trove")} ${i + 1}`;
    s += label(o.x, o.y + o.r + 0.85, name, 0.75, "#6e4f08");
  });
  // names and numbers
  for (const f of r.features) {
    const c = centroid(f.poly);
    s += `<circle cx="${c.x}" cy="${c.y}" r="0.75" fill="${r.settings.spacing === "rulebook" ? (f.owner === "A" ? C.A : C.B) : C.ink}" stroke="#fff" stroke-width="0.1"/>` + label(c.x, c.y + 0.04, String(f.n), 0.85, "#fff", "middle", false);
    if (L.names) s += label(c.x, c.y + 1.45, t("k_" + f.kind), 0.8, C.ink);
  }
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${C.edge}" stroke-width="0.14"/>`;
  // legend below the table, in straight, readable text
  const ly = H + M + 0.9;
  const items: string[] = [];
  let x = 0;
  const add = (sym: string, text: string) => {
    items.push(`<g transform="translate(${x} ${ly})">${sym}<text x="1.6" y="0" font-size="0.85" fill="${C.ink}" dominant-baseline="middle">${esc(text)}</text></g>`);
    x += 2.4 + text.length * 0.43;
  };
  if (L.zones) add(`<circle cx="0.6" cy="0" r="0.55" fill="none" stroke="${C.centre}" stroke-width="0.09" stroke-dasharray="0.3 0.2"/>`, t("centreRing"));
  if (r.objectives.length) add(`<circle cx="0.6" cy="0" r="0.55" fill="${C.obj}" fill-opacity="0.12" stroke="${C.obj}" stroke-width="0.07" stroke-dasharray="0.25 0.2"/>`, t("objRing"));
  if (L.dist || L.gaps) add(`<line x1="0" y1="0" x2="1.2" y2="0" stroke="${C.dim}" stroke-width="0.08" marker-start="url(#arr)" marker-end="url(#arr)"/>`, t("distLegend"));
  s += items.join("");
  return s + "</svg>";
}
