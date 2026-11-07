// Short summary, in our own words, of only the rules that apply to the generated map. Links go to the online rules index.
import { MapResult } from "./generate";
import { Kind, isObstacle } from "./rules";
import { t } from "./i18n";

const IDX = "https://tow.whfb.app";
const link = (path: string, text: string) => `<a href="${IDX}${path}" target="_blank" rel="noopener">${text}</a>`;
type Cat = "difficult" | "dangerous" | "impassable";

const CAT_RULES: Record<Cat, { title: string; path: string; items: string[] }> = {
  difficult: {
    title: "Difficult terrain", path: "/battlefield-terrain/difficult-terrain",
    items: [
      "A unit with any part moving through it (starting, crossing or ending its move) has −1 Movement, to a minimum of 1.",
      "Charging through it: roll 2D6 as usual, but discard the highest die instead of the lowest.",
      "If 25% or more of a unit's models are in it when the unit ends a move or a Combat phase begins, the unit is Disrupted and loses its Rank Bonus.",
    ],
  },
  dangerous: {
    title: "Dangerous terrain", path: "/battlefield-terrain/dangerous-terrain",
    items: [
      "Slows movement and counts for combat exactly like difficult terrain.",
      "Every model that starts, crosses or ends its move in it takes a Dangerous Terrain test: on a roll of 1 on a D6 it loses a Wound. Each separate dangerous feature crossed in one move needs its own test.",
    ],
  },
  impassable: {
    title: "Impassable terrain", path: "/battlefield-terrain/impassable-terrain",
    items: [
      "No unit may move into or through it; units must go around.",
      "If it stops a charging unit from lining up with its target, the charge is disordered.",
    ],
  },
};

const GARRISON = [
  "One infantry unit of Unit Strength 20 or less can garrison it. It counts as in full cover, sees all round, cannot charge, and up to half its models can shoot or cast.",
  "Templates hit the garrison only on a 5+; a cannon hit becomes D3 Strength 4, AP −1 hits and the ball stops.",
  "In combat both sides fight as skirmishers with at most five models each; the garrison never gives ground or falls back, and is destroyed if it breaks. The winner may move in.",
];
type Block = { cats: Cat[]; tag: string; items: string[]; links: [string, string][] };

/** Rules for one terrain type, according to what the players agreed in the settings. */
function kindRules(k: Kind, R: MapResult["terrainRules"]): Block {
  const catOf = (v: string): Cat[] => (v === "difficult" || v === "dangerous" || v === "impassable" ? [v] : v === "occupiable" ? [] : []);
  switch (k) {
    case "hill":
      return { cats: [], tag: "", items: [
        "Counts as open ground for movement.",
        "A unit fighting from the high ground gains an advantage in combat.",
        "Vantage point: a unit on the hill shoots with one extra rank, and a unit entirely on it can see over models that are not on a hill. In turn, units not on a hill can see it over other models.",
        "Beyond the crest: the hill blocks line of sight between two models that are both off it.",
      ], links: [["/battlefield-terrain/hills", "Hills"], ["/battlefield-terrain/vantage-point", "Vantage point"], ["/battlefield-terrain/beyond-the-crest", "Beyond the crest"]] };
    case "wood": {
      const v = R.wood;
      const items = [`Agreed as ${v} terrain.`, "Arboreal gloom: the wood blocks line of sight between two models that are both outside it."];
      if (v !== "impassable") items.push("Woodland boundary: a unit with more than half its models inside the wood's edge counts as being in partial cover, wherever the trees stand. Trees may be moved aside to fit models.");
      return { cats: catOf(v), tag: v, items, links: [["/battlefield-terrain/woods", "Woods"], ["/battlefield-terrain/arboreal-gloom", "Arboreal gloom"], ["/battlefield-terrain/woodland-boundaries", "Woodland boundaries"]] };
    }
    case "building":
      return R.building === "occupiable"
        ? { cats: [], tag: "occupiable", items: ["Agreed as occupiable (it is at least 4″ across); otherwise no unit can enter it.", ...GARRISON], links: [["/battlefield-terrain/buildings", "Buildings"]] }
        : { cats: ["impassable"], tag: "impassable", items: ["Agreed as impassable: no unit can enter it."], links: [["/battlefield-terrain/buildings", "Buildings"]] };
    case "ruins":
      if (R.ruins === "occupiable") return { cats: [], tag: "occupiable", items: ["Agreed to work like an occupiable building; otherwise no unit can enter.", ...GARRISON], links: [["/battlefield-terrain/buildings", "Buildings"]] };
      if (R.ruins === "impassable") return { cats: ["impassable"], tag: "impassable", items: ["Agreed as impassable, like a building."], links: [["/battlefield-terrain/buildings", "Buildings"]] };
      return { cats: ["difficult"], tag: "difficult", items: ["Agreed as difficult terrain (loose rubble)."], links: [["/battlefield-terrain/difficult-terrain", "Difficult terrain"]] };
    case "marsh":
      return { cats: catOf(R.marsh), tag: R.marsh, items: [R.marsh === "dangerous" ? "Agreed as a deep swamp: dangerous terrain." : "Agreed as shallow, muddy ground: difficult terrain."], links: [] };
    case "rocky":
      return { cats: catOf(R.rocky), tag: R.rocky, items: [R.rocky === "dangerous" ? "Agreed as extremely rocky ground: dangerous terrain." : "Difficult terrain."], links: [] };
    default:
      return { cats: ["difficult"], tag: "", items: [
        "A low linear obstacle (under 2″ high). Crossing it counts as moving through difficult terrain.",
        "A unit in combat that straddles it is Disrupted and loses its Rank Bonus.",
        "Defending it: a unit with its front rank against the obstacle makes charging enemies stop on the far side; their charge is disordered unless they can Fly.",
      ], links: [["/battlefield-terrain/low-linear-obstacles", "Low linear obstacles"], ["/battlefield-terrain/defended-low-linear-obstacles", "Defended obstacles"]] };
  }
}

/** Short tag shown next to a terrain name, e.g. "dangerous". */
export const terrainTag = (k: Kind, R: MapResult["terrainRules"]) => kindRules(k, R).tag;

export function rulesSummaryHtml(r: MapResult): string {
  const kinds = new Set(r.features.map((f) => f.kind));
  // natural features a unit can actually enter (an impassable wood never triggers the wilderness table)
  const natural = ["wood", "rocky", "marsh"].filter((k) => kinds.has(k as never) && !(k === "wood" && r.terrainRules.wood === "impassable"));
  const troves = r.objectives.filter((o) => o.kind === "trove").length;
  const landmark = r.objectives.some((o) => o.kind === "landmark");
  const sec: string[] = [];

  sec.push(`<h3>Deployment: ${t("m_" + r.map.id)}</h3><ul>
    <li>The players choose their deployment zones, a roll-off decides who deploys the first unit, and then they deploy one unit at a time, alternating.</li>
    <li>${link("/battle-march/battle-march-deployment-maps", "Deployment maps")} · ${link("/battle-march/first-turn-battle-march", "First turn")}</li></ul>`);

  // One block per terrain type on this map, as agreed in the settings, then the category rules they refer to.
  const order: Kind[] = ["hill", "wood", "building", "ruins", "marsh", "rocky", "wall", "hedge", "fence"];
  const present = order.filter((k) => kinds.has(k));
  const cats = new Set<Cat>();
  const obstacles = present.filter(isObstacle);
  const rolled = (k: string) => (r.rolledRules.includes(k) ? " (rolled)" : "");
  for (const k of present) {
    if (isObstacle(k) && k !== obstacles[0]) continue;
    const kr = kindRules(k, r.terrainRules);
    kr.cats.forEach((c) => cats.add(c));
    const title = isObstacle(k) ? obstacles.map((o) => t("k_" + o)).join(", ") : t("k_" + k) + (kr.tag ? ` – ${kr.tag}${rolled(k)}` : "");
    const links = kr.links.length ? `<li>${kr.links.map(([p, x]) => link(p, x)).join(" · ")}</li>` : "";
    sec.push(`<h3>${title}</h3><ul>${kr.items.map((i) => `<li>${i}</li>`).join("")}${links}</ul>`);
  }
  for (const c of ["difficult", "dangerous", "impassable"] as Cat[])
    if (cats.has(c)) sec.push(`<h3>${CAT_RULES[c].title}</h3><ul>${CAT_RULES[c].items.map((i) => `<li>${i}</li>`).join("")}<li>${link(CAT_RULES[c].path, "Rules index")}</li></ul>`);

  if (natural.length && r.terrainRules.wilderness === "on")
    sec.push(`<h3>Wilderness terrain${rolled("wilderness")}</h3><ul>
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
    <p class="small">Only the rules you still need while playing on this map, including every terrain type on it; set-up rules (zones, terrain placement, objective placement) are already applied above. Links open the online rules index.</p>
    <div class="rulegrid">${sec.map((s) => `<div>${s}</div>`).join("")}</div></section>`;
}
