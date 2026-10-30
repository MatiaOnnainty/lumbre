// Botón flotante de herramientas: el botón principal despliega en
// abanico Servidores · Utilidades · Notas; cada opción abre el panel en esa
// herramienta. El panel no se destruye al cerrarlo, así lo escrito en
// utilidades o notas sigue ahí al volver.
// Diseño basado en https://uiverse.io/Lucaasbre/kind-bird-87 (MIT).
import { selectTool } from "./index.js";

export function initDock(dock) {
  const fab = dock.querySelector(".fab");
  const main = dock.querySelector(".fab-main");
  const options = [...dock.querySelectorAll(".fab-option")];
  const panel = dock.querySelector("#tools-panel");

  const setMenu = (open) => {
    fab.dataset.open = String(open);
    // Cerradas no son alcanzables con Tab (están escondidas detrás del botón)
    for (const o of options) o.tabIndex = open ? 0 : -1;
    main.setAttribute("aria-expanded", String(open || !panel.hidden));
  };

  const closePanel = () => {
    panel.classList.remove("open");
    panel.hidden = true;
    fab.dataset.panel = "false";
    main.setAttribute("aria-expanded", "false");
  };

  const openPanel = async (tool) => {
    setMenu(false);
    await selectTool?.(tool);
    panel.hidden = false;
    fab.dataset.panel = "true";
    main.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => panel.classList.add("open"));
    document.dispatchEvent(new Event("lumbre:tools-shown"));
    panel.querySelector('[role="tab"][aria-selected="true"]')?.focus();
  };

  const closeAll = (focusMain) => {
    setMenu(false);
    closePanel();
    if (focusMain) main.focus();
  };

  main.addEventListener("click", () => {
    if (!panel.hidden) closeAll(false);
    else setMenu(fab.dataset.open !== "true");
    if (fab.dataset.open === "true") options[0].focus();
  });
  for (const o of options) o.addEventListener("click", () => openPanel(o.dataset.tool));

  dock.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.stopPropagation();
      closeAll(true);
    }
    // Flechas entre las opciones del abanico
    const i = options.indexOf(document.activeElement);
    if (i >= 0 && /^Arrow/.test(ev.key)) {
      ev.preventDefault();
      const step = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1;
      options[(i + step + options.length) % options.length].focus();
    }
  });

  // Clic afuera: se cierra todo (el diálogo de sitio y los ajustes no cuentan)
  document.addEventListener("mousedown", (ev) => {
    if (dock.contains(ev.target) || ev.target.closest("dialog, .drawer")) return;
    if (fab.dataset.open === "true" || !panel.hidden) closeAll(false);
  });

  return { close: () => closeAll(false) };
}
