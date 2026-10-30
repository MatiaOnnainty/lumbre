import { formatClock, formatDate, greeting } from "./lib.js";
import { DEFAULTS, loadSettings, saveSettings, loadIconCache, rememberIcons } from "./store.js";
import { initSearch } from "./search.js";
import { renderShortcuts } from "./shortcuts.js";
import { renderPinned } from "./pinned.js";
import { renderSession } from "./session.js";
import { renderRecent } from "./recent.js";
import { renderSpaces } from "./spaces.js";
import { renderTools } from "./tools/index.js";
import { initDock } from "./tools/dock.js";
import { initSettings } from "./settings.js";
import { isOwnPage } from "./nav.js";

const $ = (id) => document.getElementById(id);
const state = { settings: null };

// Solo guarda: el redibujo lo hace storage.onChanged (ver watch), así es el
// mismo camino para cambios de esta pestaña, del panel de ajustes y de otras
// ventanas, y nada se dibuja dos veces.
async function update(partial) {
  Object.assign(state.settings, partial);
  await saveSettings(partial);
}

/* ── Tema ─────────────────────────────────────────────── */

function applyTheme() {
  const theme = state.settings.theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  $("theme-toggle").setAttribute("aria-label", theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
  try {
    localStorage.setItem("theme", theme); // para pintar bien el próximo arranque
  } catch {
    // sin localStorage: el arranque muestra oscuro un instante
  }
}

function initThemeToggle() {
  $("theme-toggle").addEventListener("click", () => {
    // Decide según lo que se ve, no según el estado en memoria: así el botón
    // nunca queda desfasado de la pantalla. Se aplica ya; storage.onChanged
    // lo repite en las demás pestañas.
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    state.settings.theme = next;
    applyTheme();
    saveSettings({ theme: next });
  });
}

/* ── Encabezado ───────────────────────────────────────── */

function renderHeader() {
  const now = new Date();
  $("date").textContent = formatDate(now);
  $("greeting").textContent = state.settings.name ? `${greeting(now.getHours())}, ${state.settings.name}.` : `${greeting(now.getHours())}.`;
  $("clock").textContent = formatClock(now);
  $("clock").dateTime = now.toISOString();
}

// Reloj alineado al cambio de minuto
function startClock() {
  const tick = () => {
    renderHeader();
    setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
  };
  tick();
}

/* ── Secciones ────────────────────────────────────────── */

let settingsUi = null;
let dock = null;

const SECTION_RENDER = {
  shortcuts: () => renderShortcuts($("shortcuts"), state.settings, update),
  pinned: () => renderPinned($("pinned"), state.settings, update),
  session: () => renderSession($("session")),
  recent: () => renderRecent($("recent")),
  spaces: () => renderSpaces($("spaces"), state.settings, { openSettings: (group) => settingsUi.open(group) }),
  tools: () => renderTools($("tools-panel"), state.settings, { openSettings: () => settingsUi.open(), close: () => dock.close() }),
};

// Qué secciones dependen de cada clave de configuración
const KEY_SECTIONS = {
  name: ["header"],
  theme: ["theme"],
  shortcuts: ["shortcuts"],
  pinned: ["pinned"],
  pinnedView: ["pinned"],
  hiddenSpaces: ["spaces"],
  ports: ["tools"],
  sections: ["visibility"],
};

function applyVisibility() {
  const { sections } = state.settings;
  for (const key of ["shortcuts", "pinned", "session", "recent", "spaces", "tools"]) {
    $(key).classList.toggle("off", !sections[key]);
  }
  if (!sections.tools) dock?.close();
}

async function renderSection(key) {
  if (key === "header") return renderHeader();
  if (key === "theme") return applyTheme();
  if (key === "visibility") {
    applyVisibility();
    return Promise.all(Object.keys(SECTION_RENDER).filter((k) => state.settings.sections[k] !== false).map(renderSection));
  }
  if (state.settings.sections[key] === false) return;
  try {
    await SECTION_RENDER[key]();
  } catch (err) {
    // Una sección rota no debe tirar abajo el resto de la página
    console.error(`Lumbre: falló la sección "${key}"`, err);
  }
}

function renderFor(keys) {
  const targets = new Set(keys.flatMap((k) => KEY_SECTIONS[k] || []));
  return Promise.all([...targets].map(renderSection));
}

/* ── Actualizaciones en vivo ──────────────────────────── */

function debounce(fn, ms) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

function watch() {
  // Se aplican los valores que trae el evento (no se relee el almacenamiento:
  // evita leer un estado anterior si el evento llega antes que la escritura)
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (!(key in DEFAULTS)) continue;
      if (key === "sections") state.settings.sections = { ...DEFAULTS.sections, ...(newValue || {}) };
      else state.settings[key] = newValue ?? DEFAULTS[key];
    }
    renderFor(Object.keys(changes));
  });

  const refreshTabs = debounce(() => {
    renderSection("pinned");
    renderSection("session");
  }, 300);
  browser.tabs.onCreated.addListener(refreshTabs);
  browser.tabs.onRemoved.addListener(refreshTabs);
  browser.tabs.onUpdated.addListener((id, info, tab) => {
    // "pinned" in info: también al desfijar (pinned: false)
    if (!info.url && !info.favIconUrl && !("pinned" in info)) return;
    if (info.favIconUrl && !isOwnPage(tab.url)) rememberIcons([tab]);
    refreshTabs();
  });

  const refreshBookmarks = debounce(() => renderSection("spaces"), 300);
  for (const ev of ["onCreated", "onRemoved", "onChanged", "onMoved"]) browser.bookmarks[ev].addListener(refreshBookmarks);

  // Al volver a esta pestaña, refrescar lo que cambia con el uso
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    renderHeader();
    for (const key of ["pinned", "session", "recent"]) renderSection(key);
  });
}

/* ── Inicio ───────────────────────────────────────────── */

async function main() {
  const [settings] = await Promise.all([loadSettings(), loadIconCache()]);
  state.settings = settings;
  applyTheme();
  initThemeToggle();

  // Aprender íconos de las pestañas abiertas (para accesos e historial)
  const tabs = await browser.tabs.query({});
  await rememberIcons(tabs.filter((t) => !isOwnPage(t.url)));

  startClock();
  initSearch($("search"));
  settingsUi = initSettings($("settings"), () => state.settings);
  dock = initDock($("tools"));
  applyVisibility();
  await Promise.all(["shortcuts", "pinned", "session", "recent", "spaces", "tools"].map(renderSection));
  watch();
}

main();
