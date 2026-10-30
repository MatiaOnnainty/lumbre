// Visitados recientemente (historial de la última semana, sin duplicados).
// "Limpiar" solo oculta lo visitado hasta ese momento (guarda la hora en
// storage.local): el historial de Firefox no se toca.
import { h, siteIcon, clear, relTimeNode } from "./dom.js";
import { hostOf, relativeTime } from "./lib.js";
import { isOwnPage } from "./nav.js";
import { getLocal, setLocal } from "./store.js";

// La lista se desplaza dentro de su columna, sin "Ver más"
const LIMIT = 25;
const WEEK = 7 * 86_400_000;
let undoTo = undefined; // hora de limpieza anterior, para "Deshacer"

export async function renderRecent(root) {
  const clearedAt = await getLocal("recentClearedAt", 0);
  const startTime = Math.max(Date.now() - WEEK, clearedAt);
  const items = await browser.history.search({ text: "", startTime, maxResults: 100 });
  const seen = new Set();
  const visits = items
    .filter((i) => /^https?:/.test(i.url) && !isOwnPage(i.url))
    .sort((a, b) => b.lastVisitTime - a.lastVisitTime)
    .filter((i) => {
      // Una entrada por página (ignora #hash)
      const key = i.url.split("#")[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  clear(root);
  const clearList = async () => {
    undoTo = clearedAt;
    await setLocal("recentClearedAt", Date.now());
    renderRecent(root);
  };
  const undo = async () => {
    await setLocal("recentClearedAt", undoTo);
    undoTo = undefined;
    renderRecent(root);
  };
  const clearButton =
    visits.length > 0 &&
    h("button", {
      class: "link-button",
      type: "button",
      text: "Limpiar",
      title: "Oculta la lista actual. No borra tu historial de Firefox.",
      onclick: clearList,
    });
  root.append(h("div", { class: "section-head" }, h("h2", { text: "Visitados recientemente" }), clearButton));

  if (!visits.length) {
    root.append(
      clearedAt > Date.now() - WEEK
        ? h(
            "p",
            { class: "empty" },
            "Lista limpia: lo que visites desde ahora aparece acá. ",
            undoTo !== undefined && h("button", { class: "link-button", type: "button", text: "Deshacer", onclick: undo })
          )
        : h("p", { class: "empty", text: "Todavía no hay visitas en los últimos 7 días." })
    );
    return;
  }

  const ul = h("ul", { class: "recent-list", role: "list" });
  for (const v of visits.slice(0, LIMIT)) {
    ul.append(
      h(
        "li",
        {},
        h(
          "a",
          { class: "row", href: v.url, title: v.url },
          siteIcon(v.url, v.title, "site-icon lg"),
          h(
            "span",
            { class: "row-text" },
            h("span", { class: "row-title", text: v.title || hostOf(v.url) }),
            h("span", { class: "row-sub", text: hostOf(v.url) })
          ),
          h("span", { class: "row-meta" }, relTimeNode(v.lastVisitTime, relativeTime(v.lastVisitTime)))
        )
      )
    );
  }
  root.append(ul);
}
