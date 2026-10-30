// Espacios: cada carpeta de primer nivel de los marcadores (barra, menú y
// "otros") con al menos un sitio. Al abrir una se listan sus sitios y se
// pueden abrir todos juntos.
import { h, icon, siteIcon, clear } from "./dom.js";
import { hostOf } from "./lib.js";

let openId = null;

function collectUrls(node, out = []) {
  if (node.url && /^https?:/.test(node.url)) out.push(node);
  for (const child of node.children || []) collectUrls(child, out);
  return out;
}

// Carpetas de primer nivel con al menos un sitio (también la usa Ajustes)
export async function listSpaces() {
  const [tree] = await browser.bookmarks.getTree();
  const folders = [];
  for (const rootFolder of tree.children || []) {
    for (const node of rootFolder.children || []) {
      if (node.type !== "folder" && node.url) continue;
      const sites = collectUrls(node);
      if (sites.length) folders.push({ id: node.id, title: node.title || "Sin nombre", sites });
    }
  }
  return folders;
}

export async function renderSpaces(root, settings, { openSettings }) {
  const all = await listSpaces();
  const hidden = new Set(settings.hiddenSpaces);
  const folders = all.filter((f) => !hidden.has(f.id));

  clear(root);
  root.append(h("div", { class: "section-head" }, h("h2", { text: "Espacios" })));
  if (!all.length) {
    root.append(h("p", { class: "empty", text: "Creá carpetas en tus marcadores y aparecen acá como espacios." }));
    return;
  }
  if (!folders.length) {
    root.append(
      h(
        "p",
        { class: "empty" },
        "Ocultaste todos los espacios. ",
        h("button", { class: "link-button", type: "button", onclick: () => openSettings("spaces"), text: "Elegí cuáles mostrar" })
      )
    );
    return;
  }

  const ul = h("ul", { class: "space-list", role: "list" });
  for (const folder of folders) {
    const isOpen = folder.id === openId;
    const panelId = `space-${folder.id}`;
    const card = h(
      "button",
      {
        class: "space-card",
        type: "button",
        "aria-expanded": String(isOpen),
        "aria-controls": panelId,
        onclick: () => {
          openId = isOpen ? null : folder.id;
          renderSpaces(root);
        },
      },
      h("span", { class: "space-icon" }, icon("folder", "icon icon-lg")),
      h(
        "span",
        { class: "row-text" },
        h("span", { class: "row-title", text: folder.title }),
        h("span", { class: "row-sub", text: `${folder.sites.length} ${folder.sites.length === 1 ? "sitio" : "sitios"}` })
      ),
      icon("chevron", "icon chevron")
    );

    const li = h("li", { class: `space${isOpen ? " open" : ""}` }, card);
    if (isOpen) {
      const panel = h("div", { class: "space-panel", id: panelId });
      const sites = h("ul", { class: "space-sites", role: "list" });
      for (const site of folder.sites.slice(0, 12)) {
        sites.append(
          h(
            "li",
            {},
            h(
              "a",
              { class: "row compact", href: site.url, title: site.url },
              siteIcon(site.url, site.title),
              h("span", { class: "row-title", text: site.title || hostOf(site.url) })
            )
          )
        );
      }
      if (folder.sites.length > 12) sites.append(h("li", { class: "hint", text: `y ${folder.sites.length - 12} más…` }));
      panel.append(
        sites,
        h(
          "button",
          {
            class: "button ghost",
            type: "button",
            onclick: () => folder.sites.forEach((s, i) => browser.tabs.create({ url: s.url, active: i === 0 })),
          },
          icon("external"),
          `Abrir todos (${folder.sites.length})`
        )
      );
      li.append(panel);
    }
    ul.append(li);
  }
  root.append(ul);
}
