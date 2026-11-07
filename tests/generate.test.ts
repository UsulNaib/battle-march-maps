import { describe, it, expect } from "vitest";
import { generate, DEFAULT_SETTINGS, validate } from "../src/generate";
import { DEPLOY_MAPS, BOARDS } from "../src/rules";
import { rectPoly, polyGap } from "../src/geom";

describe("geometry", () => {
  it("measures edge-to-edge gaps", () => {
    const a = rectPoly(4, 4, 8, 8, 0), b = rectPoly(15, 4, 8, 8, 0);
    expect(polyGap(a, b).d).toBeCloseTo(3);
    expect(polyGap(a, rectPoly(6, 4, 8, 8, 30)).d).toBe(0);
  });
});

describe("generator", () => {
  for (const board of BOARDS)
    for (const map of DEPLOY_MAPS)
      for (const spacing of ["mpg", "rulebook"] as const)
        it(`${board.id} ${map.id} ${spacing}: every map passes all rule checks`, () => {
          for (let i = 0; i < 15; i++) {
            const r = generate({ ...DEFAULT_SETTINGS, seed: `t${i}`, board: board.id, map: map.id, spacing, candidates: 20 });
            const bad = r.checks.filter((c) => !c.ok);
            expect(bad).toEqual([]);
            expect(r.features.length).toBe(4);
            // re-validation of the returned map gives the same verdict
            expect(validate(r).every((c) => c.ok)).toBe(true);
          }
        });

  it("is reproducible from its seed", () => {
    const a = generate({ ...DEFAULT_SETTINGS, seed: "abc123", candidates: 30 });
    const b = generate({ ...DEFAULT_SETTINGS, seed: "abc123", candidates: 30 });
    expect(JSON.stringify(a.features)).toBe(JSON.stringify(b.features));
  });

  it("uses the requested sizes and 1×8 obstacles", () => {
    const r = generate({ ...DEFAULT_SETTINGS, seed: "sz", size: "8x6", obstacles: 2, candidates: 20 });
    for (const f of r.features) {
      if (["wall", "hedge", "fence"].includes(f.kind)) expect([f.w, f.h]).toEqual([8, 1]);
      else expect([f.w, f.h]).toEqual([8, 6]);
    }
    expect(r.features.filter((f) => ["wall", "hedge", "fence"].includes(f.kind)).length).toBe(2);
  });
});

describe("objectives", () => {
  for (const objectives of ["troves2", "troves3", "landmark", "none"] as const)
    it(`${objectives}: placed and at least 3" from terrain`, () => {
      for (const board of BOARDS)
        for (const map of DEPLOY_MAPS) {
          const r = generate({ ...DEFAULT_SETTINGS, seed: "o" + map.id, board: board.id, map: map.id, objectives, candidates: 15 });
          expect(r.checks.filter((c) => !c.ok)).toEqual([]);
          expect(r.objectives.length).toBe({ troves2: 2, troves3: 3, landmark: 1, none: 0 }[objectives]);
        }
    });
});
