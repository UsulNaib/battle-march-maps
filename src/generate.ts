import { Poly, Pt, rectPoly, polyGap, pointGap, bbox, widest, area, centroid, pointInPoly, segHitsPoly, circlePoly } from "./geom";
import { makeRng, Rng, d6, pick, shuffle } from "./rng";
import {
  BOARDS, Board, DEPLOY_MAPS, DeployMap, Zone, RULES, Kind, AREA_KINDS, OBSTACLE_KINDS, OBSTACLE_SIZE,
  isObstacle, BLOCKS_LOS, SizeMode, ObjectiveMode, objectiveFromRoll, defaultFeatureCount,
} from "./rules";

export type Settings = {
  seed: string;
  board: string; // "30x44" | "36x48"
  map: string; // deployment map id or "random"
  mirror: "random" | "yes" | "no";
  objectives: ObjectiveMode;
  size: SizeMode; // default for types without their own size
  sizes: Partial<Record<Kind, SizeMode>>; // size per terrain type
  rotation: "free" | "square";
  spacing: "mpg" | "rulebook";
  count: number; // 0 = rule default (one per 12" of the longest edge)
  obstacles: number; // how many of the features are 1×8" obstacles
  kinds: Kind[];
  candidates: number; // how many valid maps are generated before the best one is kept
};

export const DEFAULT_SETTINGS: Settings = {
  seed: "", board: "30x44", map: "random", mirror: "random", objectives: "roll", size: "8x8", sizes: { wood: "8x6" },
  rotation: "free", spacing: "mpg", count: 0, obstacles: 1,
  kinds: ["hill", "wood", "building", "ruins", "marsh", "rocky", "wall", "hedge", "fence"], candidates: 250,
};

export type Feature = { n: number; kind: Kind; w: number; h: number; cx: number; cy: number; rot: number; owner: "A" | "B"; poly: Poly };
export type Objective = { kind: "trove" | "landmark"; x: number; y: number; r: number };
export type Check = { key: string; params: Record<string, string | number>; ok: boolean; info?: boolean };
export type ScorePart = { key: string; value: number; weight: number };
export type MapResult = {
  settings: Settings;
  board: Board;
  map: DeployMap;
  mirrored: boolean;
  objectiveRoll: number | null;
  objectiveMode: Exclude<ObjectiveMode, "roll">;
  zones: Zone[];
  features: Feature[];
  objectives: Objective[];
  checks: Check[];
  score: number;
  scoreParts: ScorePart[];
  tried: number;
  valid: number;
};

const f1 = (x: number) => Math.round(x * 10) / 10;

// ---------- objectives ----------
/** Treasure troves: point-symmetric pairs in no-man's land (official trove maps not yet entered), plus the centre for three. */
function placeObjectives(rng: Rng, b: Board, zones: Zone[], mode: MapResult["objectiveMode"], features: Feature[]): Objective[] | null {
  const cx = b.w / 2, cy = b.h / 2;
  if (mode === "none") return [];
  if (mode === "landmark") return [{ kind: "landmark", x: cx, y: cy, r: RULES.landmarkDiameter / 2 }];
  const r = RULES.troveDiameter / 2;
  const out: Objective[] = [];
  if (mode === "troves3") out.push({ kind: "trove", x: cx, y: cy, r });
  for (let t = 0; t < 2000; t++) {
    const p = { x: 3 + rng() * (b.w - 6), y: 3 + rng() * (b.h - 6) };
    const q = { x: b.w - p.x, y: b.h - p.y };
    if (Math.hypot(p.x - q.x, p.y - q.y) < 16) continue;
    if (zones.some((z) => pointGap(p, z.poly).d < 3 + r)) continue;
    if (mode === "troves3" && Math.hypot(p.x - cx, p.y - cy) < 10) continue;
    const clear = (pt: Pt) => features.every((f) => pointGap(pt, f.poly).d >= RULES.objectiveClearance + r);
    if (!clear(p) || !clear(q)) continue;
    out.push({ kind: "trove", x: p.x, y: p.y, r }, { kind: "trove", x: q.x, y: q.y, r });
    return out;
  }
  return null;
}

// ---------- terrain ----------
function sizeFor(rng: Rng, kind: Kind, mode: SizeMode): { w: number; h: number } {
  if (isObstacle(kind)) return { ...OBSTACLE_SIZE };
  const deep = mode === "8x8" ? 8 : mode === "8x6" ? 6 : rng() < 0.5 ? 8 : 6;
  return { w: 8, h: deep };
}

function kindsFor(rng: Rng, s: Settings, n: number): Kind[] {
  const areaKinds = s.kinds.filter((k) => AREA_KINDS.includes(k));
  const obsKinds = s.kinds.filter((k) => OBSTACLE_KINDS.includes(k));
  const nObs = obsKinds.length ? Math.min(s.obstacles, n) : 0;
  const out: Kind[] = [];
  let pool: Kind[] = [];
  for (let i = 0; i < n - nObs; i++) {
    if (!pool.length) pool = shuffle(rng, areaKinds.length ? areaKinds : AREA_KINDS);
    out.push(pool.pop()!);
  }
  for (let i = 0; i < nObs; i++) out.push(pick(rng, obsKinds));
  return shuffle(rng, out);
}

function spacingNeeded(s: Settings, a: Feature, b: Feature): number {
  if (s.spacing === "mpg") return RULES.mpgSpacing;
  return a.owner !== b.owner ? RULES.rulebookOpponentSpacing : 0.5;
}

function fits(s: Settings, b: Board, f: Feature, placed: Feature[], objectives: Objective[]): boolean {
  const bb = bbox(f.poly);
  if (bb.x0 < 0 || bb.y0 < 0 || bb.x1 > b.w || bb.y1 > b.h) return false;
  if (pointGap({ x: b.w / 2, y: b.h / 2 }, f.poly).d < RULES.centreExclusion) return false;
  for (const o of objectives) if (pointGap({ x: o.x, y: o.y }, f.poly).d < RULES.objectiveClearance + o.r) return false;
  for (const p of placed) if (polyGap(p.poly, f.poly).d < spacingNeeded(s, p, f)) return false;
  return true;
}

function placeTerrain(rng: Rng, s: Settings, b: Board, kinds: Kind[], objectives: Objective[]): Feature[] | null {
  const placed: Feature[] = [];
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i];
    const { w, h } = sizeFor(rng, kind, s.sizes[kind] || s.size);
    let ok = false;
    for (let t = 0; t < 250 && !ok; t++) {
      const rot = s.rotation === "free" ? Math.round(rng() * 180) : rng() < 0.5 ? 0 : 90;
      const cx = rng() * b.w, cy = rng() * b.h;
      const f: Feature = { n: i + 1, kind, w, h, cx, cy, rot, owner: i % 2 ? "B" : "A", poly: rectPoly(cx, cy, w, h, rot) };
      if (fits(s, b, f, placed, objectives)) { placed.push(f); ok = true; }
    }
    if (!ok) return null;
  }
  return placed;
}

// ---------- scoring: what makes a map interesting to play ----------
function sampleCover(poly: Poly, features: Feature[], step = 1): number {
  const bb = bbox(poly);
  let inside = 0, covered = 0;
  for (let x = bb.x0 + step / 2; x < bb.x1; x += step)
    for (let y = bb.y0 + step / 2; y < bb.y1; y += step) {
      const p = { x, y };
      if (!pointInPoly(p, poly)) continue;
      inside++;
      if (features.some((f) => !isObstacle(f.kind) && pointInPoly(p, f.poly))) covered++;
    }
  return inside ? covered / inside : 0;
}

export function scoreMap(b: Board, map: DeployMap, zones: Zone[], features: Feature[]): ScorePart[] {
  const parts: ScorePart[] = [];
  const [A, B] = zones;
  // 1. Fairness: terrain each side can reach quickly (within 12" of its deployment zone), weighted by how much it blocks sight.
  const reach = (z: Zone) => features.reduce((s, f) => {
    const d = polyGap(z.poly, f.poly).d;
    return d <= 12 ? s + (0.5 + BLOCKS_LOS[f.kind]) * area(f.poly) * (1 - d / 24) : s;
  }, 0);
  const ra = reach(A), rb = reach(B);
  parts.push({ key: "fair", value: ra + rb > 0 ? 1 - Math.abs(ra - rb) / (ra + rb) : 0.5, weight: 30 });
  // 2. Deployment zones stay usable: at most ~20% covered, and equally covered.
  const ca = sampleCover(A.poly, features), cb = sampleCover(B.poly, features);
  const usable = Math.max(0, 1 - Math.max(0, Math.max(ca, cb) - 0.2) * 4) * (1 - Math.min(1, Math.abs(ca - cb) * 4));
  parts.push({ key: "zones", value: usable, weight: 15 });
  // 3. Lines of fire: some lanes across the table are open, some are blocked (ideal: 30–55% blocked).
  const lanes: number[] = [];
  const N = 24;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const a: Pt = map.axis === "y" ? { x: t * b.w, y: 0 } : { x: 0, y: t * b.h };
    const c: Pt = map.axis === "y" ? { x: t * b.w, y: b.h } : { x: b.w, y: t * b.h };
    lanes.push(Math.min(1, features.reduce((s, f) => (segHitsPoly(a, c, f.poly) ? s + BLOCKS_LOS[f.kind] : s), 0)));
  }
  const blocked = lanes.reduce((s, v) => s + v, 0) / N;
  parts.push({ key: "lanes", value: blocked < 0.3 ? blocked / 0.3 : blocked > 0.55 ? Math.max(0, 1 - (blocked - 0.55) * 3) : 1, weight: 20 });
  // 4. Spread: features in different quarters of the table, not clumped.
  const quarters = new Set(features.map((f) => (f.cx < b.w / 2 ? 0 : 1) + (f.cy < b.h / 2 ? 0 : 2)));
  parts.push({ key: "spread", value: quarters.size / Math.min(4, features.length), weight: 15 });
  // 5. No awkward gaps: gaps under 2" (to an edge or between pieces) are too narrow to move a unit through.
  let awkward = 0;
  for (const f of features) {
    const bb = bbox(f.poly);
    for (const g of [bb.x0, bb.y0, b.w - bb.x1, b.h - bb.y1]) if (g > 0.05 && g < 2) awkward++;
    for (const o of features) if (o.n > f.n) { const d = polyGap(f.poly, o.poly).d; if (d > 0.05 && d < 2) awkward++; }
  }
  parts.push({ key: "gaps", value: Math.max(0, 1 - awkward * 0.25), weight: 10 });
  // 6. Variety of terrain types.
  parts.push({ key: "variety", value: new Set(features.map((f) => f.kind)).size / features.length, weight: 10 });
  return parts;
}

// ---------- validation ----------
export function validate(r: Pick<MapResult, "board" | "features" | "objectives" | "settings">): Check[] {
  const { board: b, features: F, objectives: O, settings: s } = r;
  const checks: Check[] = [];
  const centre = { x: b.w / 2, y: b.h / 2 };
  const expected = defaultFeatureCount(b);
  checks.push({ key: "count", params: { n: F.length, expected }, ok: true, info: F.length !== expected });
  for (const f of F) {
    const bb = bbox(f.poly);
    const on = bb.x0 >= -1e-6 && bb.y0 >= -1e-6 && bb.x1 <= b.w + 1e-6 && bb.y1 <= b.h + 1e-6;
    checks.push({ key: "onBoard", params: { n: f.n }, ok: on });
    const wd = widest(f.poly);
    checks.push({ key: "size", params: { n: f.n, v: f1(wd), lo: RULES.minWidest, hi: RULES.maxWidest }, ok: wd >= RULES.minWidest && wd <= RULES.maxWidest + 1e-6 });
    const dc = pointGap(centre, f.poly).d;
    checks.push({ key: "centre", params: { n: f.n, v: f1(dc), min: RULES.centreExclusion }, ok: dc >= RULES.centreExclusion - 1e-6 });
  }
  for (let i = 0; i < F.length; i++)
    for (let j = i + 1; j < F.length; j++) {
      const a = F[i], c = F[j];
      const d = polyGap(a.poly, c.poly).d;
      const need = spacingNeeded(s, a, c);
      const key = s.spacing === "mpg" ? "spacingMpg" : a.owner !== c.owner ? "spacingOpp" : "overlap";
      checks.push({ key, params: { a: a.n, b: c.n, v: f1(d), min: need }, ok: d >= need - 1e-6 });
    }
  O.forEach((o, k) => {
    let min = Infinity;
    for (const f of F) min = Math.min(min, pointGap({ x: o.x, y: o.y }, f.poly).d - o.r);
    if (F.length) checks.push({ key: o.kind === "landmark" ? "landmark" : "trove", params: { n: k + 1, v: f1(min), min: RULES.objectiveClearance }, ok: min >= RULES.objectiveClearance - 1e-6 });
  });
  return checks;
}

// ---------- main entry ----------
export function resolveBoard(id: string): Board {
  return BOARDS.find((b) => b.id === id) || BOARDS[0];
}

export function generate(settings: Settings): MapResult {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const rng = makeRng(s.seed || "battle-march");
  const b = resolveBoard(s.board);
  const map = s.map === "random" ? DEPLOY_MAPS[d6(rng) - 1] : DEPLOY_MAPS.find((m) => m.id === s.map) || DEPLOY_MAPS[0];
  const mirrored = map.mirrorable && (s.mirror === "yes" || (s.mirror === "random" && rng() < 0.5));
  const zones = map.zones(b, mirrored);
  const objectiveRoll = s.objectives === "roll" ? d6(rng) : null;
  const objectiveMode = s.objectives === "roll" ? objectiveFromRoll(objectiveRoll!) : s.objectives;
  // The landmark sits in the centre; it is known before terrain is placed.
  const fixed: Objective[] = objectiveMode === "landmark" ? [{ kind: "landmark", x: b.w / 2, y: b.h / 2, r: RULES.landmarkDiameter / 2 }] : [];
  const n = s.count > 0 ? s.count : defaultFeatureCount(b);

  let best: { features: Feature[]; objectives: Objective[]; parts: ScorePart[]; score: number } | null = null;
  let tried = 0, valid = 0;
  const maxTries = s.candidates * 6;
  while (valid < s.candidates && tried < maxTries) {
    tried++;
    const kinds = kindsFor(rng, s, n);
    const features = placeTerrain(rng, s, b, kinds, fixed);
    if (!features) continue;
    // Objectives are placed after the terrain, at least 3" away from it.
    const objectives = objectiveMode === "landmark" ? fixed : placeObjectives(rng, b, zones, objectiveMode, features);
    if (!objectives) continue;
    valid++;
    const parts = scoreMap(b, map, zones, features);
    const score = parts.reduce((t, p) => t + p.value * p.weight, 0);
    if (!best || score > best.score) best = { features, objectives, parts, score };
  }
  const features = best ? best.features : [];
  const objectives = best ? best.objectives : fixed;
  const result: MapResult = {
    settings: s, board: b, map, mirrored, objectiveRoll, objectiveMode, zones, features, objectives,
    checks: [], score: best ? Math.round(best.score) : 0, scoreParts: best ? best.parts : [], tried, valid,
  };
  result.checks = validate(result);
  if (!best) result.checks.unshift({ key: "noLayout", params: { n }, ok: false });
  return result;
}

export { centroid, circlePoly };
