import { generate, DEFAULT_SETTINGS, Settings, MapResult } from "./generate";
import { renderSvg, Layers } from "./render";
import { BOARDS, DEPLOY_MAPS, AREA_KINDS, OBSTACLE_KINDS, Kind, SizeMode, defaultFeatureCount } from "./rules";
import { centroid } from "./geom";
import { t } from "./i18n";
import { rulesSummaryHtml } from "./summary";
import { randomSeed } from "./rng";

const app = document.getElementById("app")!;
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "");

// ---------- state <-> URL ----------
const LAYERS_DEFAULT: Layers = { grid: true, dist: true, gaps: true, centre: false, zones: true, names: true };
let layers: Layers = { ...LAYERS_DEFAULT };
try { layers = { ...layers, ...JSON.parse(localStorage.getItem("bmm.layers") || "{}") }; } catch { /* storage unavailable */ }

function readHash(): Settings {
  const q = new URLSearchParams(location.hash.slice(1));
  const s: Settings = { ...DEFAULT_SETTINGS };
  s.seed = q.get("s") || randomSeed();
  s.board = q.get("b") || s.board;
  s.map = q.get("m") || s.map;
  s.mirror = (q.get("mi") as Settings["mirror"]) || s.mirror;
  s.objectives = (q.get("o") as Settings["objectives"]) || s.objectives;
  s.size = (q.get("sz") as Settings["size"]) || s.size;
  s.sizes = { ...DEFAULT_SETTINGS.sizes };
  for (const part of (q.get("ks") || "").split(",")) {
    const [k, v] = part.split(":");
    if (AREA_KINDS.includes(k as Kind) && ["8x8", "8x6", "random"].includes(v)) s.sizes[k as Kind] = v as SizeMode;
  }
  s.rotation = (q.get("r") as Settings["rotation"]) || s.rotation;
  s.spacing = (q.get("sp") as Settings["spacing"]) || s.spacing;
  if (q.get("n")) s.count = Math.max(0, Math.min(8, +q.get("n")!));
  if (q.get("ob")) s.obstacles = Math.max(0, Math.min(4, +q.get("ob")!));
  if (q.get("k")) s.kinds = q.get("k")!.split(",").filter((k) => [...AREA_KINDS, ...OBSTACLE_KINDS].includes(k as Kind)) as Kind[];
  if (q.get("c")) s.candidates = Math.max(1, Math.min(1000, +q.get("c")!));
  return s;
}
function writeHash(s: Settings) {
  const q = new URLSearchParams({
    s: s.seed, b: s.board, m: s.map, mi: s.mirror, o: s.objectives, sz: s.size, ks: AREA_KINDS.map((k) => `${k}:${s.sizes[k] || s.size}`).join(","), r: s.rotation, sp: s.spacing,
    n: String(s.count), ob: String(s.obstacles), k: s.kinds.join(","), c: String(s.candidates)
  });
  history.replaceState(null, "", "#" + q.toString());
}

let settings = readHash();
let result: MapResult;

// ---------- UI ----------
const opt = (v: string, label: string, cur: string) => `<option value="${v}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;

const sizeOpts = (cur: string) => `${opt("8x8", "8×8″", cur)}${opt("8x6", "8×6″", cur)}${opt("random", t("sizeRandom"), cur)}`;
function controlsHtml(s: Settings): string {
  const auto = defaultFeatureCount(BOARDS.find((b) => b.id === s.board) || BOARDS[0]);
  return `<form class="card controls" id="form" aria-label="${esc(t("settingsH"))}">
    <h2>${t("settingsH")}</h2>
    <div class="seedrow"><label class="f">${t("seed")}<input type="text" id="seed" value="${esc(s.seed)}" autocomplete="off" spellcheck="false"></label>
      <button type="button" id="newseed" class="primary">${t("generate")}</button></div>
    <label class="f">${t("board")}<select id="board">${BOARDS.map((b) => opt(b.id, `${b.h}×${b.w}″`, s.board)).join("")}</select></label>
    <div class="row">
      <label class="f">${t("map")}<select id="map">${opt("random", t("random") + " (D6)", s.map)}${DEPLOY_MAPS.map((m, i) => opt(m.id, `${i + 1}. ${t("m_" + m.id)}`, s.map)).join("")}</select></label>
      <label class="f">${t("mirror")}<select id="mirror">${opt("random", t("random"), s.mirror)}${opt("no", t("no"), s.mirror)}${opt("yes", t("yes"), s.mirror)}</select></label>
    </div>
    <label class="f">${t("objectives")}<select id="objectives">${(["roll", "troves2", "troves3", "landmark", "none"] as const).map((o) => opt(o, t(o), s.objectives)).join("")}</select></label>
    <label class="f">${t("spacing")}<select id="spacing">${opt("mpg", t("mpg"), s.spacing)}${opt("rulebook", t("rulebook"), s.spacing)}</select></label>
    <label class="f">${t("rotation")}<select id="rotation">${opt("free", t("free"), s.rotation)}${opt("square", t("square"), s.rotation)}</select></label>
    <div class="row">
      <label class="f">${t("count")}<select id="count">${opt("0", `${t("countAuto")} (${auto})`, String(s.count))}${[2, 3, 4, 5, 6, 7, 8].map((n) => opt(String(n), String(n), String(s.count))).join("")}</select></label>
      <label class="f">${t("obstacles")}<select id="obstacles">${[0, 1, 2, 3].map((n) => opt(String(n), String(n), String(s.obstacles))).join("")}</select></label>
    </div>
    <fieldset class="kinds"><legend>${t("kinds")}</legend>
      <div class="kindrow kindall"><span>${t("allSizes")}</span><select id="sizeAll" aria-label="${esc(t("allSizes"))}"><option value="">–</option>${sizeOpts("")}</select></div>
      ${AREA_KINDS.map((k) => `<div class="kindrow"><label class="chip"><input type="checkbox" data-kind="${k}" ${s.kinds.includes(k) ? "checked" : ""}>${t("k_" + k)}</label>
        <select data-ksize="${k}" aria-label="${esc(t("size") + ": " + t("k_" + k))}">${sizeOpts(s.sizes[k] || s.size)}</select></div>`).join("")}
      ${OBSTACLE_KINDS.map((k) => `<div class="kindrow"><label class="chip"><input type="checkbox" data-kind="${k}" ${s.kinds.includes(k) ? "checked" : ""}>${t("k_" + k)}</label><span class="fixed">1×8″</span></div>`).join("")}
    </fieldset>
    <label class="f">${t("candidates")}<select id="candidates">${[50, 250, 1000].map((n) => opt(String(n), String(n), String(s.candidates))).join("")}</select></label>
  </form>`;
}

function edgeName(left: boolean, horizontal: boolean) {
  return horizontal ? t(left ? "left" : "right") : t(left ? "top" : "bottom");
}
function where(x: number, y: number, W: number, H: number) {
  const l = x <= W - x, tp = y <= H - y;
  return `${t("fromEdge", { v: f1(l ? x : W - x), edge: edgeName(l, true) })} · ${t("fromEdge", { v: f1(tp ? y : H - y), edge: edgeName(tp, false) })}`;
}
function turn(rot: number) {
  const r = rot > 90 ? rot - 180 : rot;
  if (Math.abs(r) < 0.5) return t("notTurned");
  return `${Math.abs(Math.round(r))}° ${r > 0 ? t("clockwise") : t("ccw")}`;
}

function resultHtml(r: MapResult): string {
  const W = r.board.w, H = r.board.h;
  const bad = r.checks.filter((c) => !c.ok);
  const objText = r.objectiveRoll ? `${t("objectives")}: ${t("rolled", { r: r.objectiveRoll })} → ${t(r.objectiveMode)}` : `${t("objectives")}: ${t(r.objectiveMode)}`;
  const notes: string[] = [];
  if (r.board.id !== "30x44" && r.map.derivedOnLarge) notes.push(t("derived"));
  if (r.objectives.some((o) => o.kind === "trove")) notes.push(t("trovesNote"));
  const rows = r.features.map((f) => {
    const c = centroid(f.poly);
    return `<tr><td><span class="badge">${f.n}</span>${esc(t("k_" + f.kind))}</td><td>${f.w}×${f.h}″</td><td>${where(c.x, c.y, W, H)}</td><td>${turn(f.rot)}</td></tr>`;
  }).join("");
  const orows = r.objectives.map((o, i) => `<tr><td>${o.kind === "landmark" ? t("o_landmark") : `${t("o_trove")} ${i + 1}`}</td><td>${o.kind === "landmark" ? "100 mm" : "40 mm"}</td><td>${where(o.x, o.y, W, H)}</td><td></td></tr>`).join("");
  return `<section class="card mapcard" aria-label="Map">
      <div class="meta"><span class="name">${esc(t("m_" + r.map.id))}</span>
        <span class="sub">${H}×${W}″${r.mirrored ? " · " + t("mirroredNote") : ""} · ${esc(objText)} · ${t("seed")} <code>${esc(r.settings.seed)}</code></span></div>
      <div class="svgbox" id="svgbox">${renderSvg(r, layers)}</div>
      ${notes.length ? `<ul class="notes">${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      <div class="toolbar">
        <div class="chips" role="group" aria-label="${esc(t("layers"))}">${(["grid", "zones", "dist", "gaps", "centre", "names"] as const).map((k) =>
          `<label class="chip"><input type="checkbox" data-layer="${k}" ${layers[k] ? "checked" : ""}>${t("l" + k[0].toUpperCase() + k.slice(1))}</label>`).join("")}</div>
        <div class="btns"><button type="button" id="reroll">${t("newSeed")}</button><button type="button" id="copyimg" class="primary">${t("copyImage")}</button><button type="button" id="dlsvg">${t("exportSvg")}</button><button type="button" id="dlpng">${t("exportPng")}</button><button type="button" id="print">${t("print")}</button><button type="button" id="link">${t("copyLink")}</button></div>
      </div>
    </section>
    <section class="card"><h2>${t("placement")}</h2><p class="small">${t("howTo", { w: W, h: H })}</p>
        <div class="tablebox"><table><thead><tr><th>${t("colPiece")}</th><th>${t("colSize")}</th><th>${t("colCentre")}</th><th>${t("colTurn")}</th></tr></thead><tbody>${rows}${orows}</tbody></table></div></section>
    ${rulesSummaryHtml(r)}
    <div class="cols">
      <section class="card checkcard"><h2>${t("checks")}</h2>
        <div class="summary ${bad.length ? "bad" : "ok"}">${bad.length ? t("someBad", { n: bad.length }) : t("allOk", { n: r.checks.length })}</div>
        <ul class="checks">${r.checks.map((c) => `<li class="${c.ok ? (c.info ? "info" : "ok") : "bad"}">${esc(t("ck_" + c.key, c.params))}</li>`).join("")}</ul></section>
      <section class="card scorecard"><h2>${t("scoring")}</h2><p class="small">${t("score", { s: r.score, v: r.valid })}</p>
        <div class="bars">${r.scoreParts.map((p) => `<div class="bar"><span>${t("sc_" + p.key)}</span><div class="track"><div class="fill" style="width:${Math.round(p.value * 100)}%"></div></div></div>`).join("")}</div></section>
    </div>`;
}

function render() {
  app.innerHTML = `<div class="wrap">
    <header><div><h1>${t("title")}</h1><p class="tagline">${t("tagline")}</p></div></header>
    <div class="layout">${controlsHtml(settings)}<div class="main" id="main">${resultHtml(result)}</div></div>
    <footer>${t("footer")}</footer></div>`;
}

function run(newSeed = false) {
  if (newSeed) settings.seed = randomSeed();
  result = generate(settings);
  writeHash(settings);
  render();
}

function readForm(): Settings {
  const v = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;
  return {
    ...settings, seed: v("seed").trim() || randomSeed(), board: v("board"), map: v("map"), mirror: v("mirror") as Settings["mirror"],
    objectives: v("objectives") as Settings["objectives"], spacing: v("spacing") as Settings["spacing"], sizes: Object.fromEntries([...document.querySelectorAll<HTMLSelectElement>("[data-ksize]")].map((el) => [el.dataset.ksize, el.value])) as Settings["sizes"],
    rotation: v("rotation") as Settings["rotation"], count: +v("count"), obstacles: +v("obstacles"), candidates: +v("candidates"),
    kinds: [...document.querySelectorAll<HTMLInputElement>("[data-kind]")].filter((i) => i.checked).map((i) => i.dataset.kind as Kind),
  };
}

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function toast(msg: string) {
  const d = document.createElement("div"); d.className = "toast"; d.textContent = msg; d.setAttribute("role", "status");
  document.body.appendChild(d); setTimeout(() => d.remove(), 1800);
}
/** The current map as a PNG (40 px per inch). */
function pngBlob(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([renderSvg(result, layers)], { type: "image/svg+xml" }));
    img.onload = () => {
      const pxPerInch = 40, M = 2.4;
      const c = document.createElement("canvas");
      c.width = (result.board.w + 2 * M) * pxPerInch; c.height = (result.board.h + 2 * M) * pxPerInch;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png");
    };
    img.onerror = () => reject(new Error("svg"));
    img.src = url;
  });
}
const fileBase = () => `battle-march-${result.map.id}-${result.settings.seed}`;

app.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.layer) {
    layers[el.dataset.layer as keyof Layers] = el.checked;
    try { localStorage.setItem("bmm.layers", JSON.stringify(layers)); } catch { /* ignore */ }
    document.getElementById("svgbox")!.innerHTML = renderSvg(result, layers);
    return;
  }
  if (el.id === "sizeAll") {
    if (!el.value) return;
    document.querySelectorAll<HTMLSelectElement>("[data-ksize]").forEach((x) => (x.value = el.value));
  }
  if (el.closest("#form")) { settings = readForm(); run(); }
});
app.addEventListener("submit", (e) => e.preventDefault());
app.addEventListener("click", async (e) => {
  const id = (e.target as HTMLElement).closest("button")?.id;
  if (!id) return;
  if (id === "newseed" || id === "reroll") { settings = readForm(); run(true); }
  if (id === "dlsvg") download(fileBase() + ".svg", new Blob([renderSvg(result, layers)], { type: "image/svg+xml" }));
  if (id === "dlpng") pngBlob().then((b) => download(fileBase() + ".png", b)).catch(() => toast(t("copyFailed")));
  if (id === "copyimg") {
    try {
      if (!("ClipboardItem" in window) || !navigator.clipboard?.write) throw new Error("unsupported");
      // Pass the promise straight to ClipboardItem so Safari keeps the click as the user gesture.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob() })]);
      toast(t("imgCopied"));
    } catch {
      toast(t("copyFailed"));
    }
  }
  if (id === "print") window.print();
  if (id === "link") {
    try { await navigator.clipboard.writeText(location.href); toast(t("copied")); }
    catch { prompt("", location.href); }
  }
});
window.addEventListener("hashchange", () => {
  const s = readHash();
  if (JSON.stringify(s) !== JSON.stringify(settings)) { settings = s; result = generate(settings); render(); }
});

run();
