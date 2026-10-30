// Servidores locales: qué puertos de localhost responden.
// fetch no-cors devuelve una respuesta opaca si hay algo escuchando (aunque
// sea un 404) y rechaza si el puerto está cerrado. No hace falta permiso de
// host. El CSP del manifest omite upgrade-insecure-requests a propósito: si
// no, http://localhost se reescribiría a https y nunca respondería.
import { h, icon, clear } from "../dom.js";
import { openUrl } from "../nav.js";

const TIMEOUT = 1500;
const REFRESH_EVERY = 15_000;

const KNOWN = {
  3000: "Nuxt · Next · Node",
  3001: "Node",
  4200: "Angular",
  4321: "Astro",
  5000: "Flask",
  5173: "Vite",
  5174: "Vite",
  6006: "Storybook",
  8000: "PHP · Django",
  8080: "HTTP",
  8888: "Jupyter",
  9000: "PHP-FPM · MinIO",
};

async function isUp(port) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    await fetch(`http://localhost:${port}/`, { mode: "no-cors", cache: "no-store", signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function renderServers(root, settings, { openSettings }) {
  let timer = null;
  const grid = h("ul", { class: "server-grid", role: "list" });
  const status = h("span", { class: "hint", "aria-live": "polite" });

  const cards = settings.ports.map((port) => {
    const url = `http://localhost:${port}`;
    const card = h(
      "a",
      { class: "server", href: url, dataset: { state: "checking" }, title: url },
      h("span", { class: "server-dot", "aria-hidden": "true" }),
      h("span", { class: "row-text" }, h("span", { class: "server-port", text: `:${port}` }), h("span", { class: "row-sub", text: KNOWN[port] || "localhost" })),
      icon("external", "icon server-open")
    );
    card.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (card.dataset.state === "up") openUrl(url, ev);
    });
    grid.append(h("li", {}, card));
    return { port, card };
  });

  async function check() {
    status.textContent = "Revisando…";
    const results = await Promise.all(
      cards.map(async ({ port, card }) => {
        const up = await isUp(port);
        card.dataset.state = up ? "up" : "down";
        card.setAttribute("aria-label", `Puerto ${port}: ${up ? "activo" : "sin respuesta"}`);
        return up;
      })
    );
    const n = results.filter(Boolean).length;
    status.textContent = n ? `${n} ${n === 1 ? "activo" : "activos"}` : "Ninguno activo";
  }

  clear(root);
  root.append(
    h(
      "div",
      { class: "tool-head" },
      h("p", { class: "tool-desc", text: "Puertos de desarrollo que responden en localhost. Se revisan cada 15 s mientras este panel está abierto." }),
      h(
        "div",
        { class: "section-actions" },
        status,
        h("button", { class: "icon-button", type: "button", "aria-label": "Revisar ahora", onclick: check }, icon("rotate")),
        h("button", { class: "link-button", type: "button", onclick: openSettings, text: "Editar puertos" })
      )
    ),
    settings.ports.length ? grid : h("p", { class: "empty", text: "No hay puertos configurados." })
  );

  // Solo con la pestaña y el panel a la vista (el panel cerrado no consulta)
  const tick = () => {
    if (document.visibilityState === "visible" && root.isConnected && root.checkVisibility()) check();
  };
  tick();
  timer = setInterval(tick, REFRESH_EVERY);
  document.addEventListener("visibilitychange", tick);
  document.addEventListener("lumbre:tools-shown", tick);

  // Para que el panel pueda limpiar el intervalo al cambiar de herramienta
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", tick);
    document.removeEventListener("lumbre:tools-shown", tick);
  };
}
