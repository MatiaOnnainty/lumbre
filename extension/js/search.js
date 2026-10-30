// Buscador: web (motor predeterminado de Firefox), dirección directa o
// salto a una pestaña abierta. Fila 0 = acción por defecto de Enter;
// las pestañas que coinciden van debajo y se eligen con ↑/↓.
import { h, icon, siteIcon, clear } from "./dom.js";
import { hostOf, matchTabs, toUrl } from "./lib.js";
import { isOwnPage, openUrl, switchToTab } from "./nav.js";

export function initSearch(root) {
  const input = root.querySelector("input");
  const list = root.querySelector("[role=listbox]");
  let tabs = [];
  let rows = [];
  let active = 0;

  async function refreshTabs() {
    tabs = (await browser.tabs.query({})).filter((t) => !isOwnPage(t.url));
  }

  function setActive(i) {
    active = (i + rows.length) % rows.length;
    rows.forEach((r, idx) => r.el.setAttribute("aria-selected", String(idx === active)));
    input.setAttribute("aria-activedescendant", rows[active]?.el.id || "");
  }

  function render() {
    const q = input.value.trim();
    clear(list);
    rows = [];
    if (!q) {
      list.hidden = true;
      root.classList.remove("open");
      input.setAttribute("aria-expanded", "false");
      return;
    }

    const url = toUrl(q);
    rows.push({
      run: (ev) => (url ? openUrl(url, ev) : webSearch(q, ev)),
      el: h(
        "li",
        { role: "option", class: "result" },
        icon(url ? "globe" : "search", "icon result-icon"),
        h(
          "span",
          { class: "result-text" },
          h("span", { class: "result-title", text: url ? `Ir a ${hostOf(url) || q}` : `Buscar «${q}» en la web` })
        ),
        h("kbd", { text: "Enter" })
      ),
    });

    for (const tab of matchTabs(tabs, q)) {
      rows.push({
        run: () => switchToTab(tab),
        el: h(
          "li",
          { role: "option", class: "result" },
          siteIcon(tab.url, tab.title, "site-icon result-icon", tab.favIconUrl),
          h(
            "span",
            { class: "result-text" },
            h("span", { class: "result-title", text: tab.title || tab.url }),
            h("span", { class: "result-sub", text: hostOf(tab.url) })
          ),
          h("span", { class: "result-badge", text: "Pestaña abierta" })
        ),
      });
    }

    rows.forEach((row, i) => {
      row.el.id = `result-${i}`;
      row.el.addEventListener("mousedown", (ev) => ev.preventDefault()); // no perder el foco
      row.el.addEventListener("click", (ev) => row.run(ev));
      row.el.addEventListener("mousemove", () => active !== i && setActive(i));
      list.append(row.el);
    });
    list.hidden = false;
    root.classList.add("open");
    input.setAttribute("aria-expanded", "true");
    setActive(0);
  }

  input.addEventListener("focus", async () => {
    await refreshTabs();
    render();
  });
  input.addEventListener("input", render);
  input.addEventListener("blur", () => {
    list.hidden = true;
    root.classList.remove("open");
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown" && rows.length) {
      ev.preventDefault();
      setActive(active + 1);
    } else if (ev.key === "ArrowUp" && rows.length) {
      ev.preventDefault();
      setActive(active - 1);
    } else if (ev.key === "Enter" && rows.length) {
      ev.preventDefault();
      rows[active].run(ev);
    } else if (ev.key === "Escape") {
      input.value = "";
      render();
      input.blur();
    }
  });

  // "/" o Ctrl+K enfocan el buscador (si no se está escribiendo en otro campo).
  // Al abrir una pestaña nueva Firefox deja el foco en su barra de
  // direcciones; eso no se puede cambiar desde una extensión.
  document.addEventListener("keydown", (ev) => {
    const typing = ev.target.closest?.("input, textarea, select, [contenteditable]");
    const ctrlK = (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k";
    if (ctrlK || (ev.key === "/" && !typing)) {
      ev.preventDefault();
      input.focus();
      input.select();
    }
  });
}

// Con tabId el resultado se abre en esa pestaña; sin él, en una nueva
async function webSearch(query, ev) {
  if (ev && (ev.ctrlKey || ev.metaKey || ev.button === 1)) {
    await browser.search.search({ query });
    return;
  }
  const self = await browser.tabs.getCurrent();
  await browser.search.search({ query, tabId: self.id });
}
