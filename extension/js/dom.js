// Helpers de DOM. Todo el texto entra por textContent (nunca innerHTML):
// títulos de pestañas e historial son datos externos.
import { hueOf, letterOf, hostOf, iconTone } from "./lib.js";
import { iconFor, getLocal, setLocal } from "./store.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "text") el.textContent = value;
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// Ícono del sprite de newtab.html (<symbol id="i-nombre">)
export function icon(name, cls = "icon") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", cls);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

// Avatar con la inicial del sitio, en un tono estable por dominio
function letterAvatar(url, title, cls) {
  const host = hostOf(url) || title;
  const el = h("span", { class: `${cls} site-letter`, text: letterOf(title || host), "aria-hidden": "true" });
  el.style.setProperty("--hue", hueOf(host));
  return el;
}

// Ícono del sitio: el favIconUrl conocido o, si no hay / falla, la inicial
export function siteIcon(url, title, cls = "site-icon", favIconUrl = null) {
  const src = favIconUrl || iconFor(url);
  if (!src) return letterAvatar(url, title, cls);
  const img = h("img", { class: cls, src, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
  img.addEventListener("error", () => img.replaceWith(letterAvatar(url, title, cls)), { once: true });
  // La placa la decide el CSS según el tema (.tone-dark / .tone-white)
  toneOf(src).then((tone) => (tone === "dark" || tone === "white") && img.classList.add(`tone-${tone}`));
  return img;
}

/* ── Íconos que se pierden en el fondo ────────────────────
   Un favicon negro (GitHub, Vercel…) se pierde sobre el grafito y uno blanco
   sobre el fondo claro: esos van sobre una placa de contraste. Para saberlo
   hay que leer los píxeles, y el navegador solo lo permite si el sitio sirve
   el ícono con CORS (o si es data:). Si no, queda el halo del CSS. El
   resultado se guarda por URL. */

const TONES_KEY = "iconTones2"; // v2: distingue "white" (antes no existía)
let tones = null; // { [src]: "dark" | "white" | "color" | "unknown" }
const pending = new Map();

function toneOf(src) {
  if (!pending.has(src)) pending.set(src, resolveTone(src));
  return pending.get(src);
}

// Los data: pueden medir KB: como clave se usa un hash corto
function toneKey(src) {
  if (!src.startsWith("data:")) return src;
  let hash = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < src.length; i++) hash = Math.imul(hash ^ src.charCodeAt(i), 0x01000193);
  return `data:${(hash >>> 0).toString(36)}:${src.length}`;
}

async function resolveTone(src) {
  tones ??= await getLocal(TONES_KEY, {});
  const key = toneKey(src);
  if (key in tones) return tones[key];
  const tone = (await measureTone(src)) || "unknown";
  tones[key] = tone;
  saveTones();
  return tone;
}

let saveTimer;
function saveTones() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => setLocal(TONES_KEY, tones), 500);
}

function measureTone(src) {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.referrerPolicy = "no-referrer";
    probe.onerror = () => resolve(null);
    probe.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(probe, 0, 0, size, size);
        resolve(iconTone(ctx.getImageData(0, 0, size, size).data));
      } catch {
        resolve(null); // canvas "contaminado": el sitio no permite leerlo
      }
    };
    probe.src = src;
  });
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

/* ── Diálogo de edición de un sitio (título + URL) ─────── */

const dialog = () => document.getElementById("site-dialog");

// Abre el diálogo y resuelve con {title, url} o null si se cancela.
// suggestions: pestañas abiertas para completar con un clic.
export function editSite({ heading, title = "", url = "", suggestions = [] }) {
  const dlg = dialog();
  const form = dlg.querySelector("form");
  dlg.querySelector("[data-heading]").textContent = heading;
  form.elements.title.value = title;
  form.elements.url.value = url;

  const list = clear(dlg.querySelector("[data-suggestions]"));
  list.parentElement.hidden = !suggestions.length;
  for (const tab of suggestions.slice(0, 8)) {
    list.append(
      h(
        "button",
        {
          type: "button",
          class: "chip",
          title: tab.url,
          onclick: () => {
            form.elements.title.value = tab.title || hostOf(tab.url);
            form.elements.url.value = tab.url;
          },
        },
        siteIcon(tab.url, tab.title, "chip-icon", tab.favIconUrl),
        h("span", { text: tab.title || hostOf(tab.url) })
      )
    );
  }

  return new Promise((resolve) => {
    const onClose = () => {
      dlg.removeEventListener("close", onClose);
      if (dlg.returnValue !== "ok") return resolve(null);
      let finalUrl = form.elements.url.value.trim();
      if (!/^[a-z][a-z0-9+.-]*:/i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
      resolve({ title: form.elements.title.value.trim() || hostOf(finalUrl), url: finalUrl });
    };
    dlg.returnValue = "";
    dlg.addEventListener("close", onClose);
    dlg.showModal();
    form.elements.title.focus();
  });
}

/* ── Copiar al portapapeles con aviso ─────────────────── */

export async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  if (!button) return;
  const prev = button.dataset.label || button.textContent;
  button.dataset.label = prev;
  button.textContent = "Copiado";
  setTimeout(() => (button.textContent = prev), 1200);
}

export function relTimeNode(ts, text) {
  return h("time", { datetime: new Date(ts).toISOString(), text });
}
