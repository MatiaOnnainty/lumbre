// user.js — preferencias que necesita el userChrome.css de Lumbre.
// install.sh lo copia a la carpeta del perfil. Firefox lo lee en cada inicio
// y pisa lo que cambies en about:config para estas claves: para cambiarlas
// de forma permanente, editalas acá.

// Que Firefox cargue chrome/userChrome.css y chrome/userContent.css
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);

// Riel lateral: pestañas verticales, siempre visible
user_pref("sidebar.revamp", true);
user_pref("sidebar.verticalTabs", true);
user_pref("sidebar.visibility", "always-show");

// Herramientas de desarrollo: siguen el modo claro/oscuro (ver chrome/devtools.css)
user_pref("devtools.theme", "auto");

// Opcional: fondo translúcido de la ventana (deja ver el escritorio).
// user_pref("widget.transparent-windows", true);
