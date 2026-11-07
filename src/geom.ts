// Plane geometry in inches. x grows to the right, y grows downwards (top-left board corner = 0,0).
export type Pt = { x: number; y: number };
export type Poly = Pt[];

export const deg = (d: number) => (d * Math.PI) / 180;

/** Rectangle of width w (along its own x axis) and depth h, centred on (cx, cy), rotated by rot degrees. */
export function rectPoly(cx: number, cy: number, w: number, h: number, rot: number): Poly {
  const c = Math.cos(deg(rot)), s = Math.sin(deg(rot));
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => ({
    x: cx + x * c - y * s,
    y: cy + x * s + y * c,
  }));
}

export function circlePoly(cx: number, cy: number, r: number, n = 48): Poly {
  return Array.from({ length: n }, (_, i) => ({ x: cx + r * Math.cos((2 * Math.PI * i) / n), y: cy + r * Math.sin((2 * Math.PI * i) / n) }));
}

export function pointInPoly(p: Pt, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Closest point on segment ab to p. */
export function closestOnSeg(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function segsIntersect(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

export type Gap = { d: number; a: Pt; b: Pt };

/** Shortest edge-to-edge gap between two polygons (0 if they touch or overlap), with the two closest points. */
export function polyGap(P: Poly, Q: Poly): Gap {
  for (let i = 0; i < P.length; i++)
    for (let j = 0; j < Q.length; j++)
      if (segsIntersect(P[i], P[(i + 1) % P.length], Q[j], Q[(j + 1) % Q.length])) return { d: 0, a: P[i], b: P[i] };
  if (pointInPoly(P[0], Q)) return { d: 0, a: P[0], b: P[0] };
  if (pointInPoly(Q[0], P)) return { d: 0, a: Q[0], b: Q[0] };
  let best: Gap = { d: Infinity, a: P[0], b: Q[0] };
  const test = (pts: Poly, other: Poly, swap: boolean) => {
    for (const p of pts)
      for (let j = 0; j < other.length; j++) {
        const q = closestOnSeg(p, other[j], other[(j + 1) % other.length]);
        const d = dist(p, q);
        if (d < best.d) best = swap ? { d, a: q, b: p } : { d, a: p, b: q };
      }
  };
  test(P, Q, false);
  test(Q, P, true);
  return best;
}

/** Gap between a point and a polygon (0 if inside). */
export function pointGap(p: Pt, poly: Poly): Gap {
  if (pointInPoly(p, poly)) return { d: 0, a: p, b: p };
  let best: Gap = { d: Infinity, a: p, b: p };
  for (let j = 0; j < poly.length; j++) {
    const q = closestOnSeg(p, poly[j], poly[(j + 1) % poly.length]);
    const d = dist(p, q);
    if (d < best.d) best = { d, a: p, b: q };
  }
  return best;
}

export function bbox(poly: Poly) {
  const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** Largest distance between two vertices: the "widest point" of a convex footprint. */
export function widest(poly: Poly): number {
  let m = 0;
  for (const a of poly) for (const b of poly) m = Math.max(m, dist(a, b));
  return m;
}

export function area(poly: Poly): number {
  let s = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  return Math.abs(s / 2);
}

export function centroid(poly: Poly): Pt {
  return { x: poly.reduce((s, p) => s + p.x, 0) / poly.length, y: poly.reduce((s, p) => s + p.y, 0) / poly.length };
}

/** Does the segment ab cross or touch the polygon? */
export function segHitsPoly(a: Pt, b: Pt, poly: Poly): boolean {
  if (pointInPoly(a, poly) || pointInPoly(b, poly)) return true;
  for (let j = 0; j < poly.length; j++) if (segsIntersect(a, b, poly[j], poly[(j + 1) % poly.length])) return true;
  return false;
}
