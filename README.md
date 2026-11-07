# Battle March Map Generator

Random, rules-checked battlefields for **Warhammer: The Old World – Battle March**.

Every map is drawn in 2D with a 1″ grid, rulers, deployment zones, the 12″ no-terrain ring around the centre,
objectives with their 3″ keep-out ring, and distance markers (to the edges, between pieces, to the centre).
A placement table tells you where to put each piece on your table, and every rule is checked and listed.

## How a map is made

1. Board (30×44″ or 36×48″), deployment map (D6 or chosen, mirrored or not) and objectives (D6 or chosen).
2. Each terrain type has its own size: 8×8″, 8×6″ or random. Obstacles are 1×8″; any angle or 0°/90° only.
3. Hundreds of legal layouts are generated from the seed; the most interesting one is kept. The score rewards
   fair cover for both sides, open deployment zones, a mix of open and blocked firing lanes, spread, no gaps
   under 2″ and a variety of terrain types.
4. Objectives are placed after terrain, at least 3″ from it.

The same seed and settings always give the same map; the link in the address bar contains both.

## Rules checked

| Rule | Value |
|---|---|
| Number of features | one per 12″ of the longest edge, rounded up (4 on both board sizes) |
| Size | at least 2″, at most 12″ at the widest point |
| Centre | no terrain within 12″ of the centre |
| Spacing (Matched Play Guide) | not within 3″ of another terrain feature |
| Spacing (rulebook) | not within 12″ of a feature placed by the opponent (pieces alternate A/B) |
| Treasure troves / landmark | 40 mm / 100 mm bases, not within 3″ of terrain; landmark in the centre |

All distances are measured edge to edge on the real footprint of each piece.

## Deployment maps

| Map | Geometry on 30×44″ | 36×48″ |
|---|---|---|
| Pitched Battle | long-edge zones, 7.5″ either side of the centre line | same rule |
| Close Encounter | opposite quarters, minus a 15″ circle around the centre | same rule |
| Opposed Flanks | triangles along the long edges, 12″ deep at one end; band of 18″ between them | 18″ band kept (extrapolated) |
| Meeting Engagement | long-edge zones 7.5″ from the centre line, each leaving 11″ free at one short edge | same values (extrapolated) |
| Mountain Pass | short-edge zones, 11″ either side of the centre line | same rule |
| Outflank | corner triangles; band of 22″ between them | 22″ band kept (extrapolated) |

**Not yet entered:** the official treasure-trove maps (General's Companion p. 24). Until then troves are placed
point-symmetrically in no-man's land and the page says so.

## Develop

```bash
npm install
npm run dev      # local server
npm test         # generates maps for every board, map, spacing rule and objective and checks every rule
npm run build    # static site in dist/
```

Pushing to `main` runs the tests and deploys to GitHub Pages (`.github/workflows/deploy.yml`).
In the repository settings, set **Pages → Source** to **GitHub Actions** once.

Unofficial fan tool, not affiliated with Games Workshop. Only rule values are used; no rules text is reproduced.
