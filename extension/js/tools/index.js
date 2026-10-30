// Panel "Herramientas" con pestañas: Servidores · Utilidades · Notas.
// Se abre desde el botón flotante (dock.js), que usa selectTool.
import { h, icon, clear } from "../dom.js";
import { getLocal, setLocal } from "../store.js";
import { renderServers } from "./servers.js";
import { renderUtilities } from "./utilities.js";
import { renderNotes } from "./notes.js";

const TABS = [
  ["servers", "Servidores locales", "server"],
  ["utilities", "Utilidades", "code"],
  ["notes", "Notas", "note"],
];

let cleanup = null;
export let selectTool = null;

export async function renderTools(root, settings, ctx) {
  let current = await getLocal("toolsTab", "servers");
  if (!TABS.some(([id]) => id === current)) current = "servers";

  const tablist = h("div", { class: "tabs", role: "tablist", "aria-label": "Herramientas" });
  const panel = h("div", { class: "tool-panel", role: "tabpanel" });

  const select = async (id) => {
    current = id;
    setLocal("toolsTab", id);
    for (const b of tablist.children) {
      const on = b.dataset.id === id;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    }
    cleanup?.();
    cleanup = null;
    clear(panel);
    if (id === "servers") cleanup = renderServers(panel, settings, ctx);
    else if (id === "utilities") await renderUtilities(panel);
    else cleanup = await renderNotes(panel);
  };

  for (const [id, label, ico] of TABS) {
    tablist.append(h("button", { type: "button", role: "tab", class: "tab", dataset: { id }, onclick: () => select(id) }, icon(ico), label));
  }
  // Flechas para moverse entre pestañas (patrón ARIA de tabs)
  tablist.addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const i = TABS.findIndex(([id]) => id === current);
    const next = TABS[(i + (ev.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length][0];
    select(next).then(() => tablist.querySelector(`[data-id="${next}"]`).focus());
  });

  selectTool = select;
  clear(root);
  root.append(
    h(
      "div",
      { class: "section-head" },
      h("h2", { text: "Herramientas" }),
      tablist,
      h("button", { class: "icon-button", type: "button", "aria-label": "Cerrar herramientas", onclick: ctx.close }, icon("x"))
    ),
    panel
  );
  await select(current);
}
