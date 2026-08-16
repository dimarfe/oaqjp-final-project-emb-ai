from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/mundo-v2")
index = root / "index.html"
html = index.read_text(encoding="utf-8")

old_nav = '''        <button data-route="world"><i>🌈</i><span>Reglas del mundo</span></button>
        <button data-route="owner" id="ownerNav" class="hidden"><i>🔐</i><span>Ajustes del propietario</span></button>'''
new_nav = '''        <button data-route="world"><i>🌈</i><span>Reglas del mundo</span></button>
        <button data-route="ai-context"><i>🧠</i><span>Contexto para IA</span></button>
        <button data-route="owner" id="ownerNav" class="hidden"><i>🔐</i><span>Ajustes del propietario</span></button>'''
if 'data-route="ai-context"' not in html:
    if old_nav not in html:
        raise SystemExit("No se encontró el punto del menú para Contexto IA")
    html = html.replace(old_nav, new_nav, 1)

owner_marker = '      <section class="app-view" id="ownerView" data-view="owner">'
context_section = '''      <section class="app-view" id="aiContextView" data-view="ai-context">
        <div class="page-heading"><div><span class="kicker">Canon completo · listo para copiar</span><h1>Contexto para IA</h1><p>Reúne automáticamente toda la información vigente de la aplicación: mundo, reglas, personajes, lugares, aventuras, escena activa, ajustes del estudio y biblioteca compartida.</p></div><div class="page-actions"><button class="button button-soft" id="refreshAiContextButton">↻ Actualizar</button><button class="button button-primary" id="copyAiContextButton">⧉ Copiar para un prompt</button></div></div>
        <div class="ai-context-grid">
          <aside class="ai-context-guide">
            <span class="pill">Texto preparado para modelos de IA</span>
            <h2>Cómo utilizarlo</h2>
            <ol><li>Elige el formato completo, compacto o JSON.</li><li>Pulsa <strong>Copiar para un prompt</strong>.</li><li>Pega el texto en ChatGPT o en otra herramienta creativa.</li><li>Añade al final únicamente el encargo nuevo: la ilustración, el capítulo, el vídeo o la escena que quieres crear.</li></ol>
            <div class="notice info">Los recursos multimedia codificados se sustituyen por una nota. Se conservan todos sus títulos, descripciones, prompts y metadatos útiles para la IA.</div>
          </aside>
          <div class="editor-card ai-context-card">
            <div class="ai-context-toolbar"><div class="ai-context-meta"><strong id="aiContextStatus">Preparando el canon…</strong><span id="aiContextCount"></span></div><label>Formato<select id="aiContextMode"><option value="complete">Completo: texto + JSON</option><option value="compact">Compacto para prompts</option><option value="json">Solo JSON estructurado</option></select></label><button class="button button-soft button-small" id="downloadAiContextButton">Descargar</button></div>
            <textarea class="ai-context-text" id="aiContextText" readonly spellcheck="false" aria-label="Contexto completo para inteligencia artificial"></textarea>
          </div>
        </div>
      </section>

'''
if 'id="aiContextView"' not in html:
    if owner_marker not in html:
        raise SystemExit("No se encontró el punto de inserción de la sección Contexto IA")
    html = html.replace(owner_marker, context_section + owner_marker, 1)

if 'src="ai-context.js"' not in html:
    html = html.replace(
        '  <script src="app.js" defer></script>',
        '  <script src="app.js" defer></script>\n  <script src="ai-context.js" defer></script>',
        1,
    )
index.write_text(html, encoding="utf-8")

sw = root / "sw.js"
source = sw.read_text(encoding="utf-8")
source = source.replace(
    "const CACHE='mi-mundo-magico-v2-20260816-2';",
    "const CACHE='mi-mundo-magico-v2-ai-context-1';",
)
if "'ai-context.js'" not in source:
    source = source.replace(
        "'./','index.html','styles.css','app.js','manifest.webmanifest'",
        "'./','index.html','styles.css','app.js','ai-context.js','manifest.webmanifest'",
    )
sw.write_text(source, encoding="utf-8")
