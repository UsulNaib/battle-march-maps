// Short summary, in our own words, of only the rules that apply to the generated map. Links go to the online rules index.
import { MapResult } from "./generate";
import { isObstacle } from "./rules";
import { t } from "./i18n";

const IDX = "https://tow.whfb.app";
const link = (path: string, text: string) => `<a href="${IDX}${path}" target="_blank" rel="noopener">${text}</a>`;
export function rulesSummaryHtml(r: MapResult): string {
  const kinds = new Set(r.features.map((f) => f.kind));
  const obsKinds = [...kinds].filter(isObstacle);
  const obsNames = obsKinds.map((k, i) => (i ? t("k_" + k).toLowerCase() : t("k_" + k)) + (obsKinds.length > 1 ? "s" : "")).join(" and ");
  const natural = ["wood", "rocky", "marsh"].filter((k) => kinds.has(k as never));
  const troves = r.objectives.filter((o) => o.kind === "trove").length;
  const landmark = r.objectives.some((o) => o.kind === "landmark");
  const sec: string[] = [];

  sec.push(`<h3>Deployment: ${t("m_" + r.map.id)}</h3><ul>
    <li>The players choose their deployment zones, a roll-off decides who deploys the first unit, and then they deploy one unit at a time, alternating.</li>
    <li>${link("/battle-march/battle-march-deployment-maps", "Deployment maps")} · ${link("/battle-march/first-turn-battle-march", "First turn")}</li></ul>`);

  if (obsKinds.length)
    sec.push(`<h3>Terrain</h3><ul>
      <li>${obsNames} ${obsKinds.length > 1 ? "are" : "is a"} low linear obstacle${obsKinds.length > 1 ? "s" : ""}.</li>
      <li>${link("/battlefield-terrain/categories-of-terrain", "Terrain categories")}</li></ul>`);
  else
    sec.push(`<h3>Terrain</h3><ul><li>${link("/battlefield-terrain/categories-of-terrain", "Terrain categories")}</li></ul>`);

  if (natural.length)
    sec.push(`<h3>Wilderness terrain (optional)</h3><ul>
      <li>The first time a unit is deployed in, or ends its move in, a natural feature (${natural.map((k) => t("k_" + k).toLowerCase()).join(", ")} on this map), roll a D6 to find out what it is: briar patch, defensive position, toxic spores, lingering magic, healing herbs or a troll's lair.</li>
      <li>${link("/battle-march/wilderness-terrain", "Wilderness terrain table")}</li></ul>`);

  if (troves)
    sec.push(`<h3>Treasure troves</h3><ul>
      <li>${link("/battle-march/treasure-troves", "Treasure troves")} · ${link("/battle-march/controlling-objectives", "Controlling objectives")}</li></ul>`);
  if (landmark)
    sec.push(`<h3>Strategic landmark</h3><ul>
      <li>Impassable, and no line of sight can be drawn over it.</li>
      <li>A unit that controls it at the end of either player's turn gains a property until the end of the next turn (D6): 1–2 Magic Resistance (−2), 3–4 Frenzy, 5–6 Stubborn.</li>
      <li>${link("/battle-march/landmarks", "Landmarks")} · ${link("/battle-march/controlling-objectives", "Controlling objectives")}</li></ul>`);

  sec.push(`<h3>The game</h3><ul>
    <li>${link("/battle-march/game-length-battle-march", "Game length")} · ${link("/battle-march/victory-points-battle-march", "Victory points")}</li></ul>`);

  return `<section class="card rules"><h2>Rules for this map</h2>
    <p class="small">Only the rules you still need while playing on this map; set-up rules (zones, terrain placement, objective placement) are already applied above. Links open the online rules index.</p>
    <div class="rulegrid">${sec.map((s) => `<div>${s}</div>`).join("")}</div></section>`;
}
