// Accesos directos: tiles con <a href> (Ctrl/clic central abren en otra
// pestaña como cualquier enlace). "Editar accesos" activa editar, borrar y
// reordenar arrastrando.
import { h, icon, siteIcon, clear, editSite } from "./dom.js";
import { isOwnPage } from "./nav.js";

let editing = false;

export function renderShortcuts(root, settings, update) {
  const list = settings.shortcuts;
  const save = (shortcuts) => update({ shortcuts });
  clear(root);
  root.classList.toggle("editing", editing);

  const grid = h("ul", { class: "shortcut-grid", role: "list" });
  list.forEach((site, index) => {
    const tile = h(
      "a",
      { class: "shortcut", href: site.url, title: site.url, draggable: editing ? "true" : "false" },
      h("span", { class: "shortcut-box" }, siteIcon(site.url, site.title, "shortcut-icon")),
      h("span", { class: "shortcut-label", text: site.title })
    );
    const item = h("li", { class: "shortcut-item", dataset: { index } }, tile);

    if (editing) {
      tile.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const edited = await editSite({ heading: "Editar acceso", ...site });
        if (edited) save(list.map((s, i) => (i === index ? edited : s)));
      });
      item.append(
        h(
          "button",
          {
            class: "tile-remove",
            type: "button",
            "aria-label": `Quitar ${site.title}`,
            onclick: () => save(list.filter((_, i) => i !== index)),
          },
          icon("x")
        )
      );
      enableDrag(item, index, list, save);
    }
    grid.append(item);
  });

  grid.append(
    h(
      "li",
      { class: "shortcut-item" },
      h(
        "button",
        { class: "shortcut", type: "button", onclick: () => addShortcut(list, save) },
        h("span", { class: "shortcut-box add" }, icon("plus", "icon icon-lg")),
        h("span", { class: "shortcut-label", text: "Añadir" })
      )
    )
  );

  // Botón chico a la derecha de la fila (no ocupa una fila propia)
  const toggle = h(
    "button",
    {
      class: editing ? "link-button" : "icon-button",
      type: "button",
      "aria-pressed": String(editing),
      "aria-label": editing ? "Terminar de editar" : "Editar accesos",
      title: editing ? null : "Editar accesos",
      onclick: () => {
        editing = !editing;
        renderShortcuts(root, settings, update);
      },
    },
    icon(editing ? "check" : "pencil"),
    editing && "Listo"
  );

  root.append(grid, h("div", { class: "shortcut-actions" }, editing && h("span", { class: "hint", text: "Arrastrá para reordenar" }), toggle));
}

async function addShortcut(list, save) {
  const tabs = (await browser.tabs.query({})).filter((t) => /^https?:/.test(t.url) && !isOwnPage(t.url));
  const site = await editSite({ heading: "Nuevo acceso", suggestions: tabs });
  if (site) save([...list, site]);
}

// Reordenar con drag & drop nativo
function enableDrag(item, index, list, save) {
  item.addEventListener("dragstart", (ev) => {
    ev.dataTransfer.setData("text/x-shortcut-index", String(index));
    ev.dataTransfer.effectAllowed = "move";
    item.classList.add("dragging");
  });
  item.addEventListener("dragend", () => item.classList.remove("dragging"));
  item.addEventListener("dragover", (ev) => {
    if (!ev.dataTransfer.types.includes("text/x-shortcut-index")) return;
    ev.preventDefault();
    item.classList.add("drop-target");
  });
  item.addEventListener("dragleave", () => item.classList.remove("drop-target"));
  item.addEventListener("drop", (ev) => {
    ev.preventDefault();
    item.classList.remove("drop-target");
    const from = Number(ev.dataTransfer.getData("text/x-shortcut-index"));
    if (Number.isNaN(from) || from === index) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    save(next);
  });
}
