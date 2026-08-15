(() => {
  'use strict';

  const appParts = [
    'chunks/app-gz-00.txt',
    'chunks/app-gz-01.txt'
  ];

  const imageParts = [
    'chunks/image-00.txt',
    'chunks/image-01.txt',
    'chunks/image-02.txt',
    'chunks/image-03.txt',
    'chunks/image-04.txt'
  ];

  const readParts = async (paths) => {
    const pieces = await Promise.all(paths.map(async (path) => {
      const response = await fetch(path, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`${path}: error ${response.status}`);
      return (await response.text()).replace(/\s+/g, '');
    }));
    return pieces.join('');
  };

  const setHeroImage = async () => {
    try {
      const image64 = await readParts(imageParts);
      document.documentElement.style.setProperty(
        '--hero-image',
        `url("data:image/webp;base64,${image64}")`
      );
    } catch (error) {
      console.warn('La ilustración de referencia no se pudo cargar.', error);
    }
  };

  const loadApplication = async () => {
    const base64 = await readParts(appParts);
    const binary = atob(base64);
    const compressed = Uint8Array.from(binary, character => character.charCodeAt(0));

    if (!('DecompressionStream' in window)) {
      throw new Error('Actualiza Safari, Chrome o Edge para abrir esta aplicación.');
    }

    const stream = new Blob([compressed])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'));
    const source = await new Response(stream).text();
    (0, eval)(`${source}\n//# sourceURL=mi-mundo-magico-app.js`);
  };

  Promise.allSettled([setHeroImage(), loadApplication()]).then((results) => {
    const appResult = results[1];
    if (appResult.status === 'rejected') {
      console.error(appResult.reason);
      const boot = document.getElementById('boot');
      if (boot) {
        const message = String(appResult.reason?.message || appResult.reason || 'Error desconocido');
        boot.innerHTML = `<div class="notice error"><strong>No se pudo abrir Mi Mundo Mágico.</strong><br>${message}<br><br>Recarga la página o prueba con Safari, Chrome o Edge actualizados.</div>`;
      }
    }
  });
})();
