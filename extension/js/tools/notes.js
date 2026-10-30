// Notas rápidas: un bloc que se guarda solo en storage.local.
// Si hay otra nueva pestaña abierta, se actualiza al cambiar en esta.
import { h, clear } from "../dom.js";
import { getLocal, setLocal } from "../store.js";

const SAVE_DELAY = 400;

export async function renderNotes(root) {
  const area = h("textarea", {
    class: "field notes",
    rows: 10,
    spellcheck: "true",
    placeholder: "Anotá lo que quieras: comandos, ideas, pendientes…",
    "aria-label": "Notas",
  });
  const status = h("span", { class: "hint", "aria-live": "polite" });
  area.value = await getLocal("notes", "");

  let timer = null;
  area.addEventListener("input", () => {
    status.textContent = "Guardando…";
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await setLocal("notes", area.value);
      status.textContent = "Guardado";
    }, SAVE_DELAY);
  });

  const onChange = (changes, areaName) => {
    if (areaName === "local" && changes.notes && document.activeElement !== area) {
      area.value = changes.notes.newValue ?? "";
    }
  };
  browser.storage.onChanged.addListener(onChange);

  clear(root);
  root.append(area, h("div", { class: "tool-foot" }, status, h("span", { class: "hint", text: "Se guardan solo en este navegador." })));
  return () => browser.storage.onChanged.removeListener(onChange);
}
