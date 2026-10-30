// Panel de ajustes (drawer lateral): nombre, secciones visibles, puertos y
// exportar/importar/restablecer la configuración.
import { h, icon, clear } from "./dom.js";
import { parsePorts } from "./lib.js";
import { SECTIONS, DEFAULTS, saveSettings, resetSettings } from "./store.js";
import { listSpaces } from "./spaces.js";

export function initSettings(drawer, getSettings) {
  const body = drawer.querySelector("[data-body]");
  const opener = document.getElementById("open-settings");

  const close = () => {
    drawer.classList.remove("open");
    opener.setAttribute("aria-expanded", "false");
    setTimeout(() => (drawer.hidden = true), 200);
    opener.focus();
  };

  // group: id de un grupo al que saltar (ej. "spaces" desde la sección)
  const open = async (group) => {
    await render(body, getSettings());
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("open"));
    opener.setAttribute("aria-expanded", "true");
    const target = group && body.querySelector(`#set-group-${group}`);
    if (target) target.scrollIntoView({ block: "start" });
    (target || body).querySelector("input")?.focus({ preventScroll: Boolean(target) });
  };

  opener.addEventListener("click", () => (drawer.hidden ? open() : close()));
  drawer.querySelector("[data-close]").addEventListener("click", close);
  drawer.addEventListener("keydown", (ev) => ev.key === "Escape" && close());
  // Cerrar al hacer clic fuera del panel
  document.addEventListener("mousedown", (ev) => {
    if (!drawer.hidden && !drawer.contains(ev.target) && !opener.contains(ev.target)) close();
  });

  return { open };
}

async function render(body, settings) {
  const spaces = await listSpaces().catch(() => []);
  clear(body);

  const name = h("input", { class: "field", id: "set-name", value: settings.name, autocomplete: "off" });
  name.addEventListener("change", () => saveSettings({ name: name.value.trim() }));

  const toggles = SECTIONS.map(([key, label]) => {
    const box = h("input", { type: "checkbox", id: `set-${key}` });
    box.checked = settings.sections[key];
    box.addEventListener("change", () => saveSettings({ sections: { ...settings.sections, [key]: box.checked } }).then(() => (settings.sections[key] = box.checked)));
    return h("label", { class: "check", for: `set-${key}` }, box, h("span", { text: label }));
  });

  // Espacios: marcados = visibles. Se guarda la lista de ocultos para que las
  // carpetas nuevas aparezcan solas.
  const hidden = new Set(settings.hiddenSpaces);
  const spaceToggles = spaces.map((folder) => {
    const box = h("input", { type: "checkbox", id: `set-space-${folder.id}` });
    box.checked = !hidden.has(folder.id);
    box.addEventListener("change", () => {
      if (box.checked) hidden.delete(folder.id);
      else hidden.add(folder.id);
      settings.hiddenSpaces = [...hidden];
      saveSettings({ hiddenSpaces: settings.hiddenSpaces });
    });
    return h("label", { class: "check", for: `set-space-${folder.id}` }, box, h("span", { text: folder.title }), h("span", { class: "check-count", text: String(folder.sites.length) }));
  });
  const spacesGroup = group(
    "Espacios",
    ...(spaceToggles.length ? spaceToggles : [h("p", { class: "hint", text: "Todavía no hay carpetas en tus marcadores." })]),
    h("p", { class: "hint", text: "Las carpetas nuevas se muestran solas; desmarcá las que no quieras ver." })
  );
  spacesGroup.id = "set-group-spaces";

  const ports = h("input", { class: "field mono", id: "set-ports", value: settings.ports.join(", "), autocomplete: "off" });
  const portsHint = h("p", { class: "hint", text: "Separados por coma. Ej.: 3000, 5173, 8080" });
  ports.addEventListener("change", () => {
    const list = parsePorts(ports.value);
    ports.value = list.join(", ");
    saveSettings({ ports: list });
  });

  const fileInput = h("input", { type: "file", accept: "application/json,.json", hidden: true });
  const dataStatus = h("p", { class: "hint", "aria-live": "polite" });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const allowed = Object.fromEntries(Object.entries(data).filter(([k]) => k in DEFAULTS));
      if (!Object.keys(allowed).length) throw new Error("El archivo no tiene una configuración válida");
      await saveSettings(allowed);
      dataStatus.textContent = "Configuración importada.";
    } catch (e) {
      dataStatus.textContent = `No se pudo importar: ${e.message}`;
    }
    fileInput.value = "";
  });

  const exportConfig = async () => {
    const data = await browser.storage.sync.get(null);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `lumbre-config-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const reset = async () => {
    if (!confirm("¿Restablecer accesos, fijados y ajustes? Las notas no se borran.")) return;
    await resetSettings();
    location.reload();
  };

  body.append(
    group("Saludo", h("label", { class: "label", for: "set-name", text: "Tu nombre" }), name),
    group("Secciones", ...toggles),
    spacesGroup,
    group("Servidores locales", h("label", { class: "label", for: "set-ports", text: "Puertos a revisar" }), ports, portsHint),
    group(
      "Datos",
      h("p", { class: "hint", text: "Accesos, fijados y ajustes viajan con Firefox Sync. Exportalos como respaldo." }),
      h(
        "div",
        { class: "tool-actions" },
        h("button", { class: "button ghost", type: "button", onclick: exportConfig }, icon("download"), "Exportar"),
        h("button", { class: "button ghost", type: "button", onclick: () => fileInput.click() }, icon("upload"), "Importar"),
        h("button", { class: "button ghost danger", type: "button", onclick: reset, text: "Restablecer" })
      ),
      fileInput,
      dataStatus
    )
  );
}

const group = (title, ...children) => h("fieldset", { class: "group" }, h("legend", { text: title }), ...children);
