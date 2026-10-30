// Tema claro/oscuro, aplicado antes de pintar (script clásico en <head>,
// sin módulo ni await) para que no haya un destello del otro tema. La
// fuente de verdad es storage.sync ("theme", viaja con Firefox Sync);
// localStorage es solo la copia sincrónica para este arranque.
(() => {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
  } catch {
    // localStorage bloqueado: queda el tema oscuro por defecto
  }
})();
