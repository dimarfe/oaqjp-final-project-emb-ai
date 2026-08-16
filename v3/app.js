(() => {
  'use strict';

  const API = 'https://kfmyyvjkkhwpwubszmec.supabase.co/functions/v1/magic-world-api';
  const WORLD_ID = 'main';
  const TOKEN_KEY = 'mi_mundo_magico_v3_editor';
  const CACHE_KEY = 'mi_mundo_magico_v3_cache';
  const NAME_KEY = 'mi_mundo_magico_v3_name';
  const AI_QUEUE_TOKEN_KEY = 'mi_mundo_magico_v3_ai_queue';
  const AI_SIGNING_JWK_KEY = 'mi_mundo_magico_v3_ai_signing';
  const TOKEN_BUNDLE = {"salt":"S1BXnY4fAP8RW1PnPYPYTA","iv":"guYGpKvxPNaZlcjQ","ciphertext":"lvxCWdvSLzbxEWVqRrYf_HPy3f8a6pK1dQZSZSqheVkeJa2JIpZqgXen750nFIL3sS12RA","iterations":250000,"aad":"Mi Mundo Magico v3|shared-editor-token"};
  const AI_QUEUE_BUNDLE = {"salt":"ZQ6TVMnlPzlzhSSzcpaTig","iv":"e8hgIl4YXj7UJtGS","ciphertext":"iakf2-4FGRvENp16PISXVGuPbTH31qGXObL5mGXxDulGyIbPIIJEZtE3x4WjnDmSCl6Nfg","iterations":250000,"aad":"Mi Mundo Magico v3|ai-queue-token"};
  const AI_SIGNING_BUNDLE = {"salt":"f3iYq8BK54S3Rbkg0FapWw","iv":"_gCn0mXCPQeOR5Ml","ciphertext":"uCoKyaklpkFi7XZB9HpKSNlTu0CJHgcLMKaD16yYLN2lLd6quWcT0t4mLosDYKqUI7_HGNmNIVnSHNPcwRbVUT2eNB5yPbINg7twacwFoXl1rk3SAkwZpXRAHwnDH70W2rUi9ZRrTrZwrZuerJz5WAkAr2v-vad76cLBaiwaJAMslzEDUz17ZFBEkgzB3xQPSIJ0mptgb6iiOVCtO8MJiq76oPlQKigvJYBjnpyCfqLvfc4OXKghD8lkZcqiEb_ifxeMCbcEbpsft-q2okUeTVPSyRlSj_Vgb-oykMG2","iterations":250000,"aad":"Mi Mundo Magico v3|ai-signing-key"};
  const AI_PUBLIC_JWK = {"kty":"EC","crv":"P-256","x":"AjGUa9bWOz6aituC87C9M9CoQhUKrrTwRU59zYiNXrs","y":"lLO4uFFa2SuV3U0neL8Xf801YmsIV2DLHV0gdFYXiQE","key_ops":["verify"],"ext":true};
  const AI_QUEUE_ID = "342261e1-0b67-416d-9d42-9b89a325d3ea";
  const AI_APP = 'Mi mundo Mágico v3';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = (prefix = 'id') => `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const plain = (value) => String(value ?? '').trim();
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let token = sessionStorage.getItem(TOKEN_KEY) || '';
  let aiQueueToken = sessionStorage.getItem(AI_QUEUE_TOKEN_KEY) || '';
  let aiSigningJwk = (() => { try { return JSON.parse(sessionStorage.getItem(AI_SIGNING_JWK_KEY) || 'null'); } catch { return null; } })();
  let aiSigningKey = null;
  let aiWorkerState = null;
  let aiStatusTimer = null;
  const aiResultPollers = new Map();
  let session = null;
  let state = null;
  let revision = 0;
  let lastUpdatedAt = null;
  let lastUpdatedBy = '';
  let currentRoute = 'dashboard';
  let currentCharacter = 0;
  let currentCharacterPanel = 'identity';
  let currentAdventure = 0;
  let selectedSceneItem = null;
  let sceneImages = new Map();
  let remoteSnapshot = null;
  let pollTimer = null;
  let aiConnected = false;
  let ownerAccess = false;
  let libraryAssets = [];
  let patchQueue = new Map();
  let patchTimer = null;
  let flushing = false;
  let toastTimer = null;
  let drag = null;
  let lastLocalEdit = 0;


  const FAMILY_ART_PARTS = ['../chunks/image-00.txt','../chunks/image-01.txt','../chunks/image-02.txt','../chunks/image-03.txt','../chunks/image-04.txt'];
  const CHARACTER_CROPS = {
    elendil: [0.0716,0.0608,0.2279,0.3906],
    feyre:   [0.2148,0.0868,0.2409,0.4080],
    glacial: [0.3646,0.1823,0.1953,0.3299],
    chispa:  [0.4753,0.1736,0.1953,0.3385],
    zeus:    [0.5794,0.1823,0.1953,0.3299],
    riven:   [0.6966,0.1823,0.1953,0.3299],
    sky:     [0.3483,0.4818,0.2051,0.3819]
  };
  let familyArtUrl = '';
  const portraitArt = new Map();

  function characterMediaKey(value = '') {
    const normalized = String(value).toLowerCase();
    return Object.keys(CHARACTER_CROPS).find((key) => normalized.includes(key)) || '';
  }

  function mediaUrl(value, characterName = '') {
    const source = String(value || '');
    if (/^(data:|blob:|https?:)/i.test(source)) return source;
    if (source.includes('hero.webp')) return familyArtUrl || 'assets/icon.svg';
    const key = characterMediaKey(characterName) || characterMediaKey(source);
    return portraitArt.get(key) || (source && !source.includes('/portraits/') && !source.includes('/stickers/') ? source : 'assets/default-avatar.svg');
  }

  function cropPortrait(image, crop) {
    const [x,y,w,h] = crop;
    const canvas = document.createElement('canvas');
    canvas.width = 520; canvas.height = 520;
    const context = canvas.getContext('2d');
    const sx = image.naturalWidth * x, sy = image.naturalHeight * y;
    const sw = image.naturalWidth * w, sh = image.naturalHeight * h;
    const sourceRatio = sw / sh;
    const targetRatio = 1;
    let cx = sx, cy = sy, cw = sw, ch = sh;
    if (sourceRatio > targetRatio) { cw = sh * targetRatio; cx = sx + (sw - cw) / 2; }
    else { ch = sw / targetRatio; cy = sy + (sh - ch) * 0.28; }
    context.fillStyle = '#eef0ff'; context.fillRect(0,0,520,520);
    context.drawImage(image,cx,cy,cw,ch,0,0,520,520);
    return canvas.toDataURL('image/webp',0.86);
  }

  async function loadFamilyArt() {
    try {
      const pieces = await Promise.all(FAMILY_ART_PARTS.map(async (path) => {
        const response = await fetch(new URL(path, location.href), { cache: 'force-cache' });
        if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
        return (await response.text()).replace(/\s+/g,'');
      }));
      familyArtUrl = `data:image/webp;base64,${pieces.join('')}`;
      const image = new Image();
      await new Promise((resolve,reject) => { image.onload=resolve; image.onerror=reject; image.src=familyArtUrl; });
      Object.entries(CHARACTER_CROPS).forEach(([key,crop]) => portraitArt.set(key,cropPortrait(image,crop)));
      $$('[data-family-art]').forEach((node) => { node.src = familyArtUrl; });
      $$('[data-character-art]').forEach((node) => { node.src = portraitArt.get(node.dataset.characterArt) || 'assets/default-avatar.svg'; });
    } catch (error) {
      console.warn('La ilustración familiar no pudo cargarse; la aplicación seguirá funcionando con marcadores.', error);
    }
  }

  const routeTitles = {
    dashboard: 'Mi mundo Mágico v3', characters: 'Personajes', locations: 'Lugares mágicos',
    adventures: 'Aventuras', scene: 'Creador de escenas', studio: 'Estudio creativo',
    library: 'Biblioteca', world: 'Reglas del mundo', owner: 'Ajustes del propietario'
  };

  const characterPanels = {
    identity: [
      ['name', 'Nombre', 'input', 'span-4'], ['title', 'Título mágico', 'input', 'span-4'], ['role', 'Papel en la familia', 'input', 'span-4'],
      ['age', 'Edad o etapa', 'input', 'span-3'], ['colors', 'Colores principales', 'input', 'span-9'],
      ['appearance', 'Aspecto completo', 'textarea', 'full'], ['fixed', 'Detalles que nunca deben cambiar', 'textarea', 'full'],
      ['companion', 'Compañero o criatura mágica', 'textarea', 'full']
    ],
    magic: [
      ['power', 'Poder principal', 'textarea', 'full'], ['magicLook', 'Cómo se ve la magia', 'textarea', 'full'],
      ['weakness', 'Debilidad o coste del poder', 'textarea', 'full'], ['voice', 'Voz', 'input', 'span-6'],
      ['phrase', 'Frase característica', 'input', 'span-6']
    ],
    transform: [
      ['animalForm', 'Animal en el que puede transformarse', 'input', 'span-6'], ['trigger', 'Qué activa la transformación', 'input', 'span-6'],
      ['animalLook', 'Aspecto de la forma animal', 'textarea', 'full'], ['evolution', 'Evolución mágica', 'textarea', 'full'],
      ['evolutionPowers', 'Nuevos poderes al evolucionar', 'textarea', 'full']
    ],
    story: [
      ['personality', 'Personalidad', 'textarea', 'full'], ['history', 'Historia', 'textarea', 'full'],
      ['dream', 'Gran sueño', 'textarea', 'span-6'], ['fear', 'Mayor miedo', 'textarea', 'span-6'],
      ['object', 'Objeto mágico', 'textarea', 'full']
    ]
  };

  const locationFields = [
    ['name', 'Nombre', 'input', 'span-6'], ['type', 'Tipo de lugar', 'input', 'span-6'],
    ['look', 'Qué vemos al llegar', 'textarea', 'full'], ['colors', 'Colores', 'input', 'span-6'], ['weather', 'Clima', 'input', 'span-6'],
    ['magic', 'Magia del lugar', 'textarea', 'full'], ['creatures', 'Criaturas', 'textarea', 'span-6'], ['inhabitants', 'Habitantes', 'textarea', 'span-6'],
    ['buildings', 'Casas y edificios', 'textarea', 'full'], ['secret', 'Lugar o secreto oculto', 'textarea', 'span-6'], ['danger', 'Peligro', 'textarea', 'span-6'],
    ['travel', 'Cómo se llega', 'textarea', 'span-6'], ['unique', 'Qué lo hace único', 'textarea', 'span-6']
  ];

  const adventureFields = [
    ['title', 'Título', 'input', 'span-6'], ['participants', 'Quién participa', 'input', 'span-6'],
    ['summary', 'Resumen', 'textarea', 'full'], ['start', 'Dónde empieza', 'textarea', 'span-6'], ['goal', 'Objetivo', 'textarea', 'span-6'],
    ['obstacle', 'Obstáculo o enemigo', 'textarea', 'span-6'], ['creature', 'Criatura que encuentran', 'textarea', 'span-6'],
    ['object', 'Objeto mágico necesario', 'textarea', 'span-6'], ['fun', 'Momento divertido', 'textarea', 'span-6'],
    ['danger', 'Momento de mayor peligro', 'textarea', 'full'], ['twist', 'Gran sorpresa', 'textarea', 'full'],
    ['ending', 'Cómo termina', 'textarea', 'span-6'], ['next', 'Misterio para la siguiente aventura', 'textarea', 'span-6']
  ];

  const worldFields = [
    ['name', 'Nombre del mundo', 'input', 'span-6'], ['tagline', 'Frase del mundo', 'input', 'span-6'],
    ['description', 'Cómo es este universo', 'textarea', 'full'], ['magicRules', 'Reglas de la magia', 'textarea', 'full'],
    ['visualStyle', 'Estilo de ilustración', 'textarea', 'full'], ['cinematicStyle', 'Estilo para vídeo', 'textarea', 'full'],
    ['forbidden', 'Elementos que no deben aparecer o cambiar', 'textarea', 'full'], ['safety', 'Reglas de seguridad y tono familiar', 'textarea', 'full']
  ];

  const backgrounds = [
    { id: 'castle', label: 'Siete Torres', emoji: '🏰' }, { id: 'forest', label: 'Bosque vivo', emoji: '🌳' },
    { id: 'ice', label: 'Valle helado', emoji: '❄️' }, { id: 'fire', label: 'Isla de fuego', emoji: '🌋' },
    { id: 'sea', label: 'Palacio marino', emoji: '🌊' }, { id: 'stars', label: 'Tren estelar', emoji: '🌌' }
  ];
  const props = [
    ['star', '⭐'], ['flower', '🌸'], ['tree', '🌳'], ['crystal', '💎'], ['train', '🚂'], ['portal', '🌀'],
    ['cloud', '☁️'], ['lightning', '⚡'], ['fire', '🔥'], ['snow', '❄️'], ['wave', '🌊'], ['book', '📖'],
    ['castle', '🏰'], ['heart', '💜'], ['moon', '🌙'], ['sun', '☀️']
  ];

  function getPath(root, path) {
    return path.reduce((value, key) => value == null ? undefined : value[key], root);
  }
  function setPath(root, path, value) {
    let node = root;
    path.forEach((key, index) => {
      const last = index === path.length - 1;
      if (last) node[key] = value;
      else {
        const nextKey = path[index + 1];
        if (node[key] == null) node[key] = /^\d+$/.test(nextKey) ? [] : {};
        node = node[key];
      }
    });
  }
  function pathArray(pathString) {
    return String(pathString).split('.').filter(Boolean);
  }
  function valueFromInput(input) {
    if (input.type === 'checkbox') return input.checked;
    if (input.dataset.number === 'true') return Number(input.value);
    return input.value;
  }
  function localCache() {
    if (!state) return;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ state, revision, lastUpdatedAt, lastUpdatedBy }));
  }
  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
  }

  function base64UrlBytes(value) {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  function base64UrlString(bytes) {
    let binary = '';
    const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let index = 0; index < array.length; index += 0x8000) {
      binary += String.fromCharCode(...array.subarray(index, index + 0x8000));
    }
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
  }

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  async function decryptSecretBundle(bundle, password) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: base64UrlBytes(bundle.salt), iterations: bundle.iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64UrlBytes(bundle.iv), additionalData: new TextEncoder().encode(bundle.aad) },
      key,
      base64UrlBytes(bundle.ciphertext)
    );
    return new TextDecoder().decode(decrypted);
  }

  async function unlockSharedToken(password) {
    return decryptSecretBundle(TOKEN_BUNDLE, password);
  }

  async function unlockAiSession(password) {
    const queueToken = await decryptSecretBundle(AI_QUEUE_BUNDLE, password);
    const signingText = await decryptSecretBundle(AI_SIGNING_BUNDLE, password);
    const signingJwk = JSON.parse(signingText);
    const signingKey = await crypto.subtle.importKey(
      'jwk',
      signingJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    aiQueueToken = queueToken;
    aiSigningJwk = signingJwk;
    aiSigningKey = signingKey;
    sessionStorage.setItem(AI_QUEUE_TOKEN_KEY, aiQueueToken);
    sessionStorage.setItem(AI_SIGNING_JWK_KEY, JSON.stringify(aiSigningJwk));
  }

  async function restoreAiSession() {
    if (!aiQueueToken || !aiSigningJwk) return false;
    try {
      aiSigningKey = await crypto.subtle.importKey(
        'jwk',
        aiSigningJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
      return true;
    } catch {
      aiQueueToken = '';
      aiSigningJwk = null;
      aiSigningKey = null;
      sessionStorage.removeItem(AI_QUEUE_TOKEN_KEY);
      sessionStorage.removeItem(AI_SIGNING_JWK_KEY);
      return false;
    }
  }

  async function api(action, options = {}) {
    const method = options.method || 'GET';
    const query = new URLSearchParams({ action, ...(options.query || {}) });
    const headers = { ...(options.headers || {}) };
    let body;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${API}?${query}`, { method, headers, body, cache: 'no-store', keepalive: !!options.keepalive });
    const contentType = response.headers.get('content-type') || '';
    let payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = payload?.error || payload?.message || `Error ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function fetchSharedRow() {
    if (!token) throw new Error('La puerta del mundo está cerrada.');
    return api('get', { query: { token } });
  }

  async function writeSharedRow(nextState) {
    const bytes = new TextEncoder().encode(JSON.stringify(nextState)).length;
    if (bytes > 820000) throw new Error('El mundo compartido se está haciendo demasiado grande. Elimina algunas creaciones de la Biblioteca.');
    return api('update', {
      method: 'PUT',
      body: {
        editor_token: token,
        author_name: session?.display_name || 'Familia',
        world_name: nextState.world?.name || 'Mi mundo Mágico v3',
        data: nextState,
        generated_document: ''
      }
    });
  }

  function showToast(message, type = '') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`.trim();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.className = 'toast', 3300);
  }
  function setLoginStatus(message, error = false) {
    const el = $('#loginStatus');
    el.textContent = message;
    el.classList.toggle('error', error);
  }
  function syncStatus(mode, detail = '') {
    const dot = $('#syncDot');
    const title = $('#syncText');
    const line = $('#syncDetail');
    if (!dot || !title || !line) return;
    dot.className = `sync-dot ${mode}`;
    const labels = {
      connected: 'Todo está compartido', saving: 'Guardando cambios…', offline: 'Sin conexión',
      error: 'No se pudo sincronizar', loading: 'Conectando…'
    };
    title.textContent = labels[mode] || labels.connected;
    line.textContent = detail || (mode === 'connected' ? 'Los cambios se guardan automáticamente.' : '');
  }
  function formatDate(value) {
    if (!value) return 'Ahora mismo';
    try { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
    catch { return value; }
  }

  async function login(name, password) {
    setLoginStatus('Abriendo la puerta mágica…');
    try {
      const editorToken = await unlockSharedToken(password);
      if (!/^[0-9a-f-]{36}$/i.test(editorToken)) throw new Error('Contraseña incorrecta.');
      await unlockAiSession(password);
      if (!/^[0-9a-f-]{36}$/i.test(aiQueueToken) || !aiSigningKey) throw new Error('No se pudo abrir el estudio de IA.');
      token = editorToken;
      sessionStorage.setItem(TOKEN_KEY, token);
      session = { display_name: plain(name).slice(0, 40) || 'Aventurero/a' };
      localStorage.setItem(NAME_KEY, session.display_name);
      const row = await fetchSharedRow();
      await enterApp(row);
    } catch (error) {
      token = '';
      aiQueueToken = '';
      aiSigningJwk = null;
      aiSigningKey = null;
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(AI_QUEUE_TOKEN_KEY);
      sessionStorage.removeItem(AI_SIGNING_JWK_KEY);
      setLoginStatus('La contraseña no abre esta puerta.', true);
    }
  }

  async function resumeSession() {
    if (!token) return null;
    try {
      session = { display_name: localStorage.getItem(NAME_KEY) || 'Aventurero/a' };
      if (!await restoreAiSession()) throw new Error('La sesión de IA ha caducado.');
      return await fetchSharedRow();
    } catch {
      token = '';
      aiQueueToken = '';
      aiSigningJwk = null;
      aiSigningKey = null;
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(AI_QUEUE_TOKEN_KEY);
      sessionStorage.removeItem(AI_SIGNING_JWK_KEY);
      return null;
    }
  }

  async function enterApp(initialRow = null) {
    $('#loginScreen').classList.add('hidden');
    $('#appShell').classList.remove('hidden');
    syncStatus('loading', 'Descargando el canon compartido…');
    const cached = readCache();
    if (cached?.state) {
      state = cached.state;
      revision = Number(cached.revision || state?._sync?.revision || 0);
      lastUpdatedAt = cached.lastUpdatedAt;
      lastUpdatedBy = cached.lastUpdatedBy || '';
      renderAll();
    }
    if (initialRow) applySnapshot(initialRow, true);
    else await loadState(true);
    await checkAi();
    startPolling();
  }

  async function loadState(force = false) {
    try {
      const result = await fetchSharedRow();
      const remoteRevision = Number(result.data?._sync?.revision || 0);
      if (!force && remoteRevision === revision && result.updated_at === lastUpdatedAt) {
        syncStatus('connected', `Versión ${revision} · sin cambios nuevos`);
        return;
      }
      applySnapshot(result, true);
    } catch (error) {
      syncStatus(navigator.onLine ? 'error' : 'offline', error.message);
      if (!state) {
        const cached = readCache();
        if (cached?.state) {
          state = cached.state;
          revision = Number(cached.revision || state?._sync?.revision || 0);
          renderAll();
          showToast('Mostrando la última copia disponible. La edición compartida volverá al recuperar conexión.', 'error');
        } else {
          logout(false);
          setLoginStatus('No se pudo descargar el mundo. Comprueba la conexión e inténtalo de nuevo.', true);
        }
      }
    }
  }

  function applySnapshot(result, render = true) {
    state = result.data;
    revision = Number(state?._sync?.revision || 0);
    lastUpdatedAt = result.updated_at || state?._sync?.updatedAt || new Date().toISOString();
    lastUpdatedBy = state?._sync?.updatedBy || result.author_name || '';
    remoteSnapshot = null;
    $('#remoteBanner')?.classList.add('hidden');
    localCache();
    if (render) renderAll();
    syncStatus('connected', `Versión ${revision} · ${lastUpdatedBy ? `último cambio de ${lastUpdatedBy}` : 'actualizada'}`);
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(pollState, 2600);
    window.addEventListener('online', () => { syncStatus('loading', 'Reconectando…'); pollState(); });
    window.addEventListener('offline', () => syncStatus('offline', 'Los cambios esperarán hasta recuperar conexión.'));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pollState(); });
  }

  async function pollState() {
    if (!token || flushing || document.hidden) return;
    try {
      const result = await fetchSharedRow();
      const remoteRevision = Number(result.data?._sync?.revision || 0);
      if (remoteRevision === revision && result.updated_at === lastUpdatedAt) return;
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || patchQueue.size > 0 || Date.now() - lastLocalEdit < 900;
      if (editing) {
        remoteSnapshot = result;
        $('#remoteBanner').classList.remove('hidden');
      } else {
        applySnapshot(result, true);
        showToast(`${result.data?._sync?.updatedBy || 'Alguien'} ha actualizado el mundo.`);
      }
    } catch (error) {
      syncStatus(navigator.onLine ? 'error' : 'offline', error.message);
    }
  }

  function queuePatch(path, value, delay = 600) {
    if (!state) return;
    setPath(state, path, value);
    lastLocalEdit = Date.now();
    localCache();
    patchQueue.set(path.join('.'), { path, value: clone(value) });
    syncStatus('saving', `${patchQueue.size} cambio${patchQueue.size === 1 ? '' : 's'} pendiente${patchQueue.size === 1 ? '' : 's'}`);
    clearTimeout(patchTimer);
    patchTimer = setTimeout(flushPatches, delay);
    updateLightweightStats();
  }

  async function flushPatches() {
    if (flushing || !patchQueue.size || !token) return;
    flushing = true;
    const batch = [...patchQueue.values()];
    patchQueue.clear();
    clearTimeout(patchTimer);
    try {
      let row = await fetchSharedRow();
      let merged = clone(row.data || state || {});
      for (const patch of batch) setPath(merged, patch.path, clone(patch.value));
      const remoteRevision = Number(merged?._sync?.revision || 0);
      merged._sync = {
        ...(merged._sync || {}),
        revision: Math.max(remoteRevision, revision) + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: session?.display_name || 'Familia',
        app: 'Mi mundo Mágico v3'
      };
      await writeSharedRow(merged);
      const verification = await fetchSharedRow();
      state = verification.data;
      revision = Number(state?._sync?.revision || merged._sync.revision);
      lastUpdatedAt = verification.updated_at || merged._sync.updatedAt;
      lastUpdatedBy = state?._sync?.updatedBy || session?.display_name || '';
      localCache();
      syncStatus('connected', `Versión ${revision} · guardado automáticamente`);
      $('#lastUpdate').textContent = `Último cambio: ${formatDate(lastUpdatedAt)}${lastUpdatedBy ? ` · ${lastUpdatedBy}` : ''}`;
    } catch (error) {
      batch.forEach((patch) => patchQueue.set(patch.path.join('.'), patch));
      syncStatus(navigator.onLine ? 'error' : 'offline', error.message || 'Los cambios siguen pendientes.');
      clearTimeout(patchTimer);
      patchTimer = setTimeout(flushPatches, 3500);
    } finally {
      flushing = false;
    }
  }

  function logout(showMessage = false) {
    token = '';
    aiQueueToken = '';
    aiSigningJwk = null;
    aiSigningKey = null;
    session = null;
    clearInterval(pollTimer);
    clearInterval(aiStatusTimer);
    aiResultPollers.forEach((timer) => clearTimeout(timer));
    aiResultPollers.clear();
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(AI_QUEUE_TOKEN_KEY);
    sessionStorage.removeItem(AI_SIGNING_JWK_KEY);
    $('#appShell').classList.add('hidden');
    $('#loginScreen').classList.remove('hidden');
    $('#loginPassword').value = '';
    if (showMessage) setLoginStatus('La sesión ha terminado. Vuelve a escribir la contraseña.', true);
  }

  function navigate(route) {
    if (route === 'owner' && !ownerAccess) return;
    currentRoute = route;
    $$('.app-view').forEach((view) => view.classList.toggle('active', view.dataset.view === route));
    $$('#mainNav button').forEach((button) => button.classList.toggle('active', button.dataset.route === route));
    $('#topTitle').textContent = routeTitles[route] || 'Mi mundo Mágico v3';
    $('#sidebar').classList.remove('open');
    if (route === 'scene') requestAnimationFrame(renderScene);
    if (route === 'studio') { renderStudioSelectors(); checkAi(); }
    if (route === 'library') loadLibrary();
    if (route === 'world') renderWorld();
    if (route === 'owner') renderOwner();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderAll() {
    if (!state) return;
    $('#sideWorldName').textContent = state.world?.name || 'Mi mundo Mágico v3';
    $('#lastUpdate').textContent = `Último cambio: ${formatDate(lastUpdatedAt)}${lastUpdatedBy ? ` · ${lastUpdatedBy}` : ''}`;
    renderDashboard();
    renderCharacters();
    renderLocations();
    renderAdventures();
    renderSceneTools();
    renderStudioSelectors();
    renderWorld();
    if (currentRoute === 'scene') renderScene();
  }

  function completionPercent() {
    const keys = ['appearance', 'power', 'personality', 'animalForm', 'evolution', 'history'];
    const total = Math.max(1, (state.characters || []).length * keys.length);
    const filled = (state.characters || []).reduce((sum, c) => sum + keys.filter((key) => plain(c[key]).length > 10).length, 0);
    return Math.round(filled / total * 100);
  }

  function renderDashboard() {
    const chars = state.characters || [];
    const stats = [
      ['🧙', chars.length, 'personajes'], ['🏰', (state.locations || []).length, 'lugares'],
      ['📖', (state.adventures || []).length, 'aventuras'], ['✨', `${completionPercent()}%`, 'canon completado']
    ];
    $('#dashboardStats').innerHTML = stats.map(([icon, number, label]) => `<div class="stat-card"><span class="stat-icon">${icon}</span><div><strong>${number}</strong><span>${label}</span></div></div>`).join('');
    $('#dashboardCharacters').innerHTML = chars.map((c, index) => `<button class="portrait-card" data-character-index="${index}"><img src="${escapeHtml(mediaUrl(c.portrait, c.name))}" alt="${escapeHtml(c.name)}"><div><b>${escapeHtml(c.name)}</b><span>${escapeHtml(c.title || c.power)}</span></div></button>`).join('');
    $('#activityText').textContent = lastUpdatedAt ? `El último cambio se guardó ${formatDate(lastUpdatedAt)}. Todos editáis la versión ${revision}.` : 'Cada cambio se envía al mundo común sin tener que pulsar Guardar.';
    $('#activityPerson').textContent = lastUpdatedBy || session?.display_name || '—';
  }

  function updateLightweightStats() {
    if (!state) return;
    const stat = $$('#dashboardStats .stat-card strong');
    if (stat.length >= 4) {
      stat[0].textContent = (state.characters || []).length;
      stat[1].textContent = (state.locations || []).length;
      stat[2].textContent = (state.adventures || []).length;
      stat[3].textContent = `${completionPercent()}%`;
    }
    $('#sideWorldName').textContent = state.world?.name || 'Mi mundo Mágico v3';
  }

  function renderCharacters() {
    const chars = state.characters || [];
    if (!chars.length) return;
    currentCharacter = Math.min(currentCharacter, chars.length - 1);
    $('#characterTabs').innerHTML = chars.map((c, index) => `<button class="character-tab ${index === currentCharacter ? 'active' : ''}" data-char-index="${index}"><img src="${escapeHtml(mediaUrl(c.portrait, c.name))}" alt=""><div><b>${escapeHtml(c.name)}</b><span>${escapeHtml(c.title || c.power || 'Nuevo personaje')}</span></div></button>`).join('');
    renderCharacterEditor();
  }

  function renderCharacterEditor() {
    const char = state.characters?.[currentCharacter];
    if (!char) return;
    $('#characterProfile').innerHTML = `<div class="profile-image"><img src="${escapeHtml(mediaUrl(char.portrait, char.name))}" alt="Retrato de ${escapeHtml(char.name)}"><div class="profile-gradient"></div><div class="profile-name"><span>${escapeHtml(char.role || 'Personaje mágico')}</span><h2>${escapeHtml(char.name)}</h2><p>${escapeHtml(char.title || '')}</p></div></div><div class="profile-facts"><div class="profile-fact"><i>⚡</i><div><b>Poder</b><span>${escapeHtml(char.power || 'Pendiente')}</span></div></div><div class="profile-fact"><i>🐾</i><div><b>Transformación</b><span>${escapeHtml(char.animalForm || 'Pendiente')}</span></div></div><div class="profile-fact"><i>🐉</i><div><b>Compañero</b><span>${escapeHtml(char.companion || 'Pendiente')}</span></div></div><div class="profile-fact"><i>🎨</i><div><b>Colores</b><span>${escapeHtml(char.colors || 'Pendiente')}</span></div></div></div><div class="profile-actions"><button class="button button-soft button-small" data-char-prompt="image">Prompt visual</button><button class="button button-soft button-small" data-char-prompt="sheet">Ficha rápida</button>${char.locked ? '' : '<button class="button button-danger button-small" data-delete-character>Eliminar</button>'}</div>`;
    $$('#characterEditorTabs button').forEach((button) => button.classList.toggle('active', button.dataset.panel === currentCharacterPanel));
    const fields = characterPanels[currentCharacterPanel];
    $('#characterForm').innerHTML = fields.map(([key, label, type, span]) => fieldHtml(`characters.${currentCharacter}.${key}`, label, char[key], type, span)).join('');
    bindStateInputs($('#characterForm'));
  }

  function fieldHtml(path, label, value, type = 'input', span = 'span-6', options = null) {
    const id = `field-${path.replace(/[^a-z0-9]+/gi, '-')}`;
    let control;
    if (type === 'textarea') control = `<textarea id="${id}" data-path="${escapeHtml(path)}">${escapeHtml(value)}</textarea>`;
    else if (type === 'select') control = `<select id="${id}" data-path="${escapeHtml(path)}">${options.map((o) => `<option value="${escapeHtml(o.value ?? o)}" ${String(o.value ?? o) === String(value) ? 'selected' : ''}>${escapeHtml(o.label ?? o)}</option>`).join('')}</select>`;
    else control = `<input id="${id}" data-path="${escapeHtml(path)}" value="${escapeHtml(value)}">`;
    return `<div class="field ${span}"><label for="${id}">${escapeHtml(label)}</label>${control}</div>`;
  }

  function bindStateInputs(root) {
    $$('[data-path]', root).forEach((input) => {
      if (input.dataset.bound) return;
      input.dataset.bound = '1';
      input.addEventListener('input', () => queuePatch(pathArray(input.dataset.path), valueFromInput(input)));
      input.addEventListener('change', () => queuePatch(pathArray(input.dataset.path), valueFromInput(input)));
    });
  }

  function renderLocations() {
    const locations = state.locations || [];
    $('#locationsList').innerHTML = locations.map((location, index) => `<article class="location-card"><div class="location-visual location-${['violet','green','blue','orange','pink'][index%5]}"><span>${location.emoji || ['🏰','🌳','🌊','🌋','🌌'][index%5]}</span><div><b>${escapeHtml(location.type || 'Lugar mágico')}</b><h2>${escapeHtml(location.name || 'Lugar sin nombre')}</h2></div></div><div class="location-form form-grid">${locationFields.map(([key,label,type,span])=>fieldHtml(`locations.${index}.${key}`,label,location[key],type,span)).join('')}<div class="field full location-actions"><button class="button button-danger button-small" data-delete-location="${index}">Eliminar lugar</button></div></div></article>`).join('');
    bindStateInputs($('#locationsList'));
  }

  function addLocation() {
    const next = clone(state.locations || []);
    next.push({ id: uid('loc'), name:'Nuevo lugar', type:'Lugar mágico', emoji:'🗺️', look:'', colors:'', weather:'', magic:'', creatures:'', inhabitants:'', buildings:'', secret:'', danger:'', travel:'', unique:'' });
    state.locations = next;
    queuePatch(['locations'], next, 0);
    renderLocations();
  }

  function renderAdventures() {
    const adventures = state.adventures || [];
    if (!adventures.length) return;
    currentAdventure = Math.min(currentAdventure, adventures.length - 1);
    $('#adventureList').innerHTML = adventures.map((a,index)=>`<button class="adventure-item ${index===currentAdventure?'active':''}" data-adventure-index="${index}"><span>${index+1}</span><div><b>${escapeHtml(a.title||'Aventura')}</b><small>${escapeHtml(a.summary||'Historia por inventar')}</small></div></button>`).join('');
    const adventure = adventures[currentAdventure];
    $('#adventureForm').innerHTML = adventureFields.map(([key,label,type,span])=>fieldHtml(`adventures.${currentAdventure}.${key}`,label,adventure[key],type,span)).join('')+`<div class="field full"><button class="button button-danger button-small" data-delete-adventure="${currentAdventure}">Eliminar aventura</button></div>`;
    bindStateInputs($('#adventureForm'));
  }

  function addAdventure() {
    const next = clone(state.adventures || []);
    next.push({ id:uid('adv'), title:'Nueva aventura', participants:'', summary:'', start:'', goal:'', obstacle:'', creature:'', object:'', fun:'', danger:'', twist:'', ending:'', next:'' });
    state.adventures = next; currentAdventure=next.length-1; queuePatch(['adventures'],next,0); renderAdventures();
  }

  function renderWorld() {
    if (!state?.world) return;
    $('#worldForm').innerHTML = worldFields.map(([key,label,type,span])=>fieldHtml(`world.${key}`,label,state.world[key],type,span)).join('');
    bindStateInputs($('#worldForm'));
  }

  function renderSceneTools() {
    if (!state?.scene) return;
    $('#backgroundPicker').innerHTML = backgrounds.map((bg)=>`<button class="background-choice ${state.scene.background===bg.id?'active':''}" data-background="${bg.id}"><span>${bg.emoji}</span>${bg.label}</button>`).join('');
    $('#sceneCharacterPicker').innerHTML = (state.characters||[]).map((c)=>`<button class="sticker-choice" data-add-character="${escapeHtml(c.id)}"><img src="${escapeHtml(mediaUrl(c.sticker || c.portrait, c.name))}" alt=""><span>${escapeHtml(c.name)}</span></button>`).join('');
    $('#propPicker').innerHTML = props.map(([id,emoji])=>`<button data-add-prop="${id}">${emoji}</button>`).join('');
    bindStateInputs($('#sceneView'));
  }

  function sceneBackground(ctx, id, width, height) {
    const gradients = {
      castle:['#7669ff','#a77cf8','#ffb15a'], forest:['#47c88c','#bfe17c','#fff0a3'], ice:['#6ccff4','#dff8ff','#8e8bff'],
      fire:['#ff7757','#ffbd60','#5d316c'], sea:['#2d8bd5','#60d7dd','#ddfaff'], stars:['#151d58','#563e9c','#f08cda']
    };
    const colors=gradients[id]||gradients.castle;
    const gradient=ctx.createLinearGradient(0,0,width,height);colors.forEach((c,i)=>gradient.addColorStop(i/(colors.length-1),c));ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
    ctx.globalAlpha=.3;for(let i=0;i<30;i++){ctx.fillStyle=i%3===0?'#fff':'#ffe795';ctx.beginPath();ctx.arc((i*147)%width,(i*79)%height,2+(i%4),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    if(id==='castle'){for(let i=0;i<7;i++){const x=120+i*155;const h=210+(i%3)*55;ctx.fillStyle='rgba(40,36,93,.48)';ctx.fillRect(x,height-h,92,h);ctx.beginPath();ctx.moveTo(x-10,height-h);ctx.lineTo(x+46,height-h-80);ctx.lineTo(x+102,height-h);ctx.fill();}}
    if(id==='forest'){ctx.fillStyle='rgba(32,99,74,.42)';for(let i=0;i<10;i++){const x=i*135;ctx.fillRect(x,height-230,30,230);ctx.beginPath();ctx.arc(x+15,height-230,80,0,Math.PI*2);ctx.fill();}}
    if(id==='ice'){ctx.fillStyle='rgba(255,255,255,.34)';ctx.beginPath();ctx.moveTo(0,height);for(let x=0;x<=width;x+=140)ctx.lineTo(x,height-100-(x/140%2)*70);ctx.lineTo(width,height);ctx.fill();}
    if(id==='fire'){ctx.fillStyle='rgba(70,29,68,.46)';ctx.beginPath();ctx.moveTo(0,height);for(let x=0;x<=width;x+=160)ctx.lineTo(x,height-140-(x/160%3)*50);ctx.lineTo(width,height);ctx.fill();}
    if(id==='sea'){ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=8;for(let y=height-180;y<height;y+=55){ctx.beginPath();for(let x=0;x<=width;x+=40)ctx.lineTo(x,y+Math.sin(x/60)*16);ctx.stroke();}}
    if(id==='stars'){ctx.strokeStyle='rgba(255,230,160,.5)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-20,height-120);ctx.bezierCurveTo(width*.3,height-340,width*.65,height+20,width+30,height-210);ctx.stroke();}
  }

  async function loadSceneImages() {
    const wanted = new Map();
    for (const character of state.characters || []) {
      const url = mediaUrl(character.sticker || character.portrait, character.name);
      if (url) wanted.set(character.id,url);
    }
    const jobs=[];
    for(const [id,url] of wanted){if(sceneImages.get(id)?.src===url)continue;const image=new Image();image.crossOrigin='anonymous';jobs.push(new Promise(resolve=>{image.onload=()=>{sceneImages.set(id,image);resolve();};image.onerror=()=>resolve();image.src=url;}));}
    await Promise.all(jobs);
  }

  async function renderScene() {
    if (!state?.scene) return;
    await loadSceneImages();
    const canvas=$('#sceneCanvas');if(!canvas)return;const ctx=canvas.getContext('2d');sceneBackground(ctx,state.scene.background,canvas.width,canvas.height);
    for(const item of state.scene.items||[])drawSceneItem(ctx,item);
    if(state.scene.speech){ctx.font='800 27px ui-rounded, sans-serif';const text=String(state.scene.speech).slice(0,100);const metrics=ctx.measureText(text);const w=Math.min(canvas.width-80,metrics.width+55);ctx.fillStyle='rgba(255,255,255,.94)';roundRect(ctx,(canvas.width-w)/2,28,w,62,25);ctx.fill();ctx.fillStyle='#2c3150';ctx.textAlign='center';ctx.fillText(text,canvas.width/2,68);}
    const selected=(state.scene.items||[]).find(x=>x.id===selectedSceneItem);if(selected){const b=sceneItemBox(selected);ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.setLineDash([10,8]);ctx.strokeRect(b.x,b.y,b.width,b.height);ctx.setLineDash([]);$('#sceneScale').value=selected.scale;$('#sceneRotation').value=selected.rotation||0;}
  }

  function roundRect(ctx,x,y,w,h,r){const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();}

  function sceneItemBox(item){const base=item.type==='character'?250:100;const width=base*item.scale;const height=(item.type==='character'?310:100)*item.scale;return{x:item.x*1200-width/2,y:item.y*720-height/2,width,height};}
  function drawSceneItem(ctx,item){const b=sceneItemBox(item);ctx.save();ctx.translate(b.x+b.width/2,b.y+b.height/2);ctx.rotate((item.rotation||0)*Math.PI/180);if(item.type==='character'){const image=sceneImages.get(item.ref);if(image){ctx.shadowColor='rgba(20,24,52,.3)';ctx.shadowBlur=18;ctx.drawImage(image,-b.width/2,-b.height/2,b.width,b.height);}else{ctx.fillStyle='#fff';ctx.font=`${80*item.scale}px serif`;ctx.textAlign='center';ctx.fillText('🧙',0,25);}}else{const prop=props.find(([id])=>id===item.ref);ctx.font=`${85*item.scale}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(20,24,52,.28)';ctx.shadowBlur=15;ctx.fillText(prop?.[1]||'✨',0,0);}ctx.restore();}

  function sceneThumbnail() { const canvas=$('#sceneCanvas');return canvas.toDataURL('image/jpeg',.65); }

  function imageThumbnail(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('El archivo no parece una imagen válida.'));
        image.onload = () => {
          const maxW = 640, maxH = 420;
          const scale = Math.min(maxW / image.width, maxH / image.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', .7));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function createLocalVideo() {
    const output = $('#videoOutput');
    const seconds = Number($('#videoSeconds').value || 8);
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      showStoryboardOutput(localStoryboard(), buildVideoPrompt());
      showToast('Este navegador no permite exportar vídeo. Se ha creado un storyboard.', 'error');
      return;
    }
    output.innerHTML = '<div class="video-making"><div><b>🎬</b><h3>Animando la escena compartida…</h3><p>No cierres esta pestaña hasta que termine el clip.</p></div></div>';
    renderScene();
    const source = $('#sceneCanvas');
    const vertical = $('#videoSize').value === '720x1280';
    const canvas = document.createElement('canvas');
    canvas.width = vertical ? 720 : 1280;
    canvas.height = vertical ? 1280 : 720;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const mime = ['video/mp4;codecs=h264','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find((type) => MediaRecorder.isTypeSupported(type)) || '';
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 3_000_000 } : { videoBitsPerSecond: 3_000_000 });
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
    const finished = new Promise((resolve, reject) => {
      recorder.onerror = () => reject(new Error('No se pudo crear el vídeo.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mime || 'video/webm' }));
    });
    recorder.start(250);
    const start = performance.now();
    await new Promise((resolve) => {
      const frame = (now) => {
        const progress = Math.min(1, (now - start) / (seconds * 1000));
        const pulse = Math.sin(progress * Math.PI * 2);
        const zoom = 1.015 + progress * .055;
        const srcRatio = source.width / source.height;
        const dstRatio = canvas.width / canvas.height;
        let sw = source.width, sh = source.height, sx = 0, sy = 0;
        if (srcRatio > dstRatio) { sw = source.height * dstRatio; sx = (source.width - sw) * (.45 + .1 * progress); }
        else { sh = source.width / dstRatio; sy = (source.height - sh) * .5; }
        const dw = canvas.width * zoom, dh = canvas.height * zoom;
        ctx.fillStyle = '#15162f'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(source, sx, sy, sw, sh, (canvas.width-dw)/2 + pulse*5, (canvas.height-dh)/2, dw, dh);
        for (let i=0;i<22;i++) {
          const x = (i * 97 + progress * (80 + i*4)) % canvas.width;
          const y = (i * 173 + progress * (140 + i*7)) % canvas.height;
          ctx.globalAlpha = .3 + .55 * Math.abs(Math.sin(progress * 9 + i));
          ctx.fillStyle = i % 3 === 0 ? '#ffd467' : '#ffffff';
          ctx.beginPath(); ctx.arc(x,y,2+(i%4),0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (progress < .12 || progress > .82) {
          const alpha = progress < .12 ? Math.min(1, progress/.05) : Math.max(0,(1-progress)/.08);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = 'rgba(15,18,48,.62)'; ctx.fillRect(0, canvas.height-120, canvas.width, 120);
          ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.font = `900 ${vertical?34:40}px ui-rounded, sans-serif`;
          ctx.fillText(state.scene.title || 'Mi mundo Mágico v3', canvas.width/2, canvas.height-65);
          ctx.globalAlpha=1;
        }
        if (progress < 1) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    recorder.stop();
    const blob = await finished;
    const url = URL.createObjectURL(blob);
    const extension = (blob.type || '').includes('mp4') ? 'mp4' : 'webm';
    const title = plain($('#videoIdea').value).slice(0, 70) || state.scene.title || 'Vídeo de Mi Mundo Mágico';
    output.innerHTML = `<div class="output-toolbar"><a class="button button-primary button-small" id="downloadLocalVideo" download="${safeFileName(title)}.${extension}">Descargar vídeo</a><button class="button button-soft button-small" id="saveVideoReference">Guardar referencia</button></div><video class="output-image" id="localVideoPreview" controls playsinline></video><div class="output-document">${escapeHtml(buildVideoPrompt())}</div>`;
    $('#localVideoPreview').src = url;
    $('#downloadLocalVideo').href = url;
    $('#saveVideoReference').addEventListener('click', () => saveDataAsset('video', title, '', blob.type || 'video/webm', { description: 'Vídeo animado creado localmente. El archivo completo se descargó en el dispositivo.', prompt: buildVideoPrompt(), seconds, format: $('#videoSize').value }));
    showToast('Vídeo animado terminado. Pulsa Descargar vídeo para guardarlo.');
  }

  function addSceneItem(type, ref) {
    const items = clone(state.scene.items || []);
    items.push({ id: uid('scene'), type, ref, x: .5 + (Math.random()-.5)*.18, y: type === 'character' ? .55 : .42, scale: type === 'character' ? .62 : .75, rotation: 0 });
    state.scene.items = items;
    selectedSceneItem = items.at(-1).id;
    queuePatch(['scene','items'], items, 300);
    renderScene();
  }

  function scenePointer(event) {
    const canvas = $('#sceneCanvas');
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * canvas.width, y: (event.clientY - rect.top) / rect.height * canvas.height };
  }

  function onScenePointerDown(event) {
    const point = scenePointer(event);
    const items = state.scene.items || [];
    let hit = null;
    for (let i=items.length-1;i>=0;i--) {
      const box = sceneItemBox(items[i]);
      if (point.x>=box.x && point.x<=box.x+box.width && point.y>=box.y && point.y<=box.y+box.height) { hit=items[i]; break; }
    }
    selectedSceneItem = hit?.id || null;
    if (hit) {
      drag = { id: hit.id, dx: point.x / 1200 - hit.x, dy: point.y / 720 - hit.y };
      $('#sceneCanvas').setPointerCapture(event.pointerId);
    }
    renderScene();
  }
  function onScenePointerMove(event) {
    if (!drag) return;
    const point = scenePointer(event);
    const item = state.scene.items.find((x) => x.id === drag.id);
    if (!item) return;
    item.x = Math.max(.03, Math.min(.97, point.x/1200 - drag.dx));
    item.y = Math.max(.08, Math.min(.94, point.y/720 - drag.dy));
    renderScene();
  }
  function onScenePointerUp() {
    if (!drag) return;
    drag = null;
    queuePatch(['scene','items'], state.scene.items, 250);
  }

  function buildScenePrompt() {
    const names = (state.scene.items || []).map((item) => item.type === 'character' ? state.characters.find((c) => c.id === item.ref)?.name : props.find(([id]) => id === item.ref)?.[1]).filter(Boolean);
    return `Crea una ilustración familiar original de fantasía juvenil, con estética de juego 2D de mundo abierto y casa de muñecas: formas redondeadas, colores vivos, expresiones claras y detalles mágicos. No copies personajes, logotipos ni diseños de ninguna franquicia.\n\nESCENA: ${state.scene.title}.\nESCENARIO: ${backgrounds.find((x)=>x.id===state.scene.background)?.label || state.scene.background}.\nPERSONAJES Y OBJETOS: ${names.join(', ')}.\nTEXTO O ACCIÓN: ${state.scene.speech || 'La familia explora el lugar.'}\n\nCANON VISUAL: ${state.world.visualStyle}\nMantener exactamente los rasgos, poderes, colores y edades aparentes definidos en el canon de cada personaje.`;
  }

  function renderStudioSelectors() {
    if (!state) return;
    const adventures = state.adventures || [];
    $('#bookAdventure').innerHTML = adventures.map((a,index)=>`<option value="${index}">${escapeHtml(a.title)}</option>`).join('');
    $('#sheetCharacter').innerHTML = (state.characters || []).map((c,index)=>`<option value="${index}">${escapeHtml(c.name)}</option>`).join('');
    $('#imageCharacters').innerHTML = (state.characters || []).map((c,index)=>`<div class="character-check"><input id="img-char-${index}" type="checkbox" value="${index}" checked><label for="img-char-${index}"><img src="${escapeHtml(mediaUrl(c.portrait, c.name))}" alt=""><span>${escapeHtml(c.name)}</span></label></div>`).join('');
    bindStateInputs($('#studioView'));
  }

  function selectedImageCharacters() {
    return $$('#imageCharacters input:checked').map((input) => state.characters[Number(input.value)]).filter(Boolean);
  }

  function canonSummary(characterSubset = null) {
    const characters = characterSubset || state.characters || [];
    return `MUNDO: ${state.world.name}. ${state.world.description}\nREGLAS: ${state.world.magicRules}\nESTILO VISUAL: ${state.world.visualStyle}\nNO CAMBIAR: ${state.world.forbidden}\n\nPERSONAJES:\n${characters.map((c)=>`- ${c.name}, ${c.title}: ${c.appearance} Poder: ${c.power}. Magia: ${c.magicLook}. Compañero: ${c.companion}. Transformación: ${c.animalForm} (${c.animalLook}). Evolución: ${c.evolution}. Rasgos fijos: ${c.fixed}.`).join('\n')}`;
  }

  function buildImagePrompt() {
    const chars = selectedImageCharacters();
    const finish = $('#imageFinish').value;
    const styleMap = {
      playful: 'ilustración 2D original de juego juvenil de mundo abierto, casa de muñecas y pegatinas, formas redondeadas, colores luminosos y expresiones vivas',
      storybook: 'álbum ilustrado juvenil de fantasía, pincel digital suave, composición narrativa y colores cálidos',
      cinematic: 'fantasía cinematográfica detallada, iluminación volumétrica, profundidad y magia elemental fluida',
      comic: 'cómic juvenil moderno, líneas limpias, poses dinámicas, viñeta amplia y color expresivo'
    };
    return `Crea una ilustración segura y familiar para público de 10 a 15 años. Estilo: ${styleMap[finish]}. Debe ser un diseño original; no copiar personajes, logotipos, interfaces ni activos de ninguna marca.\n\nIDEA: ${plain($('#imageIdea').value) || state.adventures?.[0]?.summary || 'La familia ante las Siete Torres.'}\nFORMATO: ${$('#imageSize').value}.\n\n${canonSummary(chars)}\n\nEvitar personajes duplicados, manos o extremidades extra, cambios de cara, colores incorrectos, texto incrustado y elementos ajenos al canon.`;
  }

  function buildVideoPrompt() {
    return `Genera un clip de fantasía familiar para público de 10 a 15 años, de ${$('#videoSeconds').value} segundos en formato ${$('#videoSize').value}. Movimiento: ${$('#videoMotion').value}. Diseño original con formas redondeadas, colores vivos y sensación de juego juvenil, sin copiar personajes ni elementos visuales de ninguna franquicia.\n\nACCIÓN: ${plain($('#videoIdea').value) || state.adventures?.[0]?.summary || 'Las Siete Torres se iluminan y la familia descubre una puerta.'}\n\n${canonSummary()}\n\nMantener continuidad exacta de rostros, cabello, ropa, edades aparentes, poderes y criaturas. Movimientos naturales, cámara estable, magia fluida, ambiente familiar y épico. No duplicar personajes, no añadir extremidades, no incluir texto incrustado.`;
  }

  function buildBookPrompt() {
    const adventure = state.adventures?.[Number($('#bookAdventure').value)] || state.adventures?.[0];
    const chapters = Number($('#bookChapters').value || 6);
    return `Escribe un libro juvenil completo en español para lectores de 10 a 15 años. Título: «${plain($('#bookTitle').value) || 'Una aventura en las Siete Torres'}». Extensión orientativa: ${chapters} capítulos. Tono: ${$('#bookTone').value}. Debe ser emocionante, claro, familiar y sin contenido inadecuado.\n\nAVENTURA BASE:\n${JSON.stringify(adventure, null, 2)}\n\nDETALLE ESPECIAL: ${plain($('#bookExtra').value) || 'La familia debe resolver el problema colaborando.'}\n\n${canonSummary()}\n\nIncluye portada textual, sinopsis, índice, ${chapters} capítulos desarrollados, epílogo y una guía breve de ilustraciones por capítulo. Mantén estrictamente el canon.`;
  }

  function localBook() {
    const adventure = state.adventures?.[Number($('#bookAdventure').value)] || state.adventures?.[0] || {};
    const title = plain($('#bookTitle').value) || adventure.title || 'Una aventura en las Siete Torres';
    const count = Number($('#bookChapters').value || 6);
    const cast = plain(adventure.participants) || (state.characters || []).map((c)=>c.name).join(', ');
    const beats = [adventure.start, adventure.goal, adventure.obstacle, adventure.creature, adventure.danger, adventure.twist, adventure.ending, adventure.next].filter(Boolean);
    let text = `# ${title}\n\n## Sinopsis\n${adventure.summary || 'La familia recibe una llamada de las Siete Torres y descubre que el mundo mágico necesita una nueva historia.'}\n\n**Protagonistas:** ${cast}\n**Tono:** ${$('#bookTone').value}\n\n## Índice\n`;
    for (let i=1;i<=count;i++) text += `${i}. ${chapterTitle(i, count, adventure)}\n`;
    text += `\n---\n`;
    for (let i=1;i<=count;i++) {
      const beat = beats[(i-1)%Math.max(1,beats.length)] || 'una nueva pista cambia el rumbo de la aventura';
      const char = state.characters[(i-1)%state.characters.length];
      text += `\n## Capítulo ${i}. ${chapterTitle(i,count,adventure)}\n\nLa luz de las torres cambió justo cuando ${char.name} sintió que su poder respondía de una forma distinta. ${beat}. Nadie podía resolverlo solo, así que la familia se reunió, escuchó las ideas más inesperadas y convirtió el miedo en una nueva pista.\n\n${char.name} recordó su frase —«${char.phrase || 'Juntos encontraremos el camino'}»— y utilizó ${char.power.toLowerCase()} sin olvidar que cada poder tenía un límite. Su compañero, ${char.companion.toLowerCase()}, encontró algo que los demás no habían visto.\n\nLa escena terminó con una decisión: seguir adelante, pero sin dejar a nadie atrás.${plain($('#bookExtra').value) ? ` Además, debía ocurrir algo muy especial: ${plain($('#bookExtra').value)}` : ''}\n`;
    }
    text += `\n## Epílogo\n${adventure.ending || 'Las torres recuperaron su luz.'} Sin embargo, una última señal quedó encendida: ${adventure.next || 'una estrella desconocida esperaba la próxima aventura.'}\n\n## Guía de ilustraciones\n${Array.from({length:count},(_,i)=>`- Capítulo ${i+1}: plano amplio con ${state.characters[i%state.characters.length].name}, su poder visible y un detalle del escenario que adelante la siguiente pista.`).join('\n')}`;
    return text;
  }

  function chapterTitle(i, count, adventure) {
    const titles = ['La señal imposible','El puente que cambió de lugar','La prueba de la torre','El guardián de luz','Cuando los poderes se mezclan','El secreto del octavo símbolo','El tren entre las estrellas','La promesa del nuevo mapa','Una puerta para volver','La siguiente aventura'];
    if (i === count) return adventure.next ? 'La puerta que queda abierta' : 'El regreso a las torres';
    return titles[(i-1)%titles.length];
  }

  function localStoryboard() {
    const idea = plain($('#videoIdea').value) || state.adventures?.[0]?.summary || 'Las torres se encienden y la familia descubre una puerta.';
    const seconds = Number($('#videoSeconds').value || 8);
    const shots = seconds <= 4 ? 3 : seconds <= 8 ? 5 : 7;
    return Array.from({ length: shots }, (_, i) => ({
      number: i + 1,
      title: ['Presentación','La señal','Transformación','El peligro','Trabajo en equipo','La revelación','Plano final'][i] || `Plano ${i+1}`,
      text: `${i === 0 ? 'Plano general del mundo y las Siete Torres.' : i === shots-1 ? 'Plano final con una pista para continuar.' : idea} Cámara: ${$('#videoMotion').value.toLowerCase()}. Duración aproximada ${(seconds/shots).toFixed(1)} s.`
    }));
  }

  function localSheet() {
    const c = state.characters?.[Number($('#sheetCharacter').value)] || state.characters?.[0];
    return { c, type: $('#sheetType').value, extra: plain($('#sheetExtra').value) };
  }

  function outputToolbar(kind, text) {
    const encoded = encodeURIComponent(text).slice(0, 900000);
    return `<div class="output-toolbar"><button class="button button-soft button-small" data-copy-output>Copiar</button><button class="button button-primary button-small" data-save-text-kind="${kind}" data-save-text="${encoded}">Guardar en biblioteca</button></div>`;
  }

  function showBookOutput(text) {
    $('#bookOutput').innerHTML = `${outputToolbar('book', text)}<div class="output-document">${escapeHtml(text)}</div>`;
  }
  function showStoryboardOutput(shots, prompt) {
    $('#videoOutput').innerHTML = `${outputToolbar('storyboard', `STORYBOARD\n\n${shots.map(s=>`${s.number}. ${s.title}\n${s.text}`).join('\n\n')}\n\nPROMPT DE VÍDEO\n${prompt}`)}<div class="storyboard">${shots.map(s=>`<div class="storyboard-shot"><b>${s.number}</b><div><h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.text)}</p></div></div>`).join('')}</div>`;
  }
  function showSheetOutput(sheet) {
    const c = sheet.c;
    const text = characterSheetText(c, sheet.type, sheet.extra);
    $('#sheetOutput').innerHTML = `${outputToolbar('character-sheet', text)}<div class="sheet-preview"><div class="sheet-cover"><img src="${escapeHtml(mediaUrl(c.portrait, c.name))}" alt=""><div><span>${escapeHtml(sheet.type)}</span><h2>${escapeHtml(c.name)}</h2><p>${escapeHtml(c.title)} · ${escapeHtml(c.role)}</p></div></div><div class="sheet-body">${[['Poder',c.power],['Rasgos fijos',c.fixed],['Compañero',c.companion],['Transformación',`${c.animalForm}: ${c.animalLook}`],['Evolución',c.evolution],['Personalidad',c.personality],['Sueño',c.dream],['Frase',c.phrase]].map(([k,v])=>`<div class="sheet-block"><b>${escapeHtml(k)}</b><p>${escapeHtml(v)}</p></div>`).join('')}</div></div>`;
  }
  function characterSheetText(c, type = 'Ficha completa de personaje', extra = '') {
    return `# ${type}: ${c.name}\n\n**Título:** ${c.title}\n**Papel:** ${c.role}\n**Edad:** ${c.age}\n**Aspecto:** ${c.appearance}\n**Rasgos invariables:** ${c.fixed}\n**Colores:** ${c.colors}\n**Poder:** ${c.power}\n**Manifestación mágica:** ${c.magicLook}\n**Compañero:** ${c.companion}\n**Personalidad:** ${c.personality}\n**Historia:** ${c.history}\n**Sueño:** ${c.dream}\n**Miedo:** ${c.fear}\n**Objeto:** ${c.object}\n**Transformación:** ${c.animalForm}\n**Forma animal:** ${c.animalLook}\n**Evolución:** ${c.evolution}\n**Poderes evolucionados:** ${c.evolutionPowers}\n**Activación:** ${c.trigger}\n**Debilidad:** ${c.weakness}\n**Voz:** ${c.voice}\n**Frase:** ${c.phrase}${extra ? `\n\n**Notas:** ${extra}` : ''}\n\n## Instrucción para ilustración\nMantener exactamente identidad, edad aparente, cara, cabello, colores, poder, criatura y símbolos. La forma animal conserva ojos, paleta y energía reconocibles. La evolución aumenta la magia sin convertirlo en otra persona.`;
  }

  function promptForSheet() {
    const sheet = localSheet();
    return `Crea una ${sheet.type.toLowerCase()} amplia y profesional para un universo juvenil de fantasía. Usa el siguiente canon y las notas. No cambies rasgos permanentes.\n\n${characterSheetText(sheet.c, sheet.type, sheet.extra)}\n\nOrganiza el resultado para que pueda usarse en ilustración, novela, cómic, animación y vídeo.`;
  }

  async function openChatGPT(prompt) {
    const chatWindow = window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
    try { await navigator.clipboard.writeText(prompt); }
    catch {
      const area = document.createElement('textarea'); area.value = prompt; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    }
    showToast('Encargo copiado. Pégalo en ChatGPT para continuar con tu cuenta.');
    if (!chatWindow) showToast('El navegador bloqueó la pestaña. El encargo ya está copiado.', 'error');
  }

  async function fetchAiQueueRow() {
    if (!aiQueueToken) throw new Error('La conexión privada con el estudio de IA no está abierta.');
    return api('get', { query: { token: aiQueueToken } });
  }

  async function writeAiQueueData(nextData) {
    if (!aiQueueToken) throw new Error('La conexión privada con el estudio de IA no está abierta.');
    return api('update', {
      method: 'PUT',
      body: {
        editor_token: aiQueueToken,
        author_name: session?.display_name || 'Familia',
        world_name: 'Cola de IA de Mi mundo Mágico v3',
        data: nextData,
        generated_document: ''
      }
    });
  }

  async function signAiPayload(payload) {
    if (!aiSigningKey && !await restoreAiSession()) throw new Error('La firma privada de la familia ha caducado. Sal y vuelve a entrar.');
    const encoded = new TextEncoder().encode(stableStringify(payload));
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, aiSigningKey, encoded);
    return base64UrlString(signature);
  }

  function aiWorkerFresh(worker) {
    if (!worker?.lastSeenAt) return false;
    const age = Date.now() - new Date(worker.lastSeenAt).getTime();
    return Number.isFinite(age) && age < 18 * 60 * 1000;
  }

  function updateAiStatusFromQueue(data = {}) {
    aiWorkerState = data.worker || {};
    const workerStatus = aiWorkerState.status || 'awaiting_api_key';
    const fresh = aiWorkerFresh(aiWorkerState);
    aiConnected = ['ready', 'working'].includes(workerStatus) && fresh;

    const badge = $('#aiBadge');
    if (badge) {
      badge.classList.toggle('connected', aiConnected);
      const label = $('span', badge);
      if (label) {
        if (aiConnected && workerStatus === 'working') label.textContent = 'OpenAI está creando';
        else if (aiConnected) label.textContent = 'OpenAI conectado dentro de la app';
        else if (workerStatus === 'awaiting_api_key') label.textContent = 'Falta activar la clave de OpenAI';
        else label.textContent = 'Motor de IA temporalmente desconectado';
      }
    }

    const card = $('#aiWorkerStatus');
    if (card) {
      const usage = data.usage || {};
      const statusText = aiConnected
        ? (workerStatus === 'working' ? 'Creando ahora mismo' : 'Preparado')
        : (workerStatus === 'awaiting_api_key' ? 'Pendiente de configuración' : 'Sin conexión reciente');
      card.className = `ai-worker-card ${aiConnected ? 'ready' : 'waiting'}`;
      card.innerHTML = `<div class="ai-worker-icon">${aiConnected ? '✨' : '🔐'}</div><div><b>${escapeHtml(statusText)}</b><span>${escapeHtml(aiWorkerState.message || (aiConnected ? 'Los encargos se generan con la API de OpenAI sin abandonar esta aplicación.' : 'Añade la clave API como secreto seguro de GitHub para activar la generación.'))}</span><small>${aiWorkerState.lastSeenAt ? `Última comprobación: ${formatDate(aiWorkerState.lastSeenAt)}` : 'Todavía no se ha conectado el trabajador seguro.'}${usage.day ? ` · Uso ${usage.day}: ${usage.text || 0} textos, ${usage.image || 0} imágenes, ${usage.video || 0} vídeos` : ''}</small></div></div>`;
    }

    $$('.ai-action').forEach((button) => {
      button.classList.remove('hidden');
      button.disabled = !aiConnected;
      button.title = aiConnected ? 'Generar dentro de la aplicación' : 'La conexión segura con OpenAI todavía no está activa';
    });
    renderAiHistory(data);
  }

  async function checkAi() {
    try {
      if (!await restoreAiSession()) throw new Error('Vuelve a entrar para abrir la conexión privada de IA.');
      const row = await fetchAiQueueRow();
      updateAiStatusFromQueue(row.data || {});
    } catch (error) {
      aiConnected = false;
      updateAiStatusFromQueue({ worker: { status: 'offline', message: error.message, lastSeenAt: null }, queue: [], results: [] });
    }
    clearInterval(aiStatusTimer);
    aiStatusTimer = setInterval(async () => {
      if (!token || document.hidden) return;
      try {
        const row = await fetchAiQueueRow();
        updateAiStatusFromQueue(row.data || {});
      } catch {}
    }, 20000);
  }

  async function enqueueAiRequest({ type, kind, title, prompt, options = {} }) {
    if (!aiConnected) throw new Error('El motor seguro de OpenAI todavía no está activo.');
    const cleanPrompt = String(prompt || '').trim().slice(0, 60000);
    if (!cleanPrompt) throw new Error('Escribe qué quieres que cree la IA.');
    const payload = {
      id: uid('ai'),
      app: AI_APP,
      queue_id: AI_QUEUE_ID,
      type,
      kind,
      title: plain(title).slice(0, 120) || 'Creación de Mi mundo Mágico v3',
      prompt: cleanPrompt,
      options: clone(options || {}),
      created_at: new Date().toISOString(),
      created_by: session?.display_name || 'Familia',
      world_revision: revision,
      nonce: base64UrlString(crypto.getRandomValues(new Uint8Array(18)))
    };
    const entry = { payload, signature: await signAiPayload(payload) };

    for (let attempt = 0; attempt < 5; attempt++) {
      const row = await fetchAiQueueRow();
      const data = clone(row.data || {});
      if (!Array.isArray(data.queue)) data.queue = [];
      if (!Array.isArray(data.results)) data.results = [];
      if (data.queue.some((item) => item?.payload?.id === payload.id) || data.results.some((item) => item?.request_id === payload.id)) return payload.id;
      data.queue.push(entry);
      data.queue = data.queue.slice(-60);
      data.version = Number(data.version || 1);
      data.app = AI_APP;
      await writeAiQueueData(data);
      const verification = await fetchAiQueueRow();
      if ((verification.data?.queue || []).some((item) => item?.payload?.id === payload.id)) {
        updateAiStatusFromQueue(verification.data || data);
        return payload.id;
      }
      await sleep(250 + Math.random() * 450);
    }
    throw new Error('No se pudo añadir el encargo a la cola compartida. Inténtalo de nuevo.');
  }

  function aiPendingMarkup(requestId, icon, message) {
    return `<div class="ai-progress-card" data-ai-request="${escapeHtml(requestId)}"><div class="ai-progress-orb">${icon}</div><div><b>${escapeHtml(message)}</b><span>La creación se realizará de forma segura en el servidor. Puedes seguir usando la aplicación.</span><div class="ai-progress-track"><i></i></div><small id="ai-progress-${escapeHtml(requestId)}">Esperando al motor de IA…</small></div></div>`;
  }

  async function pollAiResult(requestId, outputEl, kind, startedAt = Date.now()) {
    clearTimeout(aiResultPollers.get(requestId));
    try {
      const row = await fetchAiQueueRow();
      const data = row.data || {};
      updateAiStatusFromQueue(data);
      const result = (data.results || []).find((item) => item?.request_id === requestId);
      if (result) {
        aiResultPollers.delete(requestId);
        await displayAiResult(result, outputEl, kind);
        return;
      }
      const queued = (data.queue || []).some((item) => item?.payload?.id === requestId);
      const detail = $(`#ai-progress-${CSS.escape(requestId)}`);
      if (detail) {
        const elapsed = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
        const worker = data.worker || {};
        detail.textContent = worker.status === 'working'
          ? `La IA está trabajando · ${elapsed} s`
          : queued
            ? `En cola · ${elapsed} s · el trabajador automático revisa los encargos periódicamente`
            : `Sincronizando el resultado · ${elapsed} s`;
      }
      if (Date.now() - startedAt > 75 * 60 * 1000) {
        aiResultPollers.delete(requestId);
        outputEl.innerHTML = '<div class="notice warning">La creación está tardando más de lo habitual. Puedes recuperarla después en «IA dentro de la app» → «Creaciones recientes».</div>';
        return;
      }
      const timer = setTimeout(() => pollAiResult(requestId, outputEl, kind, startedAt), 5000);
      aiResultPollers.set(requestId, timer);
    } catch (error) {
      const timer = setTimeout(() => pollAiResult(requestId, outputEl, kind, startedAt), 8000);
      aiResultPollers.set(requestId, timer);
      const detail = $(`#ai-progress-${CSS.escape(requestId)}`);
      if (detail) detail.textContent = `Reconectando: ${error.message}`;
    }
  }

  async function saveAiResultToLibrary(result) {
    const requestId = result.request_id;
    if (sharedLibrary().some((asset) => asset.metadata?.ai_request_id === requestId)) return;
    const metadata = {
      ai_request_id: requestId,
      url: result.url || '',
      prompt: result.prompt || '',
      model: result.model || '',
      usage: result.usage || null,
      description: result.description || `Creación generada con ${result.model || 'OpenAI'}.`
    };
    try {
      if (result.type === 'text') {
        await saveTextAsset(result.kind === 'character-sheet' ? 'character-sheet' : result.kind === 'book' ? 'book' : 'text', result.title, result.text || '', metadata);
      } else if (result.type === 'image') {
        let thumb = '';
        try {
          const response = await fetch(`${result.url}${result.url.includes('?') ? '&' : '?'}v=${Date.now()}`, { cache: 'no-store' });
          if (response.ok) {
            const blob = await response.blob();
            thumb = await imageThumbnail(new File([blob], `${safeFileName(result.title)}.png`, { type: blob.type || 'image/png' }));
          }
        } catch {}
        await saveDataAsset('image', result.title, thumb, 'image/jpeg', metadata);
      } else if (result.type === 'video') {
        await saveDataAsset('video', result.title, '', result.mime_type || 'video/mp4', metadata);
      }
    } catch (error) {
      showToast(`La creación está lista, pero no se pudo añadir a la Biblioteca: ${error.message}`, 'error');
    }
  }

  async function displayAiResult(result, outputEl, kind = result.kind) {
    if (result.status === 'failed') {
      outputEl.innerHTML = `<div class="notice warning"><b>La IA no pudo completar este encargo.</b><br>${escapeHtml(result.error || 'Error desconocido.')}</div>`;
      showToast('La creación no pudo completarse.', 'error');
      return;
    }
    if (result.type === 'text') {
      const text = result.text || '';
      if (kind === 'book') showBookOutput(text);
      else outputEl.innerHTML = `${outputToolbar(kind || 'text', text)}<div class="output-document">${escapeHtml(text)}</div>`;
    } else if (result.type === 'image') {
      outputEl.innerHTML = `<div class="output-toolbar"><a class="button button-primary button-small" href="${escapeHtml(result.url)}" download>Descargar imagen</a><button class="button button-soft button-small" data-open-ai-result="${escapeHtml(result.request_id)}">Abrir grande</button></div><img class="output-image" src="${escapeHtml(result.url)}?v=${Date.now()}" alt="${escapeHtml(result.title || 'Ilustración generada por IA')}"><div class="output-document">${escapeHtml(result.prompt || '')}</div>`;
    } else if (result.type === 'video') {
      outputEl.innerHTML = `<div class="output-toolbar"><a class="button button-primary button-small" href="${escapeHtml(result.url)}" download>Descargar vídeo</a></div><video class="output-image" src="${escapeHtml(result.url)}?v=${Date.now()}" controls playsinline></video><div class="output-document">${escapeHtml(result.prompt || '')}</div>`;
    }
    await saveAiResultToLibrary(result);
    showToast('Creación terminada dentro de la aplicación.');
    try {
      const row = await fetchAiQueueRow();
      updateAiStatusFromQueue(row.data || {});
    } catch {}
  }

  function renderAiHistory(data = null) {
    const target = $('#aiHistory');
    if (!target) return;
    const results = clone(data?.results || []).sort((a, b) => String(b.completed_at || b.created_at || '').localeCompare(String(a.completed_at || a.created_at || ''))).slice(0, 18);
    if (!results.length) {
      target.innerHTML = '<div class="notice info">Aquí aparecerán los textos, ilustraciones y vídeos creados con la API de OpenAI.</div>';
      return;
    }
    const icons = { text: '💬', image: '🖼️', video: '🎬' };
    target.innerHTML = results.map((result) => `<article class="ai-history-card ${result.status === 'failed' ? 'failed' : ''}"><span>${icons[result.type] || '✨'}</span><div><h4>${escapeHtml(result.title || 'Creación')}</h4><p>${escapeHtml(result.status === 'failed' ? result.error : `${result.kind || result.type} · ${result.model || 'OpenAI'} · ${formatDate(result.completed_at || result.created_at)}`)}</p></div><button class="button button-soft button-small" data-open-ai-result="${escapeHtml(result.request_id)}">${result.status === 'failed' ? 'Detalles' : 'Abrir'}</button></article>`).join('');
  }

  async function openAiResult(requestId) {
    try {
      const row = await fetchAiQueueRow();
      const result = (row.data?.results || []).find((item) => item.request_id === requestId);
      if (!result) throw new Error('La creación ya no está en el historial reciente.');
      $('#modalTitle').textContent = result.title || 'Creación con IA';
      if (result.status === 'failed') {
        $('#modalContent').innerHTML = `<div class="notice warning">${escapeHtml(result.error || 'Error desconocido.')}</div>`;
      } else if (result.type === 'image') {
        $('#modalContent').innerHTML = `<div class="output-toolbar"><a class="button button-primary button-small" href="${escapeHtml(result.url)}" download>Descargar</a></div><img class="output-image" src="${escapeHtml(result.url)}?v=${Date.now()}" alt="">`;
      } else if (result.type === 'video') {
        $('#modalContent').innerHTML = `<div class="output-toolbar"><a class="button button-primary button-small" href="${escapeHtml(result.url)}" download>Descargar</a></div><video class="output-image" src="${escapeHtml(result.url)}?v=${Date.now()}" controls playsinline></video>`;
      } else {
        $('#modalContent').innerHTML = `<div class="output-toolbar"><button class="button button-soft button-small" data-copy-modal>Copiar</button></div><div class="output-document">${escapeHtml(result.text || '')}</div>`;
      }
      $('#modal').classList.remove('hidden');
      $('#modal').setAttribute('aria-hidden', 'false');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function generateAiText(kind, title, prompt, outputEl, options = {}) {
    outputEl.innerHTML = '<div class="notice info">Preparando el encargo para OpenAI…</div>';
    try {
      const requestId = await enqueueAiRequest({ type: 'text', kind, title, prompt, options });
      outputEl.innerHTML = aiPendingMarkup(requestId, '✨', kind === 'book' ? 'La IA está escribiendo el libro' : kind === 'character-sheet' ? 'La IA está preparando la ficha' : 'La IA está respondiendo');
      pollAiResult(requestId, outputEl, kind);
    } catch (error) {
      outputEl.innerHTML = `<div class="notice warning">${escapeHtml(error.message)}</div>`;
    }
  }

  async function generateAiImage() {
    const output = $('#imageOutput');
    output.innerHTML = '<div class="notice info">Preparando la ilustración para OpenAI…</div>';
    try {
      const title = plain($('#imageIdea').value).slice(0, 80) || 'Ilustración del mundo';
      const requestId = await enqueueAiRequest({
        type: 'image',
        kind: 'image',
        title,
        prompt: buildImagePrompt(),
        options: { size: $('#imageSize').value, quality: 'medium', model: 'gpt-image-1' }
      });
      output.innerHTML = aiPendingMarkup(requestId, '🎨', 'La IA está pintando la ilustración');
      pollAiResult(requestId, output, 'image');
    } catch (error) {
      output.innerHTML = `<div class="notice warning">${escapeHtml(error.message)}</div>`;
    }
  }

  async function generateAiVideo() {
    const output = $('#videoOutput');
    output.innerHTML = '<div class="notice info">Preparando el vídeo para OpenAI…</div>';
    try {
      const title = plain($('#videoIdea').value).slice(0, 80) || 'Vídeo del mundo';
      const requestId = await enqueueAiRequest({
        type: 'video',
        kind: 'video',
        title,
        prompt: buildVideoPrompt(),
        options: { seconds: Number($('#videoSeconds').value), size: $('#videoSize').value, model: 'sora-2' }
      });
      output.innerHTML = aiPendingMarkup(requestId, '🎬', 'La IA está produciendo el vídeo');
      pollAiResult(requestId, output, 'video');
    } catch (error) {
      output.innerHTML = `<div class="notice warning">${escapeHtml(error.message)}</div>`;
    }
  }

  async function generateAiChat() {
    const output = $('#chatOutput');
    const question = plain($('#aiChatPrompt')?.value);
    if (!question) {
      output.innerHTML = '<div class="notice warning">Escribe una pregunta o una creación para la IA.</div>';
      return;
    }
    const mode = $('#aiChatMode')?.value || 'creative';
    const instructions = {
      creative: 'Responde como coautor creativo del universo. Propón una respuesta desarrollada y coherente con el canon.',
      answer: 'Responde de forma clara, útil y directa usando únicamente el canon cuando corresponda.',
      improve: 'Reescribe y mejora la petición respetando todos los datos y sin alterar el canon.',
      plan: 'Crea un plan paso a paso y materiales listos para producir la idea dentro del universo.'
    }[mode];
    const prompt = `${instructions}\n\nPETICIÓN:\n${question}\n\nCANON DEL MUNDO:\n${canonSummary()}\n\nNo cambies los rasgos permanentes de personajes, lugares ni reglas. Mantén un tono seguro y apropiado para público de 10 a 15 años.`;
    await generateAiText('chat', question.slice(0, 80), prompt, output, { model: $('#aiChatModel')?.value || 'gpt-5-mini' });
  }

  function sharedLibrary() {
    if (!Array.isArray(state.library)) state.library = [];
    return state.library;
  }

  function librarySize() {
    return new TextEncoder().encode(JSON.stringify(state)).length;
  }

  async function saveTextAsset(kind, title, text, metadata = {}) {
    const cleanText = String(text || '').slice(0, 42000);
    const next = clone(sharedLibrary());
    next.unshift({
      id: uid('asset'), kind, title: plain(title).slice(0, 120) || 'Creación del mundo',
      mime_type: 'text/markdown', text_content: cleanText, prompt: metadata.prompt || '', metadata,
      status: 'completed', created_by: session?.display_name || 'Familia', created_at: new Date().toISOString()
    });
    while (next.length > 35) next.pop();
    const previous = state.library;
    state.library = next;
    if (librarySize() > 790000) {
      state.library = previous;
      throw new Error('La Biblioteca compartida está llena. Elimina algunas creaciones antes de guardar otra.');
    }
    queuePatch(['library'], next, 0);
    libraryAssets = next;
    renderLibrary();
    showToast('Guardado en la biblioteca compartida.');
    return next[0];
  }

  async function saveDataAsset(kind, title, dataUrl, mimeType, metadata = {}) {
    let storedData = String(dataUrl || '');
    if (storedData.length > 175000) storedData = '';
    const next = clone(sharedLibrary());
    next.unshift({
      id: uid('asset'), kind, title: plain(title).slice(0, 120) || 'Creación del mundo',
      mime_type: mimeType || 'application/octet-stream', data_url: storedData,
      text_content: metadata.description || '', prompt: metadata.prompt || '', metadata,
      status: (storedData || metadata.url) ? 'completed' : 'local-only', created_by: session?.display_name || 'Familia', created_at: new Date().toISOString()
    });
    while (next.length > 35) next.pop();
    const previous = state.library;
    state.library = next;
    if (librarySize() > 790000) {
      state.library = previous;
      throw new Error('La Biblioteca compartida está llena. El archivo se ha descargado, pero no se ha añadido al canon.');
    }
    queuePatch(['library'], next, 0);
    libraryAssets = next;
    renderLibrary();
    showToast((storedData || metadata.url) ? 'Guardado en la biblioteca compartida.' : 'Se ha guardado la referencia; el archivo grande permanece en tu dispositivo.');
    return next[0];
  }

  async function loadLibrary(render = true) {
    libraryAssets = clone(sharedLibrary());
    if (render || currentRoute === 'library') renderLibrary();
  }

  function renderLibrary() {
    const grid = $('#libraryGrid');
    if (!grid) return;
    libraryAssets = clone(sharedLibrary());
    if (!libraryAssets.length) {
      grid.innerHTML = '<div class="notice info">La biblioteca está vacía. Crea una escena, un libro, un vídeo animado o una ficha.</div>';
      return;
    }
    grid.innerHTML = libraryAssets.map((asset) => {
      const remoteUrl = asset.metadata?.url || '';
      const isImage = asset.mime_type?.startsWith('image/') && (asset.data_url || remoteUrl);
      const isVideo = asset.mime_type?.startsWith('video/') && (asset.data_url || remoteUrl);
      const emoji = { book:'📕', text:'📝', storyboard:'🎬', 'character-sheet':'🪪', scene:'🎨', image:'🖼️', video:'🎞️', 'image-prompt':'🪄' }[asset.kind] || '📦';
      let preview = `<span class="asset-emoji">${emoji}</span>`;
      if (isImage) preview = `<img src="${escapeHtml(asset.data_url || remoteUrl)}" alt="">`;
      if (isVideo) preview = `<video src="${escapeHtml(asset.data_url || remoteUrl)}" muted playsinline></video>`;
      return `<article class="asset-card"><div class="asset-preview">${preview}</div><div class="asset-info"><h3>${escapeHtml(asset.title || 'Creación')}</h3><p>${escapeHtml(asset.kind)} · ${formatDate(asset.created_at)} · ${escapeHtml(asset.created_by || 'familia')}</p>${asset.status === 'local-only' ? '<p>El archivo completo se descargó en el dispositivo; aquí se conserva su referencia.</p>' : ''}<div class="asset-actions"><button class="button button-soft" data-open-asset="${asset.id}">Abrir</button><button class="button button-danger" data-delete-asset="${asset.id}">Eliminar</button></div></div></article>`;
    }).join('');
  }

  function openAsset(asset) {
    $('#modalTitle').textContent = asset.title || 'Creación';
    let content;
    const remoteUrl = asset.metadata?.url || '';
    if (asset.mime_type?.startsWith('image/') && (asset.data_url || remoteUrl)) content = `<div class="output-toolbar">${remoteUrl ? `<a class="button button-primary button-small" href="${escapeHtml(remoteUrl)}" download>Descargar</a>` : ''}</div><img class="output-image" src="${escapeHtml(asset.data_url || remoteUrl)}" alt="">`;
    else if (asset.mime_type?.startsWith('video/') && (asset.data_url || remoteUrl)) content = `<div class="output-toolbar">${remoteUrl ? `<a class="button button-primary button-small" href="${escapeHtml(remoteUrl)}" download>Descargar</a>` : ''}</div><video class="output-image" src="${escapeHtml(asset.data_url || remoteUrl)}" controls playsinline></video>`;
    else content = `<div class="output-toolbar"><button class="button button-soft button-small" data-copy-modal>Copiar</button></div><div class="output-document">${escapeHtml(asset.text_content || asset.prompt || asset.metadata?.description || 'La creación completa se guardó en el dispositivo desde el que fue generada.')}</div>`;
    $('#modalContent').innerHTML = content;
    $('#modal').classList.remove('hidden');
    $('#modal').setAttribute('aria-hidden','false');
  }

  function closeModal() { $('#modal').classList.add('hidden'); $('#modal').setAttribute('aria-hidden','true'); }

  function makeCanon() {
    const lines = [`# BIBLIA CREATIVA DE ${state.world.name.toUpperCase()}`, '', `**Aplicación:** Mi mundo Mágico v3`, `**Versión compartida:** ${revision}`, `**Última actualización:** ${formatDate(lastUpdatedAt)}${lastUpdatedBy ? ` por ${lastUpdatedBy}` : ''}`, '', '## EL MUNDO', state.world.description, '', `**Frase:** ${state.world.tagline}`, '', '## REGLAS DE LA MAGIA', state.world.magicRules, '', '## ESTILO VISUAL', state.world.visualStyle, '', '## ESTILO DE VÍDEO', state.world.cinematicStyle, '', '## CONTINUIDAD Y PROHIBICIONES', state.world.forbidden, '', '## TONO Y SEGURIDAD', state.world.safety, ''];
    (state.characters || []).forEach((c) => lines.push(`\n# PERSONAJE: ${c.name.toUpperCase()}`, characterSheetText(c)));
    lines.push('\n# LOCALIZACIONES');
    (state.locations || []).forEach((l) => lines.push(`\n## ${l.name}\n- **Tipo:** ${l.type}\n- **Aspecto:** ${l.look}\n- **Colores:** ${l.colors}\n- **Clima:** ${l.weather}\n- **Magia:** ${l.magic}\n- **Criaturas:** ${l.creatures}\n- **Habitantes:** ${l.inhabitants}\n- **Arquitectura:** ${l.buildings}\n- **Secreto:** ${l.secret}\n- **Peligro:** ${l.danger}\n- **Acceso:** ${l.travel}\n- **Rasgo único:** ${l.unique}`));
    lines.push('\n# AVENTURAS');
    (state.adventures || []).forEach((a) => lines.push(`\n## ${a.title}\n${a.summary}\n- **Participantes:** ${a.participants}\n- **Inicio:** ${a.start}\n- **Objetivo:** ${a.goal}\n- **Obstáculo:** ${a.obstacle}\n- **Criatura:** ${a.creature}\n- **Objeto:** ${a.object}\n- **Momento divertido:** ${a.fun}\n- **Peligro:** ${a.danger}\n- **Giro:** ${a.twist}\n- **Final:** ${a.ending}\n- **Próximo misterio:** ${a.next}`));
    lines.push('\n# REGLAS PARA NUEVAS CREACIONES', '1. Mantener exactamente rostros, edades aparentes, cabello, ropa, colores, poderes y criaturas.', '2. La transformación animal conserva ojos, paleta, marcas y energía del personaje.', '3. La evolución aumenta la espectacularidad sin sustituir la identidad.', '4. Toda creación debe ser segura y apropiada para público de 10 a 15 años.', '5. El estilo de juego juvenil debe ser original y no copiar personajes, logotipos ni activos de ninguna franquicia.', '6. Antes de crear una imagen, libro o vídeo, usar esta Biblia como canon y añadir únicamente la nueva acción o escena.');
    return lines.join('\n');
  }

  async function checkOwner() {
    ownerAccess = false;
    $('#ownerNav')?.classList.add('hidden');
  }

  async function renderOwner() {
    ownerAccess = false;
  }

  function downloadText(content, filename, type='text/plain') {
    const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
    const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function safeFileName(value) { return plain(value || 'mi-mundo-magico-v3').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase(); }

  function wireEvents() {
    $('#loginForm').addEventListener('submit', (event) => { event.preventDefault(); login($('#loginName').value, $('#loginPassword').value); });
    $('#togglePassword').addEventListener('click', () => { const input=$('#loginPassword'); input.type=input.type==='password'?'text':'password'; });
    $('#logoutButton').addEventListener('click', () => logout(false));
    $('#openSidebar').addEventListener('click', () => $('#sidebar').classList.add('open'));
    $('#closeSidebar').addEventListener('click', () => $('#sidebar').classList.remove('open'));
    $('#mainNav').addEventListener('click', (event) => { const button=event.target.closest('[data-route]'); if(button) navigate(button.dataset.route); });
    document.addEventListener('click', async (event) => {
      const route = event.target.closest('.route-button,[data-route]');
      if (route && !route.closest('#mainNav')) navigate(route.dataset.route);
      const portrait = event.target.closest('[data-character-index]'); if (portrait) { currentCharacter=Number(portrait.dataset.characterIndex); navigate('characters'); renderCharacters(); }
      const charTab = event.target.closest('[data-char-index]'); if (charTab) { currentCharacter=Number(charTab.dataset.charIndex); renderCharacters(); }
      const editorTab = event.target.closest('#characterEditorTabs [data-panel]'); if(editorTab){currentCharacterPanel=editorTab.dataset.panel;renderCharacterEditor();}
      const adv = event.target.closest('[data-adventure-index]'); if(adv){currentAdventure=Number(adv.dataset.adventureIndex);renderAdventures();}
      const delLoc = event.target.closest('[data-delete-location]'); if(delLoc && confirm('¿Eliminar este lugar del mundo compartido?')){const next=clone(state.locations);next.splice(Number(delLoc.dataset.deleteLocation),1);state.locations=next;queuePatch(['locations'],next,0);renderLocations();}
      const delAdv = event.target.closest('[data-delete-adventure]'); if(delAdv && confirm('¿Eliminar esta aventura del mundo compartido?')){const next=clone(state.adventures);next.splice(Number(delAdv.dataset.deleteAdventure),1);state.adventures=next;currentAdventure=Math.max(0,currentAdventure-1);queuePatch(['adventures'],next,0);renderAdventures();}
      const delChar = event.target.closest('[data-delete-character]'); if(delChar && confirm('¿Eliminar este personaje?')){const next=clone(state.characters);next.splice(currentCharacter,1);state.characters=next;currentCharacter=Math.max(0,currentCharacter-1);queuePatch(['characters'],next,0);renderAll();}
      const charPrompt = event.target.closest('[data-char-prompt]'); if(charPrompt){const c=state.characters[currentCharacter]; if(charPrompt.dataset.charPrompt==='image'){await openChatGPT(`Crea una ilustración de ${c.name}.\n\n${characterSheetText(c)}\n\nEstética juvenil original, colorida y redondeada, sin copiar franquicias.`);} else {showSheetOutput({c,type:'Ficha rápida',extra:''});navigate('studio');activateStudio('sheet');}}
      const bg=event.target.closest('[data-background]');if(bg){state.scene.background=bg.dataset.background;queuePatch(['scene','background'],bg.dataset.background);renderSceneTools();renderScene();}
      const addChar=event.target.closest('[data-add-character]');if(addChar)addSceneItem('character',addChar.dataset.addCharacter);
      const addProp=event.target.closest('[data-add-prop]');if(addProp)addSceneItem('prop',addProp.dataset.addProp);
      const open=event.target.closest('[data-open-asset]');if(open){const asset=libraryAssets.find(a=>a.id===open.dataset.openAsset);if(asset)openAsset(asset);}
      const delAsset=event.target.closest('[data-delete-asset]');if(delAsset&&confirm('¿Eliminar esta creación de la biblioteca compartida?')){const next=sharedLibrary().filter(a=>a.id!==delAsset.dataset.deleteAsset);state.library=next;libraryAssets=next;queuePatch(['library'],next,0);renderLibrary();showToast('Creación eliminada.');}
      const refreshVideo=event.target.closest('[data-refresh-video]');if(refreshVideo){showToast('Los vídeos locales se crean y descargan en el dispositivo.');}
      const openAi=event.target.closest('[data-open-ai-result]');if(openAi){await openAiResult(openAi.dataset.openAiResult);}
      const copyOut=event.target.closest('[data-copy-output]');if(copyOut){const text=copyOut.closest('.studio-output')?.innerText||'';await navigator.clipboard.writeText(text);showToast('Texto copiado.');}
      const saveText=event.target.closest('[data-save-text-kind]');if(saveText){const text=decodeURIComponent(saveText.dataset.saveText);await saveTextAsset(saveText.dataset.saveTextKind, plain($('#bookTitle').value)||'Creación del mundo',text);}
      if(event.target.closest('[data-copy-modal]')){await navigator.clipboard.writeText($('#modalContent').innerText);showToast('Copiado.');}
      if(event.target.closest('[data-close-modal]'))closeModal();
    });

    $('#applyRemote').addEventListener('click', () => { if(remoteSnapshot){applySnapshot(remoteSnapshot,true);showToast('Cambios compartidos aplicados.');} });
    $('#shareButton').addEventListener('click', async () => { const cleanUrl = `${location.origin}${location.pathname}`; if(navigator.share){try{await navigator.share({title:'Mi mundo Mágico v3',text:'Entra en nuestro único mundo compartido.',url:cleanUrl});}catch{}}else{await navigator.clipboard.writeText(cleanUrl);showToast('Enlace copiado.');} });
    $('#addCharacterButton').addEventListener('click', () => {const next=clone(state.characters);next.push({id:uid('char'),name:'Nuevo personaje',title:'Guardián por descubrir',role:'Personaje de la familia',age:'',portrait:'assets/default-avatar.svg',sticker:'assets/default-avatar.svg',locked:false,appearance:'',fixed:'',colors:'',power:'',magicLook:'',companion:'',personality:'',history:'',dream:'',fear:'',object:'',animalForm:'',animalLook:'',evolution:'',evolutionPowers:'',trigger:'',weakness:'',voice:'',phrase:''});state.characters=next;currentCharacter=next.length-1;queuePatch(['characters'],next,0);renderAll();});
    $('#addLocationButton').addEventListener('click', addLocation);
    $('#addAdventureButton').addEventListener('click', addAdventure);
    $('#clearSceneButton').addEventListener('click',()=>{if(confirm('¿Quitar todos los elementos de la escena compartida?')){state.scene.items=[];selectedSceneItem=null;queuePatch(['scene','items'],[],0);renderScene();}});
    $('#removeSceneItem').addEventListener('click',()=>{if(!selectedSceneItem)return;state.scene.items=state.scene.items.filter(x=>x.id!==selectedSceneItem);selectedSceneItem=null;queuePatch(['scene','items'],state.scene.items,0);renderScene();});
    $('#sceneScale').addEventListener('input',(e)=>{const item=state.scene.items.find(x=>x.id===selectedSceneItem);if(item){item.scale=Number(e.target.value);renderScene();queuePatch(['scene','items'],state.scene.items,350);}});
    $('#sceneRotation').addEventListener('input',(e)=>{const item=state.scene.items.find(x=>x.id===selectedSceneItem);if(item){item.rotation=Number(e.target.value);renderScene();queuePatch(['scene','items'],state.scene.items,350);}});
    $('#sceneCanvas').addEventListener('pointerdown',onScenePointerDown);$('#sceneCanvas').addEventListener('pointermove',onScenePointerMove);$('#sceneCanvas').addEventListener('pointerup',onScenePointerUp);$('#sceneCanvas').addEventListener('pointercancel',onScenePointerUp);
    $('#downloadSceneButton').addEventListener('click',()=>{$('#sceneCanvas').toBlob(blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${safeFileName(state.scene.title)}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');});
    $('#scenePromptButton').addEventListener('click',()=>{const p=buildScenePrompt();$('#imageIdea').value=`Escena «${state.scene.title}»: ${state.scene.speech}`;navigate('studio');activateStudio('image');$('#imageOutput').innerHTML=`${outputToolbar('image-prompt',p)}<div class="output-document">${escapeHtml(p)}</div>`;});
    $('#saveSceneLibraryButton').addEventListener('click',async()=>{try{const data=sceneThumbnail();await saveDataAsset('scene',state.scene.title||'Escena del mundo',data,'image/jpeg',{scene:clone(state.scene),prompt:buildScenePrompt(),description:'Escena creada con el tablero compartido.'});}catch(e){showToast(e.message,'error');}});

    $('#studioTabs').addEventListener('click',(event)=>{const b=event.target.closest('[data-studio]');if(b)activateStudio(b.dataset.studio);});
    $('#localBookButton').addEventListener('click',()=>showBookOutput(localBook()));
    $('#generateAiBookButton')?.addEventListener('click',()=>generateAiText('book', plain($('#bookTitle').value) || 'Libro de las Siete Torres', buildBookPrompt(), $('#bookOutput'), { model: 'gpt-5-mini', chapters: Number($('#bookChapters').value || 6) }));
    $('#chatgptBookButton').addEventListener('click',()=>openChatGPT(buildBookPrompt()));
    $('#generateAiImageButton')?.addEventListener('click',generateAiImage);
    $('#chatgptImageButton').addEventListener('click',()=>{const p=buildImagePrompt();$('#imageOutput').innerHTML=`${outputToolbar('image-prompt',p)}<div class="output-document">${escapeHtml(p)}</div>`;openChatGPT(p);});
    $('#storyboardButton').addEventListener('click',()=>showStoryboardOutput(localStoryboard(),buildVideoPrompt()));
    $('#localVideoButton').addEventListener('click',createLocalVideo);
    $('#generateAiVideoButton')?.addEventListener('click',generateAiVideo);
    $('#chatgptVideoButton').addEventListener('click',()=>openChatGPT(buildVideoPrompt()));
    $('#localSheetButton').addEventListener('click',()=>showSheetOutput(localSheet()));
    $('#generateAiSheetButton')?.addEventListener('click',()=>generateAiText('character-sheet', state.characters?.[Number($('#sheetCharacter').value)]?.name || 'Ficha de personaje', promptForSheet(), $('#sheetOutput'), { model: 'gpt-5-mini' }));
    $('#chatgptSheetButton').addEventListener('click',()=>openChatGPT(promptForSheet()));
    $('#generateAiChatButton')?.addEventListener('click',generateAiChat);
    $('#refreshAiStatusButton')?.addEventListener('click',checkAi);

    $('#refreshLibraryButton').addEventListener('click',()=>loadLibrary());
    $('#pasteTextAsset').addEventListener('click',async()=>{const text=prompt('Pega aquí el texto que quieres guardar:');if(text)await saveTextAsset('text','Texto importado',text);});
    $('#assetFileInput').addEventListener('change',async(event)=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>12*1024*1024)throw new Error('El archivo supera 12 MB.');if(file.type.startsWith('image/')){const thumb=await imageThumbnail(file);await saveDataAsset('image',file.name,thumb,'image/jpeg',{original_name:file.name,description:'Miniatura compartida de una imagen importada.'});}else if(file.type.startsWith('text/')||/\.(txt|md)$/i.test(file.name)){await saveTextAsset('text',file.name,(await file.text()).slice(0,42000),{original_name:file.name});}else{await saveDataAsset(file.type.startsWith('video/')?'video':'file',file.name,'',file.type||'application/octet-stream',{original_name:file.name,description:'El archivo completo permanece en el dispositivo desde el que se importó.'});}}catch(e){showToast(e.message,'error');}event.target.value='';});
    $('#copyCanonButton').addEventListener('click',async()=>{await navigator.clipboard.writeText(makeCanon());showToast('Canon copiado.');});
    $('#downloadCanonButton').addEventListener('click',()=>downloadText(makeCanon(),`${safeFileName(state.world.name)}-biblia-creativa.md`,'text/markdown'));

    $('#connectAiButton')?.addEventListener('click',async()=>{await checkAi();showToast(aiConnected ? 'OpenAI está conectado.' : 'La clave segura todavía no está activa.');});
    $('#disconnectAiButton')?.addEventListener('click',()=>showToast('La clave solo puede eliminarse desde los secretos del repositorio de GitHub.'));
    $('#resetWorldButton').addEventListener('click',async()=>{const word=prompt('Esta acción sustituirá el único mundo compartido. Escribe RESTABLECER para continuar.');if(word!=='RESTABLECER')return;try{const r=await api('reset-world',{method:'POST'});applySnapshot(r,true);showToast('Mundo inicial restaurado.');}catch(e){showToast(e.message,'error');}});

    document.addEventListener('input',(event)=>{const input=event.target.closest('[data-path]');if(input&&!input.dataset.bound){queuePatch(pathArray(input.dataset.path),valueFromInput(input));}});
    window.addEventListener('beforeunload',()=>localCache());
  }

  function activateStudio(type) {
    $$('#studioTabs [data-studio]').forEach((b)=>b.classList.toggle('active',b.dataset.studio===type));
    $$('[data-studio-panel]').forEach((p)=>p.classList.toggle('active',p.dataset.studioPanel===type));
  }

  async function boot() {
    wireEvents();
    await loadFamilyArt();
    $('#loginName').value = localStorage.getItem(NAME_KEY) || '';
    bindStaticStateInputsLater();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
    const resumed = await resumeSession();
    if (resumed) await enterApp(resumed);
    else { $('#loginScreen').classList.remove('hidden'); $('#appShell').classList.add('hidden'); }
  }

  function bindStaticStateInputsLater() {
    // Static data-path controls are bound after state arrives in renderAll.
  }

  boot();
})();