// Text helpers shared by the page and the PDF export.
import { t } from "./i18n";

export const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "");

function edgeName(left: boolean, horizontal: boolean) {
  return horizontal ? t(left ? "left" : "right") : t(left ? "top" : "bottom");
}

/** "7.5″ from the left edge · 9″ from the top edge" for a point on a W×H board. */
export function where(x: number, y: number, W: number, H: number) {
  const l = x <= W - x, tp = y <= H - y;
  return `${t("fromEdge", { v: f1(l ? x : W - x), edge: edgeName(l, true) })} · ${t("fromEdge", { v: f1(tp ? y : H - y), edge: edgeName(tp, false) })}`;
}

/** Rotation of a piece, measured from the long edge. */
export function turn(rot: number) {
  const r = rot > 90 ? rot - 180 : rot;
  if (Math.abs(r) < 0.5) return t("notTurned");
  return `${Math.abs(Math.round(r))}° ${r > 0 ? t("clockwise") : t("ccw")}`;
}
