# Elyndeyra Glaciriven Chizeuskia — el Mundo de las Siete Torres

Primera edición jugable de exploración 3D para navegador. Proyecto independiente de Mi mundo Mágico v2.

## Jugar
Abre la dirección publicada /juego-3d/ con Safari o Chrome compatible con WebGL 2. En móvil se recomienda orientación horizontal. La primera carga necesita Internet; el navegador puede conservar los recursos para otras visitas.

Controles: WASD/flechas, arrastrar ratón para cámara, rueda para zoom, Shift correr, Espacio saltar, F poder, E interactuar, R evolución elemental, 1–7 cambiar personaje, M mapa, P fotografía, Escape pausa. En móvil: palanca izquierda, arrastrar sobre el escenario para mirar, retratos y botones de acción.

## Aventura
Explora siete biomas, activa tres símbolos con el guardián correcto en cada santuario y regresa al cristal central. Incluye 42 ecos coleccionables, estelas de historia, portales, tren, compañeros, evolución elemental y tres momentos del día.

## Alcance
Juego individual disponible por web: no incluye multijugador ni guardado de partidas en un servidor. El progreso se guarda en el navegador y puede exportarse/importarse como JSON. Las credenciales y los datos de v2 no se leen ni se modifican. No depende de Supabase ni OpenAI ni contiene claves API.

Los modelos son 3D procedurales originales inspirados en los rasgos del canon; no son réplicas fotográficas ni producción AAA. Resolución adaptativa según dispositivo. No garantiza 4K ni 60 fps.

## Ejecutar desde el código
Con Python 3 instalado, dentro de esta carpeta ejecuta `python -m http.server 8080` y abre http://localhost:8080. No abrir index.html como file://: los módulos necesitan HTTP.

## Licencias
Motor Three.js 0.180.0 (MIT): vendor/THREE-LICENSE.txt. El resto del código y modelos del juego se ha creado para este proyecto. Los retratos se recortan de la ilustración familiar aportada por el propietario.
