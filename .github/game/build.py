from pathlib import Path
from io import BytesIO
import base64, hashlib, json, lzma, sys
from PIL import Image, ImageOps

root=Path(sys.argv[1])
root.mkdir(parents=True,exist_ok=True)
parts=sorted(Path('game-release').glob('part-*.txt'))
assert len(parts)==5, 'Faltan partes del juego'
encoded=''.join(p.read_text().strip() for p in parts)
data=base64.b64decode(encoded)
assert hashlib.sha256(data).hexdigest()=='a3b24e82e1e77df552abaa4dbca7c83ff38b9e4c617933cee8099266b8068a3d', 'Integridad del paquete incorrecta'
files=json.loads(lzma.decompress(data))
for name,text in files.items():
    assert '..' not in Path(name).parts and not Path(name).is_absolute()
    path=root/name
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding='utf-8')
assets=root/'assets'
assets.mkdir(exist_ok=True)
imgdata=base64.b64decode(''.join(''.join(Path(f'chunks/image-{i:02}.txt').read_text().split()) for i in range(5)))
img=Image.open(BytesIO(imgdata)).convert('RGB')
img.thumbnail((1408,1056),Image.Resampling.LANCZOS)
img.save(assets/'family.webp',quality=84)
crops={'elendil':(172,101,361,375),'feyre':(382,209,549,453),'glacial':(546,350,716,580),'chispa':(721,335,896,580),'zeus':(920,326,1073,565),'riven':(1081,335,1233,559),'sky':(601,657,747,845)}
for name,box in crops.items():
    x1,y1,x2,y2=box
    b=(int(x1*img.width/1408),int(y1*img.height/1056),int(x2*img.width/1408),int(y2*img.height/1056))
    im=ImageOps.fit(img.crop(b),(224,300),Image.Resampling.LANCZOS)
    im.save(assets/f'{name}.webp',quality=88)
(root/'README.md').write_text('''# Elyndeyra Glaciriven Chizeuskia — el Mundo de las Siete Torres

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
''',encoding='utf-8')
print('Fuentes verificadas:',len(files),'Imagen:',img.size)
