#!/usr/bin/env bash
# Instala el userChrome de Lumbre en un perfil de Firefox:
#   - enlaza <perfil>/chrome a la carpeta chrome/ de este repo (los cambios
#     del repo se ven al reiniciar Firefox, sin copiar nada);
#   - copia user.js al perfil.
# Si el perfil ya tiene una carpeta chrome/ o un user.js, los renombra con
# la fecha antes de reemplazarlos.
#
# Uso: ./install.sh [carpeta-del-perfil]
# Sin argumento, usa el perfil predeterminado de Firefox (snap o normal).
# Cerrá Firefox antes de correrlo.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_profile() {
  local base ini path
  for base in "$HOME/snap/firefox/common/.mozilla/firefox" "$HOME/.mozilla/firefox"; do
    ini="$base/profiles.ini"
    [[ -f "$ini" ]] || continue
    # La sección [Install…] indica el perfil que usa esta instalación
    path="$(awk -F= '/^\[Install/{s=1;next} /^\[/{s=0} s && $1=="Default"{print $2; exit}' "$ini")"
    # Si no hay, el perfil marcado Default=1
    if [[ -z "$path" ]]; then
      path="$(awk -F= '/^\[Profile/{p=""} $1=="Path"{p=$2} $1=="Default" && $2=="1"{print p; exit}' "$ini")"
    fi
    if [[ -n "$path" ]]; then
      [[ "$path" = /* ]] && echo "$path" || echo "$base/$path"
      return 0
    fi
  done
  return 1
}

profile="${1:-}"
if [[ -z "$profile" ]]; then
  profile="$(find_profile)" || { echo "No encontré un perfil de Firefox. Pasá la carpeta como argumento." >&2; exit 1; }
fi
[[ -d "$profile" ]] || { echo "No existe la carpeta del perfil: $profile" >&2; exit 1; }

if pgrep -x firefox >/dev/null 2>&1; then
  echo "Firefox está abierto: cerralo y volvé a correr el script." >&2
  exit 1
fi

stamp="$(date +%Y%m%d-%H%M%S)"
echo "Perfil: $profile"

if [[ -L "$profile/chrome" ]]; then
  rm "$profile/chrome"
elif [[ -e "$profile/chrome" ]]; then
  mv "$profile/chrome" "$profile/chrome.antes-de-lumbre-$stamp"
  echo "  chrome/ anterior → chrome.antes-de-lumbre-$stamp"
fi
ln -s "$repo/chrome" "$profile/chrome"
echo "  chrome/ → $repo/chrome"

if [[ -f "$profile/user.js" ]]; then
  cp "$profile/user.js" "$profile/user.js.antes-de-lumbre-$stamp"
  echo "  user.js anterior → user.js.antes-de-lumbre-$stamp"
fi
cp "$repo/user.js" "$profile/user.js"
echo "  user.js copiado"

echo "Listo. Abrí Firefox; la extensión se instala aparte (ver README)."
