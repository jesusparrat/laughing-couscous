
readme = r"""# 📺 IPTV Player

Web app multiplataforma para ver listas M3U/IPTV desde cualquier dispositivo y navegador — sin instalar nada ni mantener ningún servidor activo.

---

## ¿Qué hace?

- **Carga listas M3U** desde URL (GitHub, iptv-org, cualquier raw HTTP)
- **Agrupa canales automáticamente** por categoría (DAZN, LaLiga, TDT, Eurosport…) y deduplica streams del mismo canal
- **Reproduce streams HTTP/HLS inline** directamente en el navegador vía HLS.js
- **Lanza VLC** con el esquema `vlc://` (sin servidor Python)
- **Lanza Acestream** con el esquema `acestream://`
- **Soporta >20.000 canales** sin bloquear la UI (Web Worker + render por grupo + paginación)
- **Instalable como PWA** en móvil y escritorio (funciona offline para la shell)
- **Playlist dropdown** configurable — añade una URL en `playlists.json` y aparece en el selector

---

## Estructura del proyecto

```
iptv-player/
├── index.html       ← App completa (HTML + CSS + JS)
├── worker.js        ← Web Worker para parseo de M3U en background
├── sw.js            ← Service Worker (PWA + caché offline)
├── manifest.json    ← Metadata PWA (nombre, iconos, colores)
├── playlists.json   ← Lista de M3U predefinidos del dropdown
└── README.md
```

---

## Instalación y despliegue

### Opción A — GitHub Pages (recomendado, gratis)

1. Haz fork o sube los archivos a un repositorio de GitHub
2. Ve a **Settings → Pages → Branch: main / root**
3. Accede a `https://TU_USUARIO.github.io/TU_REPO`

### Opción B — Abre localmente (sin servidor)

> ⚠️ El Web Worker y el Service Worker requieren que el archivo se sirva por HTTP, no `file://`.
> Usa cualquier servidor local mínimo:

**Python (ya tienes Python):**
```bash
python3 -m http.server 8080
# Abre http://localhost:8080
```

**Node.js:**
```bash
npx serve .
```

**VS Code:** Instala la extensión *Live Server* y haz clic en "Go Live".

### Opción C — Android / iOS (PWA instalable)

1. Abre la URL en Chrome (Android) o Safari (iOS)
2. **Android:** menú ⋮ → *Añadir a pantalla de inicio*
3. **iOS:** botón compartir → *Añadir a pantalla de inicio*

La app se instala como una app nativa sin App Store.

### Opción D — Android TV / Smart TV

Abre el navegador del TV y accede a la URL de GitHub Pages.
Para Acestream en Android TV instala la app **Ace Stream Media** desde la Play Store.

---

## Añadir listas al dropdown

Edita `playlists.json` y añade un objeto al array:

```json
[
  {
    "name": "Mi lista ES 🇪🇸",
    "description": "DAZN · LaLiga · Champions · TDT",
    "url": "https://raw.githubusercontent.com/usuario/repo/main/lista.m3u"
  },
  {
    "name": "Nueva lista",
    "description": "Descripción breve",
    "url": "https://ejemplo.com/canales.m3u"
  }
]
```

Haz commit y push — aparece automáticamente en el dropdown de todos los dispositivos.

---

## Uso

### Cargar una lista
1. Selecciona una lista del **dropdown** (listas predefinidas en `playlists.json`)  
   — o —  
   Pega una URL de M3U en el campo de texto y pulsa **Cargar**

### Navegar canales
- Usa los **botones de grupo** para filtrar por categoría
- Usa la **barra de búsqueda** para buscar por nombre (300ms debounce)
- En listas grandes (+200 canales en vista TODOS) usa **Cargar más**

### Reproducir un canal
Haz clic en cualquier tarjeta de canal. Se abre el modal con las opciones disponibles:

| Botón | Acción | Requiere |
|---|---|---|
| **▶ Ver** | Reproduce inline en el navegador | Nada extra (HTTP/HLS) |
| **🟠 VLC** | Abre el stream en VLC | VLC instalado |
| **🟣 Ace** | Lanza AceStream Engine | AceStream instalado |
| **🌐 Web** | Abre URL en nueva pestaña | Solo para HTTP |

---

## Configuración por plataforma

### VLC (Windows / Linux)

VLC registra el protocolo `vlc://` automáticamente al instalarse.  
Si no funciona, abre VLC manualmente → **Media → Abrir ubicación de red** → pega la URL.

### VLC (Android / iOS)

La app VLC para móvil maneja el esquema `vlc://` nativamente.  
Descarga: [videolan.org/vlc](https://www.videolan.org/vlc)

### AceStream (Windows / Linux)

1. Descarga **AceStream Engine** desde [acestream.org](https://www.acestream.org)
2. Inicia el engine (queda en `http://127.0.0.1:6878`)
3. El botón **▶ Ver** usará el gateway local automáticamente

### AceStream (Android)

Instala **Ace Stream Media** desde la Play Store.  
El botón **🟣 Ace** lanza directamente la app con el hash.

### AceStream (iOS)

Acestream no tiene cliente oficial para iOS.  
Usa los streams HTTP alternativos (botón **▶ Ver** o **🌐 Web**) cuando el canal los tenga.

---

## Tecnologías

| Tecnología | Uso |
|---|---|
| HTML5 + CSS3 + JS vanilla | App completa sin frameworks |
| [HLS.js](https://github.com/video-dev/hls.js) | Reproducción HLS en navegadores no-Safari |
| Web Worker | Parseo M3U en background (no bloquea UI) |
| Service Worker | PWA + caché offline de la shell |
| Web App Manifest | Instalación como app nativa |

---

## Rendimiento con listas grandes

- El parseo del M3U se hace en un **Web Worker** separado para no bloquear la interfaz
- Solo se renderiza el **grupo activo** en el DOM (no 20k cards a la vez)
- La vista **TODOS** pagina en bloques de 200 canales con "Cargar más"
- La **búsqueda** filtra el array en memoria con debounce de 300ms — no toca el DOM hasta que el usuario para de escribir
- Las imágenes usan `loading="lazy"` para carga diferida

---

## Licencia

MIT — Úsalo, modifícalo y compártelo libremente.
"""

with open('README.md', 'w', encoding='utf-8') as f:
    f.write(readme.strip())
print(f"✅ README.md ({len(readme)} chars)")

# Final summary
import os
files = ['index.html','worker.js','sw.js','manifest.json','playlists.json','README.md']
print("\n── Archivos generados ──")
for fn in files:
    size = os.path.getsize(fn)
    print(f"  {fn:<20} {size:>6} bytes")
