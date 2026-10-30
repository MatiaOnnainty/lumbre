// Navegación desde la nueva pestaña.
import { sameUrl } from "./lib.js";

const SELF_URL = browser.runtime.getURL("newtab.html");

export const isOwnPage = (url) => (url || "").startsWith(SELF_URL);

// Ctrl/Cmd/Shift o clic central: el usuario quiere otra pestaña/ventana
export const wantsNewTab = (event) => !!event && (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1);

export async function openUrl(url, event) {
  if (wantsNewTab(event)) {
    await browser.tabs.create({ url, active: !event.ctrlKey && !event.metaKey });
    return;
  }
  const self = await browser.tabs.getCurrent();
  await browser.tabs.update(self.id, { url });
}

// Activa una pestaña existente (y su ventana). Como hace la barra de
// direcciones de Firefox con "Cambiar a pestaña", cierra esta nueva pestaña
// si quedó vacía, para no acumular pestañas en blanco.
export async function switchToTab(tab) {
  const self = await browser.tabs.getCurrent();
  await browser.tabs.update(tab.id, { active: true });
  await browser.windows.update(tab.windowId, { focused: true });
  if (self && self.id !== tab.id) await browser.tabs.remove(self.id);
}

// Fijados: si la página ya está abierta, ir a esa pestaña; si no, abrirla
export async function openOrSwitch(url, event) {
  if (!wantsNewTab(event)) {
    const tabs = await browser.tabs.query({});
    const open = tabs.find((t) => sameUrl(t.url, url));
    if (open) return switchToTab(open);
  }
  return openUrl(url, event);
}
