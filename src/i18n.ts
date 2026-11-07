export type Lang = "en" | "de";

const EN = {
  title: "Battle March Map Generator",
  tagline: "Random, rules-checked battlefields for Warhammer: The Old World – Battle March",
  generate: "New map", reroll: "Same settings, new seed", seed: "Seed",
  board: "Battlefield", map: "Deployment map", random: "Random", mirror: "Mirrored", yes: "Yes", no: "No",
  objectives: "Objectives", roll: "Roll D6", none: "None", troves2: "Two treasure troves", troves3: "Three treasure troves", landmark: "Strategic landmark",
  size: "Terrain size", sizeRandom: "Random 8×8 / 8×6", rotation: "Rotation", free: "Any angle", square: "0° / 90° only",
  spacing: "Spacing rule", mpg: "Matched Play Guide (3″ between all pieces)", rulebook: "Rulebook (12″ from opponent's pieces)",
  count: "Terrain features", countAuto: "Rule default", obstacles: "of which obstacles (1×8″)", kinds: "Terrain types",
  candidates: "Maps compared", layers: "Show", lGrid: "1″ grid", lDist: "Distances to edges", lGaps: "Gaps between pieces",
  lCentre: "Distance to centre", lZones: "Zones", lNames: "Names",
  checks: "Rule checks", placement: "How to place it", scoring: "Why this map",
  allOk: "All {n} checks passed", someBad: "{n} checks failed",
  exportSvg: "Download SVG", exportPng: "Download PNG", print: "Print", copyLink: "Copy link", copied: "Link copied",
  sideA: "Side A", sideB: "Side B", centreRing: "no terrain within 12″ of the centre",
  rolled: "rolled {r}", mirroredNote: "mirrored", derived: "36×48″ geometry extrapolated from the 30×44″ map",
  trovesNote: "Treasure trove positions are provisional: the official trove maps (General's Companion p. 24) are not entered yet. They are placed in no-man's land, point-symmetric, at least 3″ from terrain.",
  colPiece: "Piece", colCentre: "Centre of the piece", colTurn: "Turned", colSize: "Size", fromEdge: "{v}″ from the {edge} edge",
  left: "left", right: "right", top: "top", bottom: "bottom", clockwise: "clockwise", ccw: "anticlockwise", notTurned: "not turned", lang: "Deutsch",
  objHere: "{v}″ from the {edge} edge", colObj: "Objective", newSeed: "New seed", settingsH: "Settings", howTo: "Long edge = 0–{w}″ from left to right, short edge = 0–{h}″ from top to bottom. Turn angles are measured from the long edge.",
  score: "Score {s} / 100 – best of {v} legal maps",
  sc_fair: "Both sides have similar terrain within 12″ of their zone", sc_zones: "Deployment zones stay open and equally covered",
  sc_lanes: "Some lanes of fire are open, some blocked", sc_spread: "Terrain spread over the table", sc_gaps: "No gaps too narrow to move through (under 2″)",
  sc_variety: "Different terrain types",
  ck_count: "Terrain features: {n} (rule: {expected}, one per 12″ of the longest edge)",
  ck_onBoard: "#{n} lies fully on the battlefield", ck_size: "#{n}: widest point {v}″ (allowed {lo}–{hi}″)",
  ck_centre: "#{n}: {v}″ from the centre (at least {min}″)", ck_spacingMpg: "#{a} ↔ #{b}: {v}″ apart (at least {min}″)",
  ck_spacingOpp: "#{a} ↔ #{b}, placed by different players: {v}″ (at least {min}″)", ck_overlap: "#{a} ↔ #{b}, same player: {v}″ apart, no overlap",
  ck_trove: "Treasure trove {n}: {v}″ from the nearest terrain (at least {min}″)", ck_landmark: "Landmark: {v}″ from the nearest terrain (at least {min}″)",
  ck_noLayout: "No legal layout found for {n} features. Try fewer features, smaller pieces or the Matched Play spacing.",
  m_pitched: "Pitched Battle", m_close: "Close Encounter", m_opposed: "Opposed Flanks", m_meeting: "Meeting Engagement", m_pass: "Mountain Pass", m_outflank: "Outflank",
  k_hill: "Hill", k_wood: "Wood", k_building: "Building", k_ruins: "Ruins", k_marsh: "Marsh", k_rocky: "Rocky ground", k_wall: "Wall", k_hedge: "Hedge", k_fence: "Fence",
  o_trove: "Treasure trove", o_landmark: "Landmark",
  footer: "Unofficial fan tool. Rule numbers from Warhammer: The Old World, the Matched Play Guide and Battle March: General's Companion.",
};
type Dict = typeof EN;
const DE: Dict = {
  title: "Battle-March-Kartengenerator",
  tagline: "Zufällige, regelgeprüfte Schlachtfelder für Warhammer: The Old World – Battle March",
  generate: "Neue Karte", reroll: "Gleiche Einstellungen, neuer Seed", seed: "Seed",
  board: "Schlachtfeld", map: "Aufstellungskarte", random: "Zufällig", mirror: "Gespiegelt", yes: "Ja", no: "Nein",
  objectives: "Missionsziele", roll: "W6 würfeln", none: "Keine", troves2: "Zwei Schatzhorte", troves3: "Drei Schatzhorte", landmark: "Strategisches Wahrzeichen",
  size: "Geländegröße", sizeRandom: "Zufällig 8×8 / 8×6", rotation: "Drehung", free: "Beliebiger Winkel", square: "Nur 0° / 90°",
  spacing: "Abstandsregel", mpg: "Matched Play Guide (3″ zwischen allen Stücken)", rulebook: "Regelbuch (12″ zu Stücken des Gegners)",
  count: "Geländestücke", countAuto: "Regelwert", obstacles: "davon Hindernisse (1×8″)", kinds: "Geländearten",
  candidates: "Verglichene Karten", layers: "Anzeigen", lGrid: "1″-Raster", lDist: "Abstände zu den Kanten", lGaps: "Abstände zwischen Stücken",
  lCentre: "Abstand zur Mitte", lZones: "Zonen", lNames: "Namen",
  checks: "Regelprüfung", placement: "So stellst du es auf", scoring: "Warum diese Karte",
  allOk: "Alle {n} Prüfungen bestanden", someBad: "{n} Prüfungen nicht bestanden",
  exportSvg: "SVG herunterladen", exportPng: "PNG herunterladen", print: "Drucken", copyLink: "Link kopieren", copied: "Link kopiert",
  sideA: "Seite A", sideB: "Seite B", centreRing: "kein Gelände innerhalb 12″ um die Mitte",
  rolled: "gewürfelt: {r}", mirroredNote: "gespiegelt", derived: "36×48″-Maße aus der 30×44″-Karte abgeleitet",
  trovesNote: "Die Positionen der Schatzhorte sind vorläufig: Die offiziellen Schatzhort-Karten (General's Companion S. 24) sind noch nicht eingetragen. Sie liegen punktsymmetrisch im Niemandsland, mindestens 3″ vom Gelände.",
  colPiece: "Stück", colCentre: "Mitte des Stücks", colTurn: "Gedreht", colSize: "Größe", fromEdge: "{v}″ von der {edge} Kante",
  left: "linken", right: "rechten", top: "oberen", bottom: "unteren", clockwise: "im Uhrzeigersinn", ccw: "gegen den Uhrzeigersinn", notTurned: "nicht gedreht", lang: "English",
  objHere: "{v}″ von der {edge} Kante", colObj: "Missionsziel", newSeed: "Neuer Seed", settingsH: "Einstellungen", howTo: "Lange Kante = 0–{w}″ von links nach rechts, kurze Kante = 0–{h}″ von oben nach unten. Drehwinkel werden zur langen Kante gemessen.",
  score: "Wertung {s} / 100 – die beste von {v} regelkonformen Karten",
  sc_fair: "Beide Seiten haben ähnlich viel Gelände bis 12″ vor ihrer Zone", sc_zones: "Aufstellungszonen bleiben frei und gleich bedeckt",
  sc_lanes: "Manche Schussbahnen sind frei, manche blockiert", sc_spread: "Gelände über den Tisch verteilt", sc_gaps: "Keine Lücken unter 2″, durch die keine Einheit passt",
  sc_variety: "Unterschiedliche Geländearten",
  ck_count: "Geländestücke: {n} (Regel: {expected}, eines pro 12″ der längsten Kante)",
  ck_onBoard: "#{n} liegt ganz auf dem Schlachtfeld", ck_size: "#{n}: breiteste Stelle {v}″ (erlaubt {lo}–{hi}″)",
  ck_centre: "#{n}: {v}″ von der Mitte (mindestens {min}″)", ck_spacingMpg: "#{a} ↔ #{b}: {v}″ Abstand (mindestens {min}″)",
  ck_spacingOpp: "#{a} ↔ #{b}, von verschiedenen Spielern: {v}″ (mindestens {min}″)", ck_overlap: "#{a} ↔ #{b}, gleicher Spieler: {v}″, keine Überlappung",
  ck_trove: "Schatzhort {n}: {v}″ zum nächsten Gelände (mindestens {min}″)", ck_landmark: "Wahrzeichen: {v}″ zum nächsten Gelände (mindestens {min}″)",
  ck_noLayout: "Keine regelkonforme Aufstellung für {n} Stücke gefunden. Weniger Stücke, kleinere Stücke oder den Matched-Play-Abstand versuchen.",
  m_pitched: "Pitched Battle", m_close: "Close Encounter", m_opposed: "Opposed Flanks", m_meeting: "Meeting Engagement", m_pass: "Mountain Pass", m_outflank: "Outflank",
  k_hill: "Hügel", k_wood: "Wald", k_building: "Gebäude", k_ruins: "Ruinen", k_marsh: "Sumpf", k_rocky: "Felsiger Boden", k_wall: "Mauer", k_hedge: "Hecke", k_fence: "Zaun",
  o_trove: "Schatzhort", o_landmark: "Wahrzeichen",
  footer: "Inoffizielles Fan-Werkzeug. Regelwerte aus Warhammer: The Old World, dem Matched Play Guide und Battle March: General's Companion.",
};

let lang: Lang = "en";
export const setLang = (l: Lang) => { lang = l; };
export const getLang = () => lang;
export function t(key: string, params: Record<string, string | number> = {}): string {
  const d = (lang === "de" ? DE : EN) as Record<string, string>;
  const s = d[key] ?? (EN as Record<string, string>)[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
}
