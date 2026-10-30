# Lumbre

Un entorno de Firefox con dos partes:

- **`extension/`**: la extensión Lumbre. Reemplaza la nueva pestaña y la página
  de inicio con accesos directos, fijados, la última sesión, el historial
  reciente, los espacios (carpetas de marcadores) y herramientas de desarrollo.
  También alterna Firefox entre modo claro y oscuro.
- **`chrome/`**: el `userChrome.css` y el `userContent.css`, que dan el aspecto
  de la ventana:
  - un riel lateral flotante;
  - la barra de herramientas en tarjeta;
  - la paleta grafito + naranja damasco;
  - las herramientas de desarrollo con la misma paleta.

## Versiones probadas

| | Versión |
| --- | --- |
| Firefox | 158.0.1 (snap) |
| Sistema | Ubuntu 24.04.5 LTS, GNOME 46 en Wayland |
| Pantalla | 1366×768 (todo entra sin desplazar la página) |

La extensión pide Firefox 128 o superior. El `userChrome.css` usa selectores
internos de Firefox que pueden cambiar entre versiones. Si algo se rompe al
actualizar Firefox, empezá por ahí.

## Instalar desde cero

1. **Clonar el repo**

   ```bash
   git clone git@github.com:MatiaOnnainty/lumbre.git
   cd lumbre
   ```

2. **Estilos de la ventana.** Cerrá Firefox y ejecutá:

   ```bash
   ./install.sh                 # perfil predeterminado (snap o normal)
   ./install.sh ~/ruta/al/perfil
   ```

   El script hace dos cosas:
   - enlaza la carpeta `chrome/` del perfil a la del repo, así cada cambio del
     repo se ve al reiniciar Firefox;
   - copia `user.js`, con las preferencias que necesitan los estilos.

   Si el perfil ya tenía una carpeta `chrome/` o un `user.js`, los guarda con
   la fecha en el nombre antes de reemplazarlos.

3. **Extensión.** Ver [`extension/README.md`](extension/README.md).
   - Para probarla: `about:debugging` → *Cargar complemento temporal*.
   - Para dejarla instalada: firmala con `npm run sign` (firma *unlisted* de
     addons.mozilla.org, gratis y sin publicarla) e instalá el `.xpi`.

4. **Ajustes de Firefox** que no se pueden automatizar:
   - En las herramientas de desarrollo, ⚙️ → **Tema: Automático**. Ya viene en
     `user.js`; revisalo si no sigue el modo claro/oscuro.
   - Para acoplar las herramientas a la ventana: menú ⋯ de la caja de
     herramientas → **Acoplar abajo**.

## Estructura

| Carpeta / archivo | Qué contiene |
| --- | --- |
| `extension/` | La extensión (manifest, HTML, CSS, JS, pruebas) |
| `chrome/userChrome.css` | Ventana: riel, barra de herramientas, paneles, diálogos, modo claro |
| `chrome/userContent.css` | Páginas internas; importa `devtools.css` |
| `chrome/devtools.css` | Herramientas de desarrollo con la paleta de Lumbre |
| `chrome/icons/` | Botones de ventana y textura de grano |
| `user.js` | Preferencias necesarias (`about:config`) |
| `install.sh` | Enlaza `chrome/` y copia `user.js` al perfil |
| `branding/` | Logo de Lumbre en tamaños grandes (`.png`, `.ico`) |

## Desarrollo

```bash
cd extension
npm test       # pruebas de la lógica pura
npm run lint   # validador de Mozilla (el mismo que usa AMO al firmar)
```

Al cambiar estilos de la extensión, subí la versión en dos lugares; si no,
Firefox puede seguir mostrando el CSS viejo:
- `version` en `manifest.json`;
- el `?v=` de `newtab.html`.

Las credenciales de AMO (`WEB_EXT_API_KEY` / `WEB_EXT_API_SECRET`) van en
variables de entorno o en un `.env`. El `.env` está en `.gitignore`: nunca
las subas al repo.

## Licencia y créditos

Licencia [MIT](LICENSE) © 2026 Matias A. Onnainty.

Tres componentes de la nueva pestaña están basados en diseños de
[Uiverse.io](https://uiverse.io), también con licencia MIT:
- el botón flotante;
- el botón de ajustes;
- el botón sol/luna.

Los autores y enlaces están en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Firefox es una marca de la Mozilla Foundation. Este proyecto no está afiliado
a Mozilla.
