// Short summary, in our own words, of only the rules that apply to the generated map. Links go to the online rules index.
import { MapResult } from "./generate";
import { RULES, isObstacle, defaultFeatureCount } from "./rules";
import { t } from "./i18n";

const IDX = "https://tow.whfb.app";
const link = (path: string, text: string) => `<a href="${IDX}${path}" target="_blank" rel="noopener">${text}</a>`;
const n1 = (x: number) => (Math.round(x * 10) / 10).toString();

function zoneText(r: MapResult): string {
  const { w: W, h: H } = r.board;
  const m = r.mirrored;
  switch (r.map.id) {
    case "pitched":
      return `Zones run along the long edges, ${n1(H / 2 - 7.5)}″ deep each: no closer than 7.5″ to the centre line, so 15″ separates the armies.`;
    case "close":
      return `Zones are two opposite quarters of the table (Side A ${m ? "top right" : "top left"}, Side B ${m ? "bottom left" : "bottom right"}), each without the part inside a 15″-diameter circle around the centre.`;
    case "opposed":
      return `Zones are triangles along the long edges, ${n1(H - 18)}″ deep at one short edge and tapering to a point at the other (Side A deepest on the ${m ? "right" : "left"}). A slanted band 18″ deep separates the armies.`;
    case "meeting":
      return `Zones run along the long edges, ${n1(H / 2 - 7.5)}″ deep (7.5″ from the centre line), and each stops 11″ short of one short edge (Side A leaves the ${m ? "left" : "right"} 11″ free, Side B the ${m ? "right" : "left"} 11″).`;
    case "pass":
      return `Zones run along the short edges, ${n1(W / 2 - 11)}″ deep each: no closer than 11″ to the centre line, so 22″ separates the armies.`;
    case "outflank":
      return `Zones are corner triangles, each covering a whole short edge (Side A on the ${m ? "right" : "left"}). A slanted band 22″ wide separates the armies.`;
  }
  return "";
}

export function rulesSummaryHtml(r: MapResult): string {
  const { w: W, h: H } = r.board;
  const kinds = new Set(r.features.map((f) => f.kind));
  const hasObstacle = r.features.some((f) => isObstacle(f.kind));
  const obsKinds = [...kinds].filter(isObstacle);
  const obsNames = obsKinds.map((k, i) => (i ? t("k_" + k).toLowerCase() : t("k_" + k)) + (obsKinds.length > 1 ? "s" : "")).join(" and ");
  const natural = ["wood", "rocky", "marsh"].filter((k) => kinds.has(k as never));
  const troves = r.objectives.filter((o) => o.kind === "trove").length;
  const landmark = r.objectives.some((o) => o.kind === "landmark");
  const sec: string[] = [];

  sec.push(`<h3>Battlefield</h3><ul>
    <li>${H}×${W}″. Battle March is played on boards from 30×44″ to 36×48″; the larger size suits armies above about 600 points.</li>
    <li>${link("/battle-march/general-principles-battle-march", "General principles")} · ${link("/battle-march/game-length-battle-march", "Game length")} · ${link("/battle-march/victory-points-battle-march", "Victory points")}</li></ul>`);

  sec.push(`<h3>Deployment: ${t("m_" + r.map.id)}${r.mirrored ? " (mirrored)" : ""}</h3><ul>
    <li>${zoneText(r)}</li>
    <li>Once the map is set, the zones are chosen, a roll-off decides who deploys the first unit, and the players then deploy one unit at a time, alternating.</li>
    ${r.map.mirrorable ? `<li>This map may be mirrored; roll a D6 if the players cannot agree.</li>` : ""}
    <li>${link("/battle-march/battle-march-deployment-maps", "Deployment maps")}</li></ul>`);

  const spacing = r.settings.spacing === "mpg"
    ? `No feature within ${RULES.mpgSpacing}″ of another feature (Matched Play Guide).`
    : `No feature within ${RULES.rulebookOpponentSpacing}″ of a feature the opponent placed (rulebook).`;
  sec.push(`<h3>Terrain</h3><ul>
    <li>This map uses ${r.features.length} feature${r.features.length === 1 ? "" : "s"}; the guideline is one per 12″ of the longest edge (${defaultFeatureCount(r.board)} here).</li>
    <li>Every feature is between ${RULES.minWidest}″ and ${RULES.maxWidest}″ at its widest point; nothing is within ${RULES.centreExclusion}″ of the centre. ${spacing}</li>
    <li>When players set terrain up themselves instead of using this map, one player places all of it and the other then scatters ${r.settings.spacing === "mpg" ? "D3+1" : "D3"} features 2D6″ with the scatter dice (a feature stops when it touches another feature or the table edge).</li>
    ${hasObstacle ? `<li>${obsNames} ${obsKinds.length > 1 ? "are" : "is a"} low linear obstacle${obsKinds.length > 1 ? "s" : ""}; objectives may not straddle ${obsKinds.length > 1 ? "them" : "it"}.</li>` : ""}
    <li>${link("/battlefield-terrain/categories-of-terrain", "Terrain categories")} · ${link("/battlefield-terrain/placing-terrain-battlefield-terrain", "Placing terrain")} · ${link("/battlefield-terrain/scattered-terrain-placement", "Scattered terrain")}</li></ul>`);

  if (natural.length)
    sec.push(`<h3>Wilderness terrain (optional)</h3><ul>
      <li>The first time a unit is deployed in, or ends its move in, a natural feature (${natural.map((k) => t("k_" + k).toLowerCase()).join(", ")} on this map), roll a D6 to find out what it is: briar patch, defensive position, toxic spores, lingering magic, healing herbs or a troll's lair.</li>
      <li>${link("/battle-march/wilderness-terrain", "Wilderness terrain table")}</li></ul>`);

  if (r.objectiveRoll || r.objectives.length) {
    const head = r.objectiveRoll ? `Objectives (rolled ${r.objectiveRoll})` : "Objectives";
    const items: string[] = [];
    if (r.objectiveRoll) items.push("Roll a D6 after terrain and before deployment: 1–2 two treasure troves, 3–4 three treasure troves, 5–6 one strategic landmark.");
    if (troves) items.push(`${troves} treasure troves, each on a 40 mm round base, at least ${RULES.objectiveClearance}″ from any terrain${hasObstacle ? " and never across an obstacle" : ""}. If one does not fit, move terrain the smallest distance needed.`,
      `${link("/battle-march/treasure-troves", "Treasure troves")} · ${link("/battle-march/controlling-objectives", "Controlling objectives")}`);
    if (landmark) items.push(`One strategic landmark on a 100 mm round base in the centre, at least ${RULES.objectiveClearance}″ from terrain. It is impassable and blocks line of sight.`,
      "A unit that controls it at the end of either player's turn gains a property until the end of the next turn (D6): 1–2 Magic Resistance (−2), 3–4 Frenzy, 5–6 Stubborn.",
      `${link("/battle-march/landmarks", "Landmarks")} · ${link("/battle-march/controlling-objectives", "Controlling objectives")}`);
    if (!troves && !landmark) items.push("No objectives on this map.");
    sec.push(`<h3>${head}</h3><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
  }

  return `<section class="card rules"><h2>Rules for this map</h2>
    <p class="small">A short summary of only the rules this map uses. The rulebook, the Matched Play Guide and Battle March: General's Companion are the authority; links open the online rules index.</p>
    <div class="rulegrid">${sec.map((s) => `<div>${s}</div>`).join("")}</div></section>`;
}
