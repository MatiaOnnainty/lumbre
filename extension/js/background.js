// Tema de la ventana de Firefox según el modo de la home ("theme" en
// storage.sync). En claro se aplica un tema claro con theme.update: Firefox
// marca la raíz con lwt-toolbar="light" y el userChrome.css cambia a su
// paleta clara. En oscuro, theme.reset vuelve al tema instalado.
// Los colores siguen la Propuesta B light, por si se usa sin userChrome.

const LIGHT = {
  colors: {
    frame: "#E9EAF0",
    frame_inactive: "#E9EAF0",
    tab_background_text: "#242735",
    tab_selected: "#FBEBDD",
    tab_text: "#242735",
    tab_line: "#B94D18",
    toolbar: "#F5F5F9",
    toolbar_text: "#242735",
    toolbar_field: "#EDEEF4",
    toolbar_field_text: "#242735",
    toolbar_field_focus: "#FFFFFF",
    toolbar_field_text_focus: "#242735",
    toolbar_field_border_focus: "#B94D18",
    popup: "#FFFFFF",
    popup_text: "#242735",
    popup_highlight: "#FBEBDD",
    popup_highlight_text: "#9F3E10",
    sidebar: "#F5F5F9",
    sidebar_text: "#242735",
    ntp_background: "#F3F4F8",
    ntp_text: "#242735",
    icons: "#505970",
    icons_attention: "#B94D18",
  },
};

async function applyWindowTheme(theme) {
  if (theme === undefined) ({ theme } = await browser.storage.sync.get("theme"));
  if (theme === "light") await browser.theme.update(LIGHT);
  else await browser.theme.reset();
}

// Al arrancar Firefox el tema dinámico no se conserva: se vuelve a aplicar
browser.runtime.onStartup.addListener(() => applyWindowTheme());
browser.runtime.onInstalled.addListener(() => applyWindowTheme());
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && "theme" in changes) applyWindowTheme(changes.theme.newValue);
});
