(() => {
  'use strict';

  const API = 'https://kfmyyvjkkhwpwubszmec.supabase.co/functions/v1/magic-world-api';
  const TOKEN_KEY = 'mi_mundo_magico_v2_editor';
  const CACHE_KEY = 'mi_mundo_magico_v2_cache';
  const ROUTE = 'ai-context';
  const BINARY_KEYS = new Set(['data_url', 'dataUrl', 'base64', 'blob', 'binary', 'bytes']);
  const OMITTED_ROOT_KEYS = new Set(['_private', 'secrets', 'credentials']);
  let latestRow = null;
  let refreshTimer = null;
  let pollingTimer = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const plain = (value) => String(value ?? '').trim();
  const escapeMarkdown = (value) => String(value ?? '').replace(/\r\n/g, '\n').trim();

  function safeJson(value) {
    return JSON.stringify(value, null, 2);
  }

  function sanitizeForAI(value, key = '', depth = 0) {
    if (depth > 18) return '[profundidad máxima alcanzada]';
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map((item) => sanitizeForAI(item, '', depth + 1));
    if (typeof value === 'object') {
      const result = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        if (OMITTED_ROOT_KEYS.has(childKey)) continue;
        if (BINARY_KEYS.has(childKey)) {
          const length = typeof childValue === 'string' ? childValue.length : 0;
          result[childKey] = childValue ? `[recurso multimedia omitido: ${length.toLocaleString('es-ES')} caracteres]` : '';
          continue;
        }
        result[childKey] = sanitizeForAI(childValue, childKey, depth + 1);
      }
      return result;
    }
    if (typeof value === 'string') {
      if (/^data:(image|video|audio|application)\//i.test(value)) {
        return `[recurso multimedia incrustado omitido: ${value.length.toLocaleString('es-ES')} caracteres]`;
      }
      if (value.length > 65000) return `${value.slice(0, 65000)}\n[… texto recortado por longitud …]`;
    }
    return value;
  }

  function formatDate(value) {
    if (!value) return 'sin fecha';
    try {
      return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  function labelFor(key) {
    return String(key || '')
      .replace(/([a-záéíóúñ])([A-Z])/g, '$1 $2')
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  function readableValue(value) {
    if (value === null || value === undefined || value === '') return 'No definido';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return escapeMarkdown(value);
    return `\n\n\`\`\`json\n${safeJson(sanitizeForAI(value))}\n\`\`\``;
  }

  function objectFields(object, excluded = []) {
    const skip = new Set(excluded);
    return Object.entries(object || {})
      .filter(([key]) => !skip.has(key))
      .map(([key, value]) => `- **${labelFor(key)}:** ${readableValue(value)}`)
      .join('\n');
  }

  function characterSection(character, index) {
    const identity = ['id', 'name', 'title', 'role', 'age', 'appearance', 'colors', 'fixed', 'portrait', 'sticker', 'locked'];
    const magic = ['power', 'magicLook', 'weakness', 'voice', 'phrase', 'companion'];
    const transformation = ['animalForm', 'animalLook', 'trigger', 'evolution', 'evolutionPowers'];
    const story = ['personality', 'history', 'dream', 'fear', 'object'];
    const known = new Set([...identity, ...magic, ...transformation, ...story]);
    const extra = Object.entries(character || {}).filter(([key]) => !known.has(key));

    const lines = [
      `## ${index + 1}. ${plain(character?.name) || 'Personaje sin nombre'}`,
      '',
      '### Identidad visual y papel',
      ...identity.map((key) => `- **${labelFor(key)}:** ${readableValue(character?.[key])}`),
      '',
      '### Magia y compañero',
      ...magic.map((key) => `- **${labelFor(key)}:** ${readableValue(character?.[key])}`),
      '',
      '### Transformación y evolución',
      ...transformation.map((key) => `- **${labelFor(key)}:** ${readableValue(character?.[key])}`),
      '',
      '### Personalidad e historia',
      ...story.map((key) => `- **${labelFor(key)}:** ${readableValue(character?.[key])}`)
    ];
    if (extra.length) {
      lines.push('', '### Otros datos del personaje', ...extra.map(([key, value]) => `- **${labelFor(key)}:** ${readableValue(value)}`));
    }
    return lines.join('\n');
  }

  function locationSection(location, index) {
    return [
      `## ${index + 1}. ${plain(location?.name) || 'Lugar sin nombre'}`,
      objectFields(location)
    ].join('\n\n');
  }

  function adventureSection(adventure, index) {
    return [
      `## ${index + 1}. ${plain(adventure?.title) || 'Aventura sin título'}`,
      objectFields(adventure)
    ].join('\n\n');
  }

  function sceneSection(scene, state) {
    const characterById = new Map((state.characters || []).map((character) => [character.id, character.name]));
    const items = (scene?.items || []).map((item, index) => ({
      order: index + 1,
      id: item.id,
      type: item.type,
      reference: item.ref,
      represented_as: item.type === 'character' ? (characterById.get(item.ref) || item.ref) : item.ref,
      position_x: item.x,
      position_y: item.y,
      scale: item.scale,
      rotation: item.rotation
    }));
    const sceneCopy = sanitizeForAI({ ...(scene || {}), items });
    return [
      '## Escena activa del creador',
      objectFields(sceneCopy),
      '',
      '### Interpretación para una IA',
      `La escena debe representar «${plain(scene?.title) || 'Escena sin título'}» en el fondo «${plain(scene?.background) || 'sin especificar'}». La acción o diálogo es: ${plain(scene?.speech) || 'No definido'}. Los objetos están colocados según las coordenadas normalizadas indicadas en la lista de elementos.`
    ].join('\n');
  }

  function librarySection(library) {
    if (!Array.isArray(library) || !library.length) return 'No hay creaciones guardadas en la biblioteca compartida.';
    return library.map((asset, index) => {
      const clean = sanitizeForAI(asset);
      return [`## ${index + 1}. ${plain(asset?.title) || 'Creación sin título'}`, objectFields(clean)].join('\n\n');
    }).join('\n\n');
  }

  function remainingRootData(state) {
    const known = new Set(['meta', 'participant', 'world', 'characters', 'locations', 'adventures', 'scene', 'studio', 'library', '_sync']);
    const remaining = Object.fromEntries(Object.entries(state || {}).filter(([key]) => !known.has(key)));
    return Object.keys(remaining).length ? safeJson(sanitizeForAI(remaining)) : '{}';
  }

  function buildHumanContext(row) {
    const state = row?.data || {};
    const world = state.world || {};
    const characters = state.characters || [];
    const locations = state.locations || [];
    const adventures = state.adventures || [];
    const scene = state.scene || {};
    const library = state.library || [];
    const sync = state._sync || {};

    return [
      '# CONTEXTO MAESTRO PARA IA — MI MUNDO MÁGICO V2',
      '',
      '## INSTRUCCIONES PARA EL MODELO',
      'Usa este documento como fuente de verdad y canon vigente. No contradigas los datos definidos. Conserva exactamente nombres, relaciones, edades aparentes, rostros, cabello, colores, ropa, poderes, criaturas, transformaciones, evoluciones, localizaciones y reglas visuales. Cuando falte un dato, indícalo como pendiente en vez de inventarlo como canon. Las nuevas ideas deben ampliar el universo sin sustituir ni mezclar las identidades existentes.',
      '',
      'El universo es familiar y apropiado para público de 10 a 15 años. Mantén un tono aventurero, emotivo, divertido y seguro. Para ilustraciones y vídeos, evita personajes duplicados, extremidades extra, cambios de rostro, intercambio de criaturas, variaciones de edad no solicitadas y texto incrustado salvo petición expresa.',
      '',
      '## METADATOS DEL CANON COMPARTIDO',
      `- **Aplicación:** Mi mundo Mágico v2`,
      `- **Nombre del mundo registrado:** ${plain(row?.world_name || world.name) || 'No definido'}`,
      `- **Última modificación:** ${formatDate(row?.updated_at || sync.updatedAt)}`,
      `- **Última persona que modificó:** ${plain(sync.updatedBy || row?.author_name) || 'No indicado'}`,
      `- **Revisión compartida:** ${sync.revision ?? 'No indicada'}`,
      `- **Personajes:** ${characters.length}`,
      `- **Lugares:** ${locations.length}`,
      `- **Aventuras:** ${adventures.length}`,
      `- **Creaciones de biblioteca:** ${library.length}`,
      '',
      '# MUNDO Y REGLAS GENERALES',
      objectFields(world),
      '',
      '# PERSONAJES',
      characters.length ? characters.map(characterSection).join('\n\n---\n\n') : 'No hay personajes definidos.',
      '',
      '# LOCALIZACIONES',
      locations.length ? locations.map(locationSection).join('\n\n---\n\n') : 'No hay localizaciones definidas.',
      '',
      '# AVENTURAS',
      adventures.length ? adventures.map(adventureSection).join('\n\n---\n\n') : 'No hay aventuras definidas.',
      '',
      '# ESCENA Y COMPOSICIÓN ACTUAL',
      sceneSection(scene, state),
      '',
      '# AJUSTES DEL ESTUDIO CREATIVO',
      objectFields(sanitizeForAI(state.studio || {})),
      '',
      '# BIBLIOTECA COMPARTIDA',
      librarySection(library),
      '',
      '# OTROS DATOS DE LA APLICACIÓN',
      '```json',
      remainingRootData(state),
      '```',
      '',
      '# REGLAS DE CONTINUIDAD PARA CUALQUIER NUEVA CREACIÓN',
      '1. Leer primero todo este contexto y tratarlo como canon.',
      '2. Mantener la identidad visual y narrativa de cada personaje entre escenas.',
      '3. No intercambiar poderes, criaturas, colores ni papeles familiares.',
      '4. Conservar los rasgos reconocibles cuando un personaje se transforme o evolucione.',
      '5. Respetar las reglas mágicas, la arquitectura y la atmósfera del mundo.',
      '6. Integrar las escenas y creaciones de la biblioteca cuando sean relevantes para el encargo.',
      '7. Diferenciar claramente entre datos canónicos y propuestas nuevas.',
      '8. Antes de finalizar, comprobar nombres, número de personajes y continuidad.'
    ].join('\n');
  }

  function buildCompleteContext(row) {
    const sanitized = sanitizeForAI(row?.data || {});
    return `${buildHumanContext(row)}\n\n# JSON CANÓNICO ESTRUCTURADO\nEste bloque reproduce todos los datos útiles de la aplicación en un formato legible por máquinas. Los recursos binarios incrustados se sustituyen por una nota para evitar incluir miles de caracteres sin valor semántico.\n\n\`\`\`json\n${safeJson(sanitized)}\n\`\`\``;
  }

  function buildCompactContext(row) {
    const state = row?.data || {};
    const characters = state.characters || [];
    const locations = state.locations || [];
    const adventures = state.adventures || [];
    return [
      '# PROMPT CANÓNICO COMPACTO — MI MUNDO MÁGICO V2',
      'Usa lo siguiente como canon obligatorio y no cambies ningún detalle definido.',
      '',
      `MUNDO: ${plain(state.world?.name)}. ${plain(state.world?.description)}`,
      `REGLAS MÁGICAS: ${plain(state.world?.magicRules)}`,
      `ESTILO VISUAL: ${plain(state.world?.visualStyle)}`,
      `ESTILO DE VÍDEO: ${plain(state.world?.cinematicStyle)}`,
      `NO CAMBIAR: ${plain(state.world?.forbidden)}`,
      `TONO Y SEGURIDAD: ${plain(state.world?.safety)}`,
      '',
      'PERSONAJES:',
      ...characters.map((character) => `- ${character.name} (${character.title || character.role}): ${character.appearance}. Colores: ${character.colors}. Poder: ${character.power}. Magia: ${character.magicLook}. Compañero: ${character.companion}. Transformación: ${character.animalForm || 'pendiente'}; aspecto: ${character.animalLook || 'pendiente'}. Evolución: ${character.evolution || 'pendiente'}. Rasgos fijos: ${character.fixed}. Personalidad: ${character.personality}. Historia: ${character.history}.`),
      '',
      'LUGARES:',
      ...locations.map((location) => `- ${location.name}: ${location.look || location.description}. Magia: ${location.magic}. Habitantes/criaturas: ${location.inhabitants || ''} ${location.creatures || ''}. Secreto: ${location.secret}. Peligro: ${location.danger}.`),
      '',
      'AVENTURAS:',
      ...adventures.map((adventure) => `- ${adventure.title}: ${adventure.summary}. Objetivo: ${adventure.goal}. Obstáculo: ${adventure.obstacle}. Giro: ${adventure.twist}. Final: ${adventure.ending}.`),
      '',
      `ESCENA ACTUAL: ${state.scene?.title || 'Sin título'}; fondo ${state.scene?.background || 'sin especificar'}; acción ${state.scene?.speech || 'sin definir'}; elementos ${safeJson(sanitizeForAI(state.scene?.items || []))}.`,
      '',
      'Mantén continuidad exacta, no dupliques personajes, no añadas extremidades y no inventes cambios de canon sin marcarlos como propuesta.'
    ].join('\n');
  }

  function contextForMode(row, mode) {
    if (mode === 'json') return safeJson(sanitizeForAI(row?.data || {}));
    if (mode === 'compact') return buildCompactContext(row);
    return buildCompleteContext(row);
  }

  function readCachedRow() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cached?.state) return null;
      return {
        data: cached.state,
        author_name: cached.lastUpdatedBy || cached.state?._sync?.updatedBy || '',
        world_name: cached.state?.world?.name || '',
        updated_at: cached.lastUpdatedAt || cached.state?._sync?.updatedAt || ''
      };
    } catch {
      return null;
    }
  }

  function updateOutput(row, message = '') {
    latestRow = row || latestRow;
    if (!latestRow) return;
    const mode = $('#aiContextMode')?.value || 'complete';
    const text = contextForMode(latestRow, mode);
    const area = $('#aiContextText');
    if (area) area.value = text;
    const count = $('#aiContextCount');
    if (count) count.textContent = `${text.length.toLocaleString('es-ES')} caracteres`;
    const status = $('#aiContextStatus');
    if (status) {
      const revision = latestRow.data?._sync?.revision;
      const author = latestRow.data?._sync?.updatedBy || latestRow.author_name || '';
      status.textContent = message || `Canon compartido${revision !== undefined ? ` · revisión ${revision}` : ''}${author ? ` · último cambio de ${author}` : ''}`;
    }
  }

  async function fetchLatest(showProgress = true) {
    const token = sessionStorage.getItem(TOKEN_KEY) || '';
    if (!token) {
      const cached = readCachedRow();
      if (cached) updateOutput(cached, 'Mostrando la última copia disponible en este dispositivo.');
      return;
    }
    const status = $('#aiContextStatus');
    if (showProgress && status) status.textContent = 'Actualizando desde el mundo compartido…';
    try {
      const response = await fetch(`${API}?action=get&token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || `Error ${response.status}`);
      updateOutput(payload);
    } catch (error) {
      const cached = readCachedRow();
      if (cached) updateOutput(cached, `Sin conexión: se muestra la copia local. ${error.message}`);
      else if (status) status.textContent = `No se pudo preparar el contexto: ${error.message}`;
    }
  }

  async function copyText() {
    const area = $('#aiContextText');
    if (!area?.value) return;
    try {
      await navigator.clipboard.writeText(area.value);
      showFeedback('Contexto completo copiado. Ya puedes pegarlo en un prompt.');
    } catch {
      area.focus();
      area.select();
      document.execCommand('copy');
      showFeedback('Contexto copiado.');
    }
  }

  function downloadText() {
    const area = $('#aiContextText');
    if (!area?.value) return;
    const mode = $('#aiContextMode')?.value || 'complete';
    const extension = mode === 'json' ? 'json' : 'md';
    const mime = mode === 'json' ? 'application/json' : 'text/markdown';
    const url = URL.createObjectURL(new Blob([area.value], { type: `${mime};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `mi-mundo-magico-v2-contexto-ia.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function showFeedback(message) {
    const status = $('#aiContextStatus');
    if (!status) return;
    const previous = status.textContent;
    status.textContent = message;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { if (status.textContent === message) status.textContent = previous; }, 2600);
  }

  function injectStyles() {
    if ($('#aiContextStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiContextStyles';
    style.textContent = `
      .ai-context-grid{display:grid;grid-template-columns:minmax(220px,.42fr) minmax(0,1.58fr);gap:18px;align-items:start}
      .ai-context-guide{position:sticky;top:92px;padding:22px;border-radius:25px;background:linear-gradient(145deg,rgba(116,91,255,.16),rgba(64,207,255,.13));border:1px solid rgba(150,154,255,.25)}
      .ai-context-guide h2{margin:0 0 10px}.ai-context-guide p,.ai-context-guide li{color:var(--muted,#6d7189);line-height:1.55}.ai-context-guide ol{padding-left:20px}
      .ai-context-card{overflow:hidden}.ai-context-toolbar{display:flex;gap:12px;align-items:end;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(120,125,170,.18);flex-wrap:wrap}
      .ai-context-toolbar label{display:grid;gap:6px;font-weight:800;font-size:.82rem}.ai-context-toolbar select{min-width:220px}
      .ai-context-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--muted,#6d7189);font-size:.88rem}.ai-context-meta strong{color:var(--ink,#22243d)}
      .ai-context-text{display:block;width:100%;min-height:70vh;resize:vertical;border:0;border-radius:0 0 22px 22px;padding:22px;background:#11142b;color:#f7f8ff;font:500 .88rem/1.62 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;tab-size:2;outline:none}
      .ai-context-text:focus{box-shadow:inset 0 0 0 2px rgba(124,99,255,.55)}
      @media(max-width:850px){.ai-context-grid{grid-template-columns:1fr}.ai-context-guide{position:static}.ai-context-text{min-height:62vh}.ai-context-toolbar select{min-width:0;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function wire() {
    injectStyles();
    const navButton = $(`#mainNav [data-route="${ROUTE}"]`);
    navButton?.addEventListener('click', () => {
      setTimeout(() => {
        const title = $('#topTitle');
        if (title) title.textContent = 'Contexto para IA';
        fetchLatest();
      }, 0);
    });
    $('#refreshAiContextButton')?.addEventListener('click', () => fetchLatest());
    $('#copyAiContextButton')?.addEventListener('click', copyText);
    $('#downloadAiContextButton')?.addEventListener('click', downloadText);
    $('#aiContextMode')?.addEventListener('change', () => {
      if (latestRow) updateOutput(latestRow, 'Formato actualizado con el canon vigente.');
      else fetchLatest();
    });
    document.addEventListener('input', () => {
      if (!$(`[data-view="${ROUTE}"]`)?.classList.contains('active')) return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => fetchLatest(false), 1400);
    });
    pollingTimer = setInterval(() => {
      if ($(`[data-view="${ROUTE}"]`)?.classList.contains('active') && !document.hidden) fetchLatest(false);
    }, 5000);
    const cached = readCachedRow();
    if (cached) updateOutput(cached, 'Contexto preparado con la última copia local; se actualizará al abrir esta sección.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once: true });
  else wire();
})();
