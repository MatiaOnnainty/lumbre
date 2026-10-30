// Utilidades rápidas, todas locales (nada sale del navegador).
// La lógica vive en lib.js (probada con node --test); acá solo la UI.
import { h, clear, copyText } from "../dom.js";
import * as lib from "../lib.js";
import { getLocal, setLocal } from "../store.js";

/* ── Piezas comunes ───────────────────────────────────── */

const textarea = (attrs = {}) => h("textarea", { class: "field mono", spellcheck: "false", rows: 6, ...attrs });
const input = (attrs = {}) => h("input", { class: "field mono", spellcheck: "false", autocomplete: "off", ...attrs });
const btn = (text, onclick, cls = "button ghost") => h("button", { class: cls, type: "button", text, onclick });
const errorBox = () => h("p", { class: "tool-error", role: "alert", hidden: true });

function showError(box, err) {
  box.textContent = err ? err.message || String(err) : "";
  box.hidden = !err;
}

function copyButton(getText) {
  const b = h("button", { class: "copy-button", type: "button", text: "Copiar" });
  b.addEventListener("click", () => {
    const text = getText();
    if (text) copyText(text, b);
  });
  return b;
}

// Fila "etiqueta · valor · copiar"
function kv(label, value) {
  return h("div", { class: "kv" }, h("span", { class: "kv-label", text: label }), h("code", { class: "kv-value", text: String(value) }), copyButton(() => String(value)));
}

function outputArea() {
  const out = textarea({ readonly: true, placeholder: "Resultado" });
  const wrap = h("div", { class: "output" }, out, copyButton(() => out.value));
  return { out, wrap };
}

/* ── Herramientas ─────────────────────────────────────── */

const TOOLS = {
  json: {
    label: "JSON",
    render(panel) {
      const src = textarea({ placeholder: '{"pegá": "tu JSON acá"}' });
      const { out, wrap } = outputArea();
      const err = errorBox();
      const run = (fn) => {
        try {
          out.value = fn(src.value);
          showError(err, null);
        } catch (e) {
          out.value = "";
          showError(err, e);
        }
      };
      panel.append(src, h("div", { class: "tool-actions" }, btn("Formatear", () => run(lib.formatJson)), btn("Minificar", () => run(lib.minifyJson))), err, wrap);
    },
  },

  base64: {
    label: "Base64",
    render(panel) {
      const src = textarea({ placeholder: "Texto o Base64 (también base64url)" });
      const { out, wrap } = outputArea();
      const err = errorBox();
      const run = (fn) => {
        try {
          out.value = fn(src.value);
          showError(err, null);
        } catch (e) {
          out.value = "";
          showError(err, new Error(`No se pudo convertir: ${e.message}`));
        }
      };
      panel.append(src, h("div", { class: "tool-actions" }, btn("Codificar", () => run(lib.base64Encode)), btn("Decodificar", () => run(lib.base64Decode))), err, wrap);
    },
  },

  url: {
    label: "URL",
    render(panel) {
      const src = textarea({ rows: 3, placeholder: "https://ejemplo.com/ruta?clave=valor o texto a codificar" });
      const { out, wrap } = outputArea();
      const err = errorBox();
      const parts = h("div", { class: "kv-list" });
      const run = (fn) => {
        try {
          out.value = fn(src.value);
          showError(err, null);
        } catch (e) {
          out.value = "";
          showError(err, e);
        }
      };
      const parse = () => {
        clear(parts);
        let u;
        try {
          u = new URL(src.value.trim());
        } catch {
          return;
        }
        parts.append(kv("Protocolo", u.protocol), kv("Host", u.host), kv("Ruta", u.pathname));
        for (const [k, v] of u.searchParams) parts.append(kv(`?${k}`, v));
        if (u.hash) parts.append(kv("Hash", u.hash));
      };
      src.addEventListener("input", parse);
      panel.append(
        src,
        h("div", { class: "tool-actions" }, btn("Codificar", () => run(encodeURIComponent)), btn("Decodificar", () => run(decodeURIComponent))),
        err,
        wrap,
        parts
      );
    },
  },

  jwt: {
    label: "JWT",
    render(panel) {
      const src = textarea({ rows: 4, placeholder: "eyJhbGciOi…" });
      const err = errorBox();
      const result = h("div", { class: "jwt-result" });
      const decode = () => {
        clear(result);
        if (!src.value.trim()) return showError(err, null);
        try {
          const { header, payload, dates, expired } = lib.decodeJwt(src.value);
          showError(err, null);
          const fmt = (d) => new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "medium" }).format(d);
          const labels = { iat: "Emitido", nbf: "Válido desde", exp: "Vence" };
          result.append(
            h("p", { class: "hint", text: "La firma no se verifica: solo se decodifica el contenido." }),
            expired !== null && h("span", { class: `badge ${expired ? "danger" : "ok"}`, text: expired ? "Vencido" : "Vigente" }),
            h("div", { class: "kv-list" }, Object.entries(dates).map(([k, d]) => kv(labels[k], `${fmt(d)} (${lib.relativeTime(d.getTime()).toLowerCase()})`))),
            h("h3", { text: "Header" }),
            h("pre", { class: "code", text: JSON.stringify(header, null, 2) }),
            h("h3", { text: "Payload" }),
            h("pre", { class: "code", text: JSON.stringify(payload, null, 2) })
          );
        } catch (e) {
          showError(err, e);
        }
      };
      src.addEventListener("input", decode);
      panel.append(src, err, result);
    },
  },

  timestamp: {
    label: "Timestamp",
    render(panel) {
      const src = input({ placeholder: "1700000000, 1700000000000 o 2024-05-01T12:00" });
      const err = errorBox();
      const list = h("div", { class: "kv-list" });
      const show = () => {
        clear(list);
        if (!src.value.trim()) return showError(err, null);
        try {
          const d = lib.describeTimestamp(lib.parseTimestamp(src.value));
          showError(err, null);
          list.append(kv("Segundos", d.seconds), kv("Milisegundos", d.milliseconds), kv("ISO 8601", d.iso), kv("Local", d.local), kv("Relativo", d.relative));
        } catch (e) {
          showError(err, e);
        }
      };
      src.addEventListener("input", show);
      panel.append(
        h("div", { class: "inline-field" }, src, btn("Ahora", () => {
          src.value = String(Math.floor(Date.now() / 1000));
          show();
        })),
        err,
        list
      );
    },
  },

  uuid: {
    label: "UUID",
    render(panel) {
      const list = h("div", { class: "kv-list" });
      const gen = (n) => {
        clear(list);
        for (let i = 0; i < n; i++) list.append(kv(`v4 #${i + 1}`, crypto.randomUUID()));
      };
      panel.append(h("div", { class: "tool-actions" }, btn("Generar 1", () => gen(1)), btn("Generar 5", () => gen(5))), list);
      gen(1);
    },
  },

  color: {
    label: "Color",
    render(panel) {
      const src = input({ placeholder: "#ffaa70, rgb(255 170 112), hsl(…), oklch(…)" });
      const err = errorBox();
      const swatch = h("span", { class: "swatch", "aria-hidden": "true" });
      const list = h("div", { class: "kv-list" });
      const show = () => {
        clear(list);
        if (!src.value.trim()) return showError(err, null);
        try {
          const c = lib.describeColor(src.value);
          showError(err, null);
          swatch.style.background = c.rgbText;
          list.append(kv("HEX", c.hex), kv("RGB", c.rgbText), kv("HSL", c.hslText), kv("OKLCH", c.oklchText));
        } catch (e) {
          swatch.style.background = "";
          showError(err, e);
        }
      };
      src.addEventListener("input", show);
      panel.append(h("div", { class: "inline-field" }, swatch, src), err, list);
    },
  },

  regex: {
    label: "Regex",
    render(panel) {
      const pattern = input({ placeholder: "(\\d+)-(?<letra>\\w)" });
      const flags = input({ class: "field mono flags", placeholder: "gimsu", maxlength: 6, "aria-label": "Flags" });
      const text = textarea({ rows: 5, placeholder: "Texto de prueba" });
      const err = errorBox();
      const result = h("div", { class: "kv-list" });
      const run = () => {
        clear(result);
        if (!pattern.value) return showError(err, null);
        try {
          const matches = lib.regexMatches(pattern.value, flags.value, text.value);
          showError(err, null);
          result.append(h("p", { class: "hint", text: `${matches.length} ${matches.length === 1 ? "coincidencia" : "coincidencias"}` }));
          for (const m of matches.slice(0, 50)) {
            const groups = m.named ? Object.entries(m.named).map(([k, v]) => `${k}=${v}`) : m.groups.map((g, i) => `$${i + 1}=${g}`);
            result.append(kv(`@${m.index}`, groups.length ? `${m.match}  →  ${groups.join("  ")}` : m.match));
          }
        } catch (e) {
          showError(err, e);
        }
      };
      for (const el of [pattern, flags, text]) el.addEventListener("input", run);
      panel.append(h("div", { class: "inline-field" }, h("span", { class: "mono slash", text: "/" }), pattern, h("span", { class: "mono slash", text: "/" }), flags), text, err, result);
    },
  },
};

export async function renderUtilities(root) {
  let current = await getLocal("utility", "json");
  if (!TOOLS[current]) current = "json";
  const nav = h("div", { class: "utility-nav", role: "tablist", "aria-label": "Utilidades" });
  const panel = h("div", { class: "utility-panel", role: "tabpanel" });

  // focus: solo al elegir una herramienta, no al abrir la pestaña
  const select = (id, focus = true) => {
    current = id;
    setLocal("utility", id);
    for (const b of nav.children) b.setAttribute("aria-selected", String(b.dataset.id === id));
    clear(panel);
    TOOLS[id].render(panel);
    if (focus) panel.querySelector("textarea, input")?.focus({ preventScroll: true });
  };

  for (const [id, tool] of Object.entries(TOOLS)) {
    nav.append(h("button", { type: "button", role: "tab", class: "pill", dataset: { id }, text: tool.label, onclick: () => select(id) }));
  }

  clear(root);
  root.append(nav, panel);
  select(current, false);
}
