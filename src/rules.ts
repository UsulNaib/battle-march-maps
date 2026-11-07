// Rule data for Battle March battlefields. Numbers only; see README for the sources.
import { Poly, circlePoly } from "./geom";

export type Board = { id: string; w: number; h: number };
export const BOARDS: Board[] = [
  { id: "36x48", w: 48, h: 36 },
  { id: "30x44", w: 44, h: 30 },
];

export const RULES = {
  centreExclusion: 12, // no terrain within 12" of the centre of the battlefield
  maxWidest: 12, // no terrain wider than 12" at its widest point
  minWidest: 2, // under 2" it is decoration, not terrain
  mpgSpacing: 3, // Matched Play Guide: not within 3" of another terrain feature
  rulebookOpponentSpacing: 12, // rulebook: not within 12" of a feature placed by the opponent
  objectiveClearance: 3, // treasure troves / landmark: not within 3" of a terrain feature
  troveDiameter: 40 / 25.4, // 40 mm round base
  landmarkDiameter: 100 / 25.4, // 100 mm round base, impassable
  featuresPerInch: 1 / 12, // one terrain feature per 12" of the longest edge, rounded up
};

export const defaultFeatureCount = (b: Board) => Math.ceil(Math.max(b.w, b.h) / 12);

export type Zone = { side: "A" | "B"; poly: Poly };
export type DeployMap = {
  id: string;
  /** true when the 36×48" geometry is extrapolated from the 30×44" map */
  derivedOnLarge: boolean;
  mirrorable: boolean;
  /** axis along which the armies face each other */
  axis: "y" | "x";
  zones: (b: Board, mirrored: boolean) => Zone[];
};

const flipX = (b: Board, poly: Poly): Poly => poly.map((p) => ({ x: b.w - p.x, y: p.y })).reverse();
const rect = (x0: number, y0: number, x1: number, y1: number): Poly => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

export const DEPLOY_MAPS: DeployMap[] = [
  {
    // Zones along the long edges, 7.5" either side of the centre line.
    id: "pitched", derivedOnLarge: false, mirrorable: false, axis: "y",
    zones: (b) => [
      { side: "A", poly: rect(0, 0, b.w, b.h / 2 - 7.5) },
      { side: "B", poly: rect(0, b.h / 2 + 7.5, b.w, b.h) },
    ],
  },
  {
    // Opposite quarters with a 15" diameter circle around the centre left out.
    id: "close", derivedOnLarge: false, mirrorable: true, axis: "y",
    zones: (b, m) => {
      const cx = b.w / 2, cy = b.h / 2, r = 7.5, n = 16;
      const arc: Poly = [];
      for (let i = 0; i <= n; i++) {
        const t = -Math.PI / 2 - (Math.PI / 2) * (i / n); // from straight up to straight left
        arc.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
      }
      const tl: Poly = [{ x: 0, y: 0 }, { x: cx, y: 0 }, ...arc, { x: 0, y: cy }];
      const br: Poly = tl.map((p) => ({ x: b.w - p.x, y: b.h - p.y }));
      const A = m ? flipX(b, tl) : tl, B = m ? flipX(b, br) : br;
      return [{ side: "A", poly: A }, { side: "B", poly: B }];
    },
  },
  {
    // Triangles along the long edges; the no-man's land is a slanted band 18" deep.
    id: "opposed", derivedOnLarge: true, mirrorable: true, axis: "y",
    zones: (b, m) => {
      const d = b.h - 18;
      const A: Poly = [{ x: 0, y: 0 }, { x: b.w, y: 0 }, { x: 0, y: d }];
      const B: Poly = [{ x: 0, y: b.h }, { x: b.w, y: b.h - d }, { x: b.w, y: b.h }];
      return [{ side: "A", poly: m ? flipX(b, A) : A }, { side: "B", poly: m ? flipX(b, B) : B }];
    },
  },
  {
    // Long-edge zones 7.5" from the centre line, each leaving 11" free at one short edge.
    id: "meeting", derivedOnLarge: true, mirrorable: true, axis: "y",
    zones: (b, m) => {
      const A = rect(0, 0, b.w - 11, b.h / 2 - 7.5), B = rect(11, b.h / 2 + 7.5, b.w, b.h);
      return [{ side: "A", poly: m ? flipX(b, A) : A }, { side: "B", poly: m ? flipX(b, B) : B }];
    },
  },
  {
    // Short-edge zones 11" either side of the centre line.
    id: "pass", derivedOnLarge: false, mirrorable: false, axis: "x",
    zones: (b) => [
      { side: "A", poly: rect(0, 0, b.w / 2 - 11, b.h) },
      { side: "B", poly: rect(b.w / 2 + 11, 0, b.w, b.h) },
    ],
  },
  {
    // Corner triangles; the no-man's land is a slanted band 22" wide.
    id: "outflank", derivedOnLarge: true, mirrorable: true, axis: "x",
    zones: (b, m) => {
      const g = 22;
      const A: Poly = [{ x: 0, y: 0 }, { x: b.w - g, y: 0 }, { x: 0, y: b.h }];
      const B: Poly = [{ x: b.w, y: 0 }, { x: b.w, y: b.h }, { x: g, y: b.h }];
      return [{ side: "A", poly: m ? flipX(b, A) : A }, { side: "B", poly: m ? flipX(b, B) : B }];
    },
  },
];

export type Kind = "hill" | "wood" | "building" | "ruins" | "marsh" | "rocky" | "wall" | "hedge" | "fence";
export const AREA_KINDS: Kind[] = ["hill", "wood", "building", "ruins", "marsh", "rocky"];
export const OBSTACLE_KINDS: Kind[] = ["wall", "hedge", "fence"];
export const isObstacle = (k: Kind) => OBSTACLE_KINDS.includes(k);
/** Terrain that blocks or breaks line of sight across the table. */
export const BLOCKS_LOS: Record<Kind, number> = {
  hill: 0.6, wood: 1, building: 1, ruins: 0.8, marsh: 0, rocky: 0.2, wall: 0.3, hedge: 0.5, fence: 0.1,
};

export const OBSTACLE_SIZE = { w: 8, h: 1 };
export type SizeMode = "8x8" | "8x6" | "random";

/** Objective roll: 1-2 two treasure troves, 3-4 three treasure troves, 5-6 one strategic landmark. */
export type ObjectiveMode = "roll" | "none" | "troves2" | "troves3" | "landmark";
export const objectiveFromRoll = (r: number): Exclude<ObjectiveMode, "roll"> => (r <= 2 ? "troves2" : r <= 4 ? "troves3" : "landmark");

export const zoneCircle = (b: Board) => circlePoly(b.w / 2, b.h / 2, RULES.centreExclusion, 72);
