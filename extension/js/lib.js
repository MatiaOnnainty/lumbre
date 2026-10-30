// Lógica pura (sin DOM ni APIs de extensión), para poder probarla con Node.

/* ── Texto, URLs y tiempos ───────────────────────────────── */

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const LOCAL_RE = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|(?:\d{1,3}\.){3}\d{1,3})(:\d{1,5})?(\/.*)?$/i;
const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}(:\d{1,5})?([/?#].*)?$/i;

// Devuelve una URL navegable si el texto parece una dirección, o null si
// hay que tratarlo como búsqueda.
export function toUrl(input) {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;
  if (SCHEME_RE.test(text)) return text;
  if (LOCAL_RE.test(text)) return `http://${text}`;
  if (DOMAIN_RE.test(text)) return `https://${text}`;
  return null;
}

export function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Compara direcciones ignorando protocolo, "www.", "#hash" y la barra final,
// para encontrar si una página fijada ya está abierta en alguna pestaña.
export function sameUrl(a, b) {
  const norm = (u) => {
    try {
      const x = new URL(u);
      return (x.host.replace(/^www\./, "") + x.pathname.replace(/\/$/, "") + x.search).toLowerCase();
    } catch {
      return u;
    }
  };
  return norm(a) === norm(b);
}

export function letterOf(text) {
  const m = (text || "").match(/[\p{L}\p{N}]/u);
  return m ? m[0].toUpperCase() : "·";
}

// Tono estable por texto, para los avatares con inicial
export function hueOf(text) {
  let h = 0;
  for (const ch of text || "") h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h % 360;
}

export function greeting(hour) {
  if (hour >= 6 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function formatDate(date, locale = "es-AR") {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export function formatClock(date, locale = "es-AR") {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function relativeTime(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return "Hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `Hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "Ayer" : `Hace ${d} d`;
}

// Busca entre pestañas: todas las palabras tienen que aparecer en el título
// o la URL. Primero las que empiezan el título con la primera palabra.
export function matchTabs(tabs, query, limit = 6) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return tabs
    .map((tab) => {
      const title = (tab.title || "").toLowerCase();
      const hay = `${title} ${(tab.url || "").toLowerCase()}`;
      if (!words.every((w) => hay.includes(w))) return null;
      const score = (title.startsWith(words[0]) ? 2 : 0) + (title.includes(words[0]) ? 1 : 0);
      return { tab, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || (b.tab.lastAccessed || 0) - (a.tab.lastAccessed || 0))
    .slice(0, limit)
    .map((r) => r.tab);
}

export function parsePorts(text) {
  const ports = String(text)
    .split(/[\s,;]+/)
    .map((p) => Number.parseInt(p, 10))
    .filter((p) => Number.isInteger(p) && p > 0 && p < 65536);
  return [...new Set(ports)];
}

/* ── Utilidades de desarrollo ────────────────────────────── */

export function formatJson(text, indent = 2) {
  return JSON.stringify(JSON.parse(text), null, indent);
}

export function minifyJson(text) {
  return JSON.stringify(JSON.parse(text));
}

// Base64 con soporte UTF-8 (btoa/atob solos rompen con tildes y emojis)
export function base64Encode(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function base64Decode(b64) {
  const clean = b64.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const padded = clean + "=".repeat((4 - (clean.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

// Decodifica un JWT SIN verificar la firma (no hay clave para hacerlo)
export function decodeJwt(token) {
  const parts = token.trim().split(".");
  if (parts.length < 2) throw new Error("No parece un JWT: faltan partes separadas por puntos");
  const header = JSON.parse(base64Decode(parts[0]));
  const payload = JSON.parse(base64Decode(parts[1]));
  const dates = {};
  for (const key of ["iat", "nbf", "exp"]) {
    if (typeof payload[key] === "number") dates[key] = new Date(payload[key] * 1000);
  }
  const expired = dates.exp ? dates.exp.getTime() < Date.now() : null;
  return { header, payload, dates, expired };
}

// Acepta segundos, milisegundos o una fecha en texto
export function parseTimestamp(input) {
  const text = String(input).trim();
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const n = Number(text);
    // Menos de 1e11 son segundos (hasta el año 5138); más, milisegundos
    return new Date(Math.abs(n) < 1e11 ? n * 1000 : n);
  }
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha no reconocida");
  return d;
}

export function describeTimestamp(date, locale = "es-AR") {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    milliseconds: date.getTime(),
    iso: date.toISOString(),
    local: new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "medium" }).format(date),
    relative: relativeTime(date.getTime()),
  };
}

export function regexMatches(pattern, flags, text, limit = 500) {
  const f = flags.includes("g") ? flags : `${flags}g`;
  const re = new RegExp(pattern, f);
  const out = [];
  for (const m of text.matchAll(re)) {
    out.push({ index: m.index, match: m[0], groups: m.slice(1), named: m.groups || null });
    if (out.length >= limit) break;
  }
  return out;
}

/* ── Colores: HEX / RGB / HSL / OKLCH ────────────────────── */

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklch({ r, g, b }) {
  const [lr, lg, lb] = [r, g, b].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 1e-4 ? 0 : H };
}

function oklchToRgb({ l: L, c: C, h: H }) {
  const A = C * Math.cos((H * Math.PI) / 180);
  const B = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const inGamut = lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  const [r, g, b] = lin.map((v) => Math.round(clamp01(fromLinear(clamp01(v))) * 255));
  return { r, g, b, inGamut };
}

function hslToRgb({ h, s, l }) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

function rgbToHsl({ r, g, b }) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

const num = (x) => Number.parseFloat(x);
const pct = (x) => (String(x).endsWith("%") ? num(x) / 100 : num(x));

export function parseColor(input) {
  const text = input.trim().toLowerCase();
  let m = text.match(/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (m) {
    let hex = m[1];
    if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
    const n = (i) => Number.parseInt(hex.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), alpha: hex.length === 8 ? n(6) / 255 : 1 };
  }
  m = text.match(/^(rgba?|hsla?|oklch)\(([^)]*)\)$/);
  if (!m) throw new Error("Formato no reconocido. Probá #ffaa70, rgb(), hsl() u oklch()");
  const [fn, body] = [m[1], m[2]];
  const [main, alphaPart] = body.split("/");
  const args = main.split(/[\s,]+/).filter(Boolean);
  const rest = args.slice(3);
  const alpha = alphaPart !== undefined ? pct(alphaPart.trim()) : rest.length ? pct(rest[0]) : 1;
  if (fn.startsWith("rgb")) {
    const ch = args.slice(0, 3).map((v) => (v.endsWith("%") ? (num(v) / 100) * 255 : num(v)));
    return { r: Math.round(ch[0]), g: Math.round(ch[1]), b: Math.round(ch[2]), alpha };
  }
  if (fn.startsWith("hsl")) {
    return { ...hslToRgb({ h: num(args[0]), s: pct(args[1]), l: pct(args[2]) }), alpha };
  }
  const L = args[0].endsWith("%") ? num(args[0]) / 100 : num(args[0]);
  const { r, g, b } = oklchToRgb({ l: L, c: num(args[1]), h: num(args[2]) });
  return { r, g, b, alpha };
}

export function describeColor(input) {
  const rgb = parseColor(input);
  const { r, g, b, alpha } = rgb;
  const hex2 = (v) => v.toString(16).padStart(2, "0");
  const a = alpha < 1;
  const hsl = rgbToHsl(rgb);
  const ok = rgbToOklch(rgb);
  const r1 = (x, d = 1) => Number(x.toFixed(d));
  return {
    rgb,
    hex: `#${hex2(r)}${hex2(g)}${hex2(b)}${a ? hex2(Math.round(alpha * 255)) : ""}`,
    rgbText: a ? `rgb(${r} ${g} ${b} / ${r1(alpha, 2)})` : `rgb(${r} ${g} ${b})`,
    hslText: `hsl(${r1(hsl.h)} ${r1(hsl.s * 100)}% ${r1(hsl.l * 100)}%${a ? ` / ${r1(alpha, 2)}` : ""})`,
    oklchText: `oklch(${r1(ok.l * 100, 2)}% ${r1(ok.c, 4)} ${r1(ok.h, 2)}${a ? ` / ${r1(alpha, 2)}` : ""})`,
  };
}

/* ── Tono de un ícono ─────────────────────────────────────
   Recibe píxeles RGBA (ImageData.data) y clasifica el ícono por el promedio
   de luminancia de sus píxeles visibles: "dark" (se pierde sobre el grafito),
   "white" (se pierde sobre el fondo claro) o "color". null si casi no tiene
   píxeles visibles. */
export function iconTone(data, dark = 0.3, white = 0.8) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // transparente: es fondo
    sum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    count++;
  }
  if (count < 4) return null;
  const avg = sum / count;
  return avg < dark ? "dark" : avg > white ? "white" : "color";
}
