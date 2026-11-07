// Short summary, in our own words, of only the rules that apply to the generated map. Links go to the online rules index.
import { MapResult } from "./generate";
import { Kind } from "./rules";
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

const KIND_RULES: Record<Kind, { cats: Cat[]; items: string[]; links: [string, string][] }> = {
  hill: {
    cats: [],
    items: [
      "Counts as open ground for movement.",
      "A unit fighting from the high ground gains an advantage in combat.",
      "Vantage point: a unit on the hill shoots with one extra rank, and a unit entirely on it can see over models that are not on a hill. In turn, units not on a hill can see it over other models.",
      "Beyond the crest: the hill blocks line of sight between two models that are both off it.",
    ],
    links: [["/battlefield-terrain/hills", "Hills"], ["/battlefield-terrain/vantage-point", "Vantage point"], ["/battlefield-terrain/beyond-the-crest", "Beyond the crest"]],
  },
  wood: {
    cats: ["difficult"],
    items: [
      "Usually difficult terrain; agree before the game if this wood is so dense it should be dangerous or impassable.",
      "Arboreal gloom: a wood blocks line of sight between two models that are both outside it.",
      "Woodland boundary: a unit with more than half its models inside the wood's edge counts as being in partial cover, wherever the trees stand. Trees may be moved aside to fit models.",
    ],
    links: [["/battlefield-terrain/woods", "Woods"], ["/battlefield-terrain/arboreal-gloom", "Arboreal gloom"], ["/battlefield-terrain/woodland-boundaries", "Woodland boundaries"]],
  },
  building: {
    cats: ["impassable"],
    items: [
      "Impassable, unless both players agree that buildings at least 4″ across (this one qualifies) can be occupied.",
      "If occupiable: one infantry unit of Unit Strength 20 or less can garrison it. It counts as in full cover, sees all round, cannot charge, and up to half its models can shoot or cast.",
      "Templates hit the garrison only on a 5+; a cannon hit becomes D3 Strength 4, AP −1 hits and the ball stops.",
      "In combat both sides fight as skirmishers with at most five models each; the garrison never gives ground or falls back, and is destroyed if it breaks. The winner may move in.",
    ],
    links: [["/battlefield-terrain/buildings", "Buildings"]],
  },
  ruins: {
    cats: [],
    items: [
      "Ruins have no category of their own: agree before the game how to treat them. Common choices are difficult terrain (loose rubble) or a building (impassable, or occupiable by a garrison if both players agree).",
      "As a scenario special feature they can be Dark Ruins, with their own rules and victory points.",
    ],
    links: [["/battlefield-terrain/categories-of-terrain", "Terrain categories"], ["/battlefield-terrain/dark-ruins", "Dark ruins"]],
  },
  marsh: {
    cats: ["difficult", "dangerous"],
    items: [
      "Agree before the game: shallow, muddy marsh is difficult terrain; a deep swamp is dangerous terrain.",
    ],
    links: [["/battlefield-terrain/difficult-terrain", "Difficult terrain"], ["/battlefield-terrain/dangerous-terrain", "Dangerous terrain"]],
  },
  rocky: {
    cats: ["difficult", "dangerous"],
    items: [
      "Rocky ground is difficult terrain; agree before the game if it is extremely rocky, which makes it dangerous terrain.",
    ],
    links: [["/battlefield-terrain/difficult-terrain", "Difficult terrain"], ["/battlefield-terrain/dangerous-terrain", "Dangerous terrain"]],
  },
  wall: { cats: [], items: [], links: [] },
  hedge: { cats: [], items: [], links: [] },
  fence: { cats: [], items: [], links: [] },
};
const OBSTACLE_RULES = {
  cats: ["difficult"] as Cat[],
  items: [
    "A low linear obstacle (under 2″ high). Crossing it counts as moving through difficult terrain.",
    "A unit in combat that straddles it is Disrupted and loses its Rank Bonus.",
    "Defending it: a unit with its front rank against the obstacle makes charging enemies stop on the far side; their charge is disordered unless they can Fly.",
  ],
  links: [["/battlefield-terrain/low-linear-obstacles", "Low linear obstacles"], ["/battlefield-terrain/defended-low-linear-obstacles", "Defended obstacles"]] as [string, string][],
};
(["wall", "hedge", "fence"] as Kind[]).forEach((k) => (KIND_RULES[k] = OBSTACLE_RULES));

export function rulesSummaryHtml(r: MapResult): string {
  const kinds = new Set(r.features.map((f) => f.kind));
  const natural = ["wood", "rocky", "marsh"].filter((k) => kinds.has(k as never));
  const troves = r.objectives.filter((o) => o.kind === "trove").length;
  const landmark = r.objectives.some((o) => o.kind === "landmark");
  const sec: string[] = [];

  sec.push(`<h3>Deployment: ${t("m_" + r.map.id)}</h3><ul>
    <li>The players choose their deployment zones, a roll-off decides who deploys the first unit, and then they deploy one unit at a time, alternating.</li>
    <li>${link("/battle-march/battle-march-deployment-maps", "Deployment maps")} · ${link("/battle-march/first-turn-battle-march", "First turn")}</li></ul>`);

  // One block per terrain type on this map, then the general category rules those types refer to.
  const order: Kind[] = ["hill", "wood", "building", "ruins", "marsh", "rocky", "wall", "hedge", "fence"];
  const present = order.filter((k) => kinds.has(k));
  const cats = new Set<Cat>();
  const obstacles = present.filter((k) => KIND_RULES[k] === OBSTACLE_RULES);
  for (const k of present) {
    const kr = KIND_RULES[k];
    if (kr === OBSTACLE_RULES && k !== obstacles[0]) continue;
    kr.cats.forEach((c) => cats.add(c));
    const title = kr === OBSTACLE_RULES ? obstacles.map((o) => t("k_" + o)).join(", ") : t("k_" + k);
    sec.push(`<h3>${title}</h3><ul>${kr.items.map((i) => `<li>${i}</li>`).join("")}<li>${kr.links.map(([p, x]) => link(p, x)).join(" · ")}</li></ul>`);
  }
  for (const c of ["difficult", "dangerous", "impassable"] as Cat[])
    if (cats.has(c)) sec.push(`<h3>${CAT_RULES[c].title}</h3><ul>${CAT_RULES[c].items.map((i) => `<li>${i}</li>`).join("")}<li>${link(CAT_RULES[c].path, "Rules index")}</li></ul>`);

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
    <p class="small">Only the rules you still need while playing on this map, including every terrain type on it; set-up rules (zones, terrain placement, objective placement) are already applied above. Links open the online rules index.</p>
    <div class="rulegrid">${sec.map((s) => `<div>${s}</div>`).join("")}</div></section>`;
}
