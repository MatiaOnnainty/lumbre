// Fijados: lista propia de páginas, independiente de las pestañas fijadas de
// Firefox. Clic: si ya está abierta va a esa pestaña; si no, la abre. Se
// pueden importar las fijadas de Firefox para después desfijarlas y dejar
// limpio el riel lateral. Dos vistas: lista (nombre y dominio) o cuadrícula
// de íconos tipo dock (el nombre aparece al pasar el mouse).
import { h, icon, siteIcon, clear, editSite } from "./dom.js";
import { hostOf, sameUrl } from "./lib.js";
import { isOwnPage, openOrSwitch } from "./nav.js";

let editing = false;

export async function renderPinned(root, settings, update) {
  const list = settings.pinned;
  const save = (pinned) => update({ pinned });
  const [openTabs, firefoxPinned] = await Promise.all([browser.tabs.query({}), browser.tabs.query({ pinned: true })]);
  const toImport = firefoxPinned.filter((t) => /^https?:/.test(t.url) && !list.some((p) => sameUrl(p.url, t.url)));

  clear(root);
  root.classList.toggle("editing", editing);

  const grid = settings.pinnedView === "grid";
  const actions = h("div", { class: "section-actions" });
  if (toImport.length) {
    // Compacto (ícono + número) para que el encabezado entre en la columna
    const label = `Importar ${toImport.length === 1 ? "la pestaña fijada" : `las ${toImport.length} pestañas fijadas`} de Firefox`;
    actions.append(
      h(
        "button",
        {
          class: "icon-button count-button",
          type: "button",
          title: label,
          "aria-label": label,
          onclick: () => save([...list, ...toImport.map((t) => ({ title: t.title || hostOf(t.url), url: t.url }))]),
        },
        icon("download"),
        h("span", { class: "count", text: String(toImport.length) })
      )
    );
  }
  if (list.length) {
    // Muestra el ícono de la vista a la que se cambia
    actions.append(
      h(
        "button",
        {
          class: "icon-button",
          type: "button",
          "aria-label": grid ? "Ver como lista" : "Ver como cuadrícula",
          title: grid ? "Ver como lista" : "Ver como cuadrícula",
          onclick: () => update({ pinnedView: grid ? "list" : "grid" }),
        },
        icon(grid ? "list" : "grid")
      ),
      h(
        "button",
        {
          class: "icon-button",
          type: "button",
          "aria-label": editing ? "Terminar de editar" : "Editar fijados",
          "aria-pressed": String(editing),
          onclick: () => {
            editing = !editing;
            renderPinned(root, settings, update);
          },
        },
        icon(editing ? "check" : "pencil")
      )
    );
  }
  actions.append(
    h(
      "button",
      {
        class: "icon-button",
        type: "button",
        "aria-label": "Fijar una página",
        onclick: async () => {
          const suggestions = openTabs.filter((t) => /^https?:/.test(t.url) && !isOwnPage(t.url));
          const site = await editSite({ heading: "Fijar página", suggestions });
          if (site) save([...list, site]);
        },
      },
      icon("plus")
    )
  );

  root.append(h("div", { class: "section-head" }, h("h2", { text: "Fijados" }), actions));

  if (!list.length) {
    root.append(
      h("p", {
        class: "empty",
        text: toImport.length
          ? "Importá tus pestañas fijadas de Firefox o agregá páginas con +."
          : "Fijá páginas con + para tenerlas siempre a mano.",
      })
    );
    return;
  }

  const ul = h("ul", { class: `pinned-list${grid ? " grid" : ""}`, role: "list" });
  list.forEach((site, index) => {
    const isOpen = openTabs.some((t) => sameUrl(t.url, site.url));
    const tip = `${site.title}\n${site.url}${isOpen ? " — abierta" : ""}`;
    const dot = isOpen && h("span", { class: "open-dot", "aria-label": "Abierta en una pestaña" });
    const row = grid
      ? h("a", { class: "pin-tile", href: site.url, title: tip, "aria-label": site.title || hostOf(site.url) }, siteIcon(site.url, site.title), dot)
      : h(
          "a",
          { class: "row", href: site.url, title: tip },
          siteIcon(site.url, site.title),
          h("span", { class: "row-text" }, h("span", { class: "row-title", text: site.title }), h("span", { class: "row-sub", text: hostOf(site.url) })),
          dot
        );
    row.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (editing) {
        const edited = await editSite({ heading: "Editar fijado", ...site });
        if (edited) save(list.map((s, i) => (i === index ? edited : s)));
        return;
      }
      openOrSwitch(site.url, ev);
    });
    // El clic central no dispara "click": se maneja aparte
    row.addEventListener("auxclick", (ev) => {
      if (ev.button !== 1 || editing) return;
      ev.preventDefault();
      openOrSwitch(site.url, ev);
    });

    const li = h("li", { class: "pinned-item" }, row);
    if (editing) {
      li.append(
        h(
          "button",
          {
            class: grid ? "tile-remove" : "icon-button danger",
            type: "button",
            "aria-label": `Quitar ${site.title}`,
            onclick: () => save(list.filter((_, i) => i !== index)),
          },
          icon("trash")
        )
      );
    }
    ul.append(li);
  });
  root.append(ul);
}
