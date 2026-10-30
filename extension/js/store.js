// Configuración en storage.sync (viaja con Firefox Sync, cuota ~100 KB).
// Notas y caché de íconos en storage.local (pueden crecer más).
import { hostOf } from "./lib.js";

export const SECTIONS = [
  ["shortcuts", "Accesos directos"],
  ["pinned", "Fijados"],
  ["session", "Retomá donde lo dejaste"],
  ["recent", "Visitados recientemente"],
  ["spaces", "Espacios"],
  ["tools", "Herramientas"],
];

export const DEFAULTS = {
  name: "", // vacío = saludo sin nombre; se completa en Ajustes
  theme: "dark", // "dark" | "light" (copia sincrónica en localStorage, ver theme.js)
  sections: Object.fromEntries(SECTIONS.map(([key]) => [key, true])),
  shortcuts: null, // null = todavía no configurados (primer uso)
  pinned: [],
  pinnedView: "list", // "list" (nombre y dominio) o "grid" (cuadrícula compacta)
  hiddenSpaces: [], // ids de carpetas de marcadores (GUID, iguales en todos los equipos con Sync)
  ports: [3000, 3001, 4200, 5173, 5174, 8000, 8080, 8888],
};

export async function loadSettings() {
  const stored = await browser.storage.sync.get(null);
  const settings = { ...DEFAULTS, ...stored };
  settings.sections = { ...DEFAULTS.sections, ...(stored.sections || {}) };
  if (!Array.isArray(settings.shortcuts)) {
    settings.shortcuts = await initialShortcuts();
    await saveSettings({ shortcuts: settings.shortcuts });
  }
  return settings;
}

export function saveSettings(partial) {
  return browser.storage.sync.set(partial);
}

export async function resetSettings() {
  await browser.storage.sync.clear();
}

// Primer uso: los accesos de la nueva pestaña de Firefox (incluye los
// fijados ahí), o ninguno: se agregan con "Añadir".
async function initialShortcuts() {
  try {
    const sites = await browser.topSites.get({ newtab: true, limit: 8 });
    const list = sites
      .filter((s) => s.type !== "search" && /^https?:/.test(s.url))
      .map((s) => ({ title: s.title || hostOf(s.url), url: s.url }));
    if (list.length) return list.slice(0, 8);
  } catch {
    // topSites puede fallar si la nueva pestaña de Firefox nunca se usó
  }
  return [];
}

/* ── Local ─────────────────────────────────────────────── */

export async function getLocal(key, fallback) {
  const r = await browser.storage.local.get(key);
  return r[key] ?? fallback;
}

export function setLocal(key, value) {
  return browser.storage.local.set({ [key]: value });
}

/* ── Caché de íconos por dominio ──────────────────────────
   Las extensiones no pueden pedirle a Firefox el ícono de una URL del
   historial, pero sí ven favIconUrl en pestañas abiertas y sesiones.
   Se guardan por dominio para reutilizarlos en accesos, historial, etc.
   (sin servicios externos: el ícono se pide al propio sitio). */

let iconCache = null;

export async function loadIconCache() {
  iconCache = await getLocal("icons", {});
  return iconCache;
}

export function iconFor(url) {
  return iconCache?.[hostOf(url)] || null;
}

export async function rememberIcons(items) {
  if (!iconCache) await loadIconCache();
  let changed = false;
  for (const { url, favIconUrl } of items) {
    const host = hostOf(url || "");
    if (!host || !favIconUrl || !/^(https?|data):/.test(favIconUrl)) continue;
    // Los data: grandes inflan el almacenamiento; se ignoran
    if (favIconUrl.startsWith("data:") && favIconUrl.length > 12_000) continue;
    if (iconCache[host] !== favIconUrl) {
      iconCache[host] = favIconUrl;
      changed = true;
    }
  }
  if (changed) await setLocal("icons", iconCache);
}
