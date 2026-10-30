// "Retomá donde lo dejaste": la última ventana cerrada con varias pestañas
// o, si no hay, la última pestaña cerrada. Restaurar usa sessions.restore.
import { h, icon, siteIcon, clear } from "./dom.js";
import { hostOf, relativeTime } from "./lib.js";
import { isOwnPage } from "./nav.js";
import { rememberIcons } from "./store.js";

const MAX_ICONS = 3;

export async function renderSession(root) {
  const closed = await browser.sessions.getRecentlyClosed({ maxResults: 25 });
  const realTabs = (tabs) => (tabs || []).filter((t) => t.url && !isOwnPage(t.url) && !t.url.startsWith("about:"));

  const win = closed.find((s) => s.window && realTabs(s.window.tabs).length > 1);
  const tab = closed.find((s) => s.tab && realTabs([s.tab]).length);
  const entry = win || tab;
  clear(root);
  root.hidden = !entry;
  if (!entry) return;

  const tabs = realTabs(win ? win.window.tabs : [entry.tab]);
  await rememberIcons(tabs);
  const sessionId = win ? win.window.sessionId : entry.tab.sessionId;
  const hosts = [...new Set(tabs.map((t) => hostOf(t.url)).filter(Boolean))];

  const stack = h("div", { class: "session-icons", "aria-hidden": "true" });
  for (const t of tabs.slice(0, MAX_ICONS)) {
    stack.append(h("span", { class: "session-icon" }, siteIcon(t.url, t.title, "site-icon", t.favIconUrl)));
  }
  if (tabs.length > MAX_ICONS) stack.append(h("span", { class: "session-icon more", text: `+${tabs.length - MAX_ICONS}` }));

  // lastModified viene en segundos en algunas versiones y en ms en otras
  const when = entry.lastModified < 1e12 ? entry.lastModified * 1000 : entry.lastModified;
  const title = win ? "Retomá donde lo dejaste" : "Reabrí la última pestaña";
  const detail = win
    ? `${hosts.slice(0, 2).join(", ")}${hosts.length > 2 ? "…" : ""} · ${tabs.length} pestañas · ${relativeTime(when).toLowerCase()}`
    : `${tabs[0].title || hosts[0]} · ${relativeTime(when).toLowerCase()}`;

  const button = h(
    "button",
    {
      class: "button primary",
      type: "button",
      onclick: async () => {
        button.disabled = true;
        await browser.sessions.restore(sessionId);
      },
    },
    icon("rotate"),
    win ? "Restaurar sesión" : "Reabrir"
  );

  root.append(
    stack,
    h("div", { class: "session-text" }, h("h2", { text: title }), h("p", { text: detail })),
    button
  );
}
