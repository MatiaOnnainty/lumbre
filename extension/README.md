# Lumbre — Nueva pestaña

Extensión de Firefox que reemplaza la nueva pestaña (y el botón ⌂) por una página
personal con la paleta grafito + naranja del `userChrome.css`.

- **Buscador**: Enter busca en la web con el motor predeterminado de Firefox, o va
  directo si escribiste una dirección (`nuxt.com`, `localhost:5173`). Con ↑/↓ se
  elige una pestaña abierta y se salta a ella. Atajos: `/` o `Ctrl+K`.
- **Accesos directos**: editables, se reordenan arrastrando. En el primer uso se
  copian los accesos de la nueva pestaña de Firefox.
- **Fijados**: lista propia de páginas, en lista o cuadrícula de íconos (botón en
  el encabezado). Si la página ya está abierta, te lleva a
  esa pestaña. "Importar" copia las pestañas fijadas de Firefox.
- **Retomá donde lo dejaste**: restaura la última ventana cerrada.
- **Visitados recientemente**: historial de los últimos 7 días. "Limpiar" oculta
  la lista actual (con "Deshacer"); no borra el historial de Firefox.
- **Modo claro/oscuro**: botón sol/luna junto a la hora (paleta B light/dark).
  También cambia la ventana de Firefox: `js/background.js` aplica un tema claro
  (`theme.update`) y el `userChrome.css` reacciona con `prefers-color-scheme: light`;
  en oscuro, `theme.reset` vuelve al tema instalado.
- **Espacios**: carpetas de marcadores; "Abrir todos" abre sus sitios.
- **Herramientas** (botón flotante abajo a la izquierda): se despliega en
  abanico con servidores locales (qué puertos responden), utilidades (JSON,
  Base64, URL, JWT, timestamps, UUID, colores, regex) y notas; cada una abre un
  panel flotante. Esc o clic afuera lo cierra sin perder lo escrito.

Todo entra en una pantalla (pensado para 1366×768): las listas de recientes,
fijados y espacios se desplazan dentro de su columna.
- **Ajustes** (ícono arriba a la derecha): nombre, secciones visibles (incluidos
  los accesos directos), qué espacios mostrar, puertos, exportar/importar
  configuración.

Privacidad: nada se envía a servicios externos. Los íconos de sitios se piden
al propio sitio (los mismos que Firefox muestra en tus pestañas) y las búsquedas
van a tu buscador predeterminado. Accesos, fijados y ajustes viajan con Firefox
Sync; las notas quedan solo en este navegador.

## Probar sin firmar

1. Abrí `about:debugging#/runtime/this-firefox`.
2. **Cargar complemento temporal…** → elegí `manifest.json`.

Dura hasta que cierres Firefox. Para ver cambios del código: botón **Recargar**
en esa misma página.

## Firmar e instalar (una vez por versión)

Firefox estable solo instala extensiones firmadas. La firma "unlisted" es
gratis, automática y **no publica** la extensión.

1. Creá una cuenta en <https://addons.mozilla.org> y generá credenciales en
   <https://addons.mozilla.org/developers/addon/api/key/>.
2. En esta carpeta:

   ```bash
   export WEB_EXT_API_KEY="user:…"
   export WEB_EXT_API_SECRET="…"
   npm run sign
   ```

   El `.xpi` firmado queda en `web-ext-artifacts/`.
3. En Firefox: `about:addons` → ⚙️ → **Instalar complemento desde archivo…** → el
   `.xpi`. Cuando Firefox pregunte si mantener la nueva pestaña y la página de
   inicio, elegí **Mantener cambios**.

### Nueva versión

1. Subí `version` en `manifest.json` (por ejemplo `0.1.0` → `0.2.0`; AMO no
   acepta dos veces la misma) y el `?v=` del CSS en `newtab.html`; si no,
   Firefox puede seguir mostrando los estilos viejos.
2. `npm run sign` y reinstalá el nuevo `.xpi` (se actualiza sobre la anterior,
   sin perder datos).

## Desarrollo

```bash
npm test     # pruebas de la lógica (js/lib.js) con node --test
npm run lint # validador de Mozilla (el mismo que corre AMO al firmar)
```

Estructura:

| Archivo | Qué hace |
| --- | --- |
| `js/lib.js` | Lógica pura: URLs, tiempos, búsqueda en pestañas, conversores |
| `js/store.js` | Configuración (`storage.sync`), notas y caché de íconos (`storage.local`) |
| `js/main.js` | Arma la página y redibuja secciones ante cambios |
| `js/tools/` | Servidores locales, utilidades y notas |
| `css/newtab.css` | Estilos; la paleta está en las variables de `:root` |

El CSP del `manifest.json` omite `upgrade-insecure-requests` a propósito: si
no, los chequeos a `http://localhost` se reescribirían a https y fallarían.
