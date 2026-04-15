# Estrategia de recursos visuales (imágenes) — Simulador Saber 11

---

## 1. Por qué las imágenes son estructurales, no decorativas

En el examen Saber 11 real, las imágenes no acompañan al texto: **son el contexto mismo**. Un estudiante que no puede interpretar una gráfica cartesiana, una infografía o un aviso público en inglés no puede siquiera abordar el enunciado. Por lo tanto, el simulador debe tratar los recursos visuales como componentes de primera clase del ítem, tan críticos como el texto del enunciado.

### Inventario de recursos visuales por área (extraído de los documentos ICFES)

| Área | Tipo de recurso visual | Frecuencia | Función pedagógica |
|---|---|---|---|
| **Lectura Crítica** | Infografías de datos, cómics/historietas, caricaturas editoriales, tablas comparativas, esquemas de procesos, publicidad | Alta (~30% de ítems) | Son "textos discontinuos" que exigen lectura no lineal y alfabetización visual |
| **Matemáticas** | Gráficas cartesianas (barras, líneas, dispersión), polígonos de frecuencia, diagramas de torta, planos geométricos, figuras 3D, tablas de datos, esquemas de probabilidad | Muy alta (~50% de ítems) | La información cuantitativa se presenta visualmente; interpretar la gráfica ES la competencia |
| **Ciencias Naturales** | Diagramas de cuerpo libre, esquemas de circuitos, representaciones moleculares, cadenas tróficas, gráficas de laboratorio (velocidad-tiempo, presión-volumen), tablas de datos experimentales, esquemas de ecosistemas | Muy alta (~60% de ítems) | Representan modelos abstractos (electrones, fuerzas, enlaces) que no existen visualmente |
| **Sociales y Ciudadanas** | Mapas geográficos/temáticos, caricaturas políticas, líneas de tiempo, tablas estadísticas demográficas, diagramas de estructura del Estado, infografías de indicadores | Media (~25% de ítems) | Contextualizan espacial y temporalmente los problemas sociales |
| **Inglés** | Avisos públicos fotografiados (señales, menús, horarios), ilustraciones de situaciones cotidianas, tablas léxicas, imágenes de artículos periodísticos | Alta en partes 1-3 (~70%), baja en 4-7 | Simulan la experiencia real de encontrarse con inglés en el entorno urbano |

---

## 2. Los tres orígenes de imágenes

El sistema maneja tres fuentes de recursos visuales, cada una con un flujo diferente:

### 2.1 Origen A — Upload manual (Docente / Admin)

Cuando un docente o administrador crea una pregunta manual, puede adjuntar imágenes desde su dispositivo. Este es el flujo más controlado y el que produce la mayor calidad.

**Flujo:**

```
Docente abre editor de preguntas
    │
    ▼
Arrastra/suelta imagen o usa file picker
    │
    ▼
Frontend valida:
  - Formato: PNG, JPG, SVG, WebP
  - Tamaño máximo: 5 MB
  - Dimensiones mínimas: 400x300px
  - Ratio máximo: 3:1 (evitar imágenes extremadamente alargadas)
    │
    ▼
Se sube al Media Processing Service
    │
    ▼
Processing:
  - Compresión inteligente (WebP para raster, mantener SVG)
  - Generación de thumbnail (200px ancho)
  - Generación de versión HD (max 1200px ancho)
  - Extracción de texto embebido (OCR) para indexación
    │
    ▼
Se almacena en Object Storage con URL firmada
    │
    ▼
Se vincula a la pregunta en question_media
```

**Interfaz del editor (campos por imagen):**

```
┌─────────────────────────────────────────────┐
│  [📎 Arrastrar imagen aquí o hacer clic]    │
│                                              │
│  Tipo de recurso: [Gráfica ▼]               │
│  Texto alternativo: [Gráfica de barras que  │
│   muestra la población de 5 ciudades...]    │
│  Posición en el contexto: [Antes del texto ▼]│
│  ¿Es indispensable para resolver?: [✓ Sí]   │
└─────────────────────────────────────────────┘
```

El campo "Texto alternativo" es **obligatorio** — es crítico tanto para accesibilidad (estudiantes con discapacidad visual, alineado con las políticas de inclusión del ICFES) como para que el AI Generator pueda entender qué muestra la imagen al generar preguntas que la referencien.

### 2.2 Origen B — SVG programático (AI Generator)

Aquí está la innovación central: para las categorías de imagen que son **datos estructurados representados visualmente** (gráficas, tablas, diagramas, esquemas), el AI Generator no necesita generar una imagen raster. Genera un **SVG o HTML renderizable** directamente desde los datos.

**Tipos de imagen que se generan programáticamente:**

| Tipo | Tecnología | Ejemplo |
|---|---|---|
| Gráfica de barras / líneas / dispersión | SVG + datos JSON | "Producción agrícola 2020-2025 por departamento" |
| Tabla de datos | HTML renderizado → captura PNG | "Velocidad del sonido en distintos medios" |
| Diagrama de cuerpo libre | SVG con vectores de fuerza | "Bloque en plano inclinado con fricción" |
| Esquema de circuito simple | SVG con componentes estandarizados | "Circuito en serie con 2 resistencias y fuente" |
| Cadena trófica | SVG con nodos y flechas | "Red trófica de ecosistema de manglar" |
| Gráfica de probabilidad | SVG con espacio muestral | "Diagrama de árbol para extracción con reposición" |
| Línea de tiempo | SVG con eventos posicionados | "Hechos clave del proceso de independencia" |
| Estructura del Estado | SVG con jerarquía de poderes | "Ramas del poder público en Colombia" |
| Aviso público (Inglés) | HTML estilizado → captura PNG | "School library hours - Monday to Friday" |
| Mapa temático simplificado | SVG con regiones coloreadas | "Mapa de Colombia con departamentos resaltados" |

**Cómo funciona el pipeline de generación:**

```python
# El LLM genera datos estructurados, NO la imagen
AI_PROMPT_WITH_VISUAL = """
Genera una pregunta de Matemáticas (competencia: Interpretación y 
Representación) que requiera interpretar una gráfica.

En el campo "visual_data" genera un JSON con los datos de la gráfica.
NO generes la imagen; el sistema la renderiza automáticamente.

Ejemplo de visual_data para una gráfica de barras:
{
  "chart_type": "bar",
  "title": "Ventas trimestrales 2025",
  "x_axis": {"label": "Trimestre", "values": ["Q1", "Q2", "Q3", "Q4"]},
  "y_axis": {"label": "Ventas (millones COP)", "min": 0, "max": 500},
  "series": [
    {"name": "Producto A", "values": [120, 200, 180, 350]},
    {"name": "Producto B", "values": [90, 150, 220, 280]}
  ]
}
"""
```

**Ventajas de este enfoque:**

1. **Precisión total**: Los datos de la gráfica son exactos (no hay alucinaciones visuales de un modelo generativo de imágenes).
2. **Consistencia visual**: Todas las gráficas usan el mismo sistema de diseño (colores, tipografía, ejes).
3. **Accesibilidad nativa**: Los datos subyacentes generan automáticamente un `alt-text` preciso.
4. **Editabilidad**: Un docente puede modificar los datos sin recrear la imagen.
5. **Rendimiento**: SVG se renderiza instantáneamente en el navegador, sin cargar archivos pesados.
6. **Versionamiento**: Se almacenan los datos JSON; la imagen se regenera al vuelo.

### 2.3 Origen C — Asset Library (Banco curado)

Para imágenes que no son generables programáticamente (fotografías de avisos reales, caricaturas editoriales, mapas detallados), el sistema mantiene una biblioteca de assets reutilizables.

**Categorías del banco:**

```
asset_library/
├── english/
│   ├── public_signs/        # "No parking", "Library hours", menús
│   ├── everyday_scenes/     # Oficina de correos, aeropuerto, escuela
│   └── advertisements/      # Afiches publicitarios ficticios
├── social_studies/
│   ├── maps/               # Mapas de Colombia, mundo, regiones
│   ├── political_cartoons/ # Caricaturas editoriales (licenciadas o propias)
│   └── historical_photos/  # Fotografías históricas de dominio público
├── natural_sciences/
│   ├── lab_equipment/      # Fotos de microscopios, probetas, termómetros
│   ├── organisms/          # Fotografías de organismos para ecología
│   └── phenomena/          # Volcanes, eclipses, cristales
└── critical_reading/
    ├── infographics/       # Infografías creadas específicamente
    ├── comics/             # Cómics/historietas originales
    └── advertisements/     # Publicidad ficticia para análisis
```

**Modelo de datos del asset:**

```sql
CREATE TABLE visual_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,       -- 'english/public_signs'
    subcategory VARCHAR(50),
    filename VARCHAR(200) NOT NULL,
    storage_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Metadatos para búsqueda
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,           -- Descripción detallada del contenido
    alt_text TEXT NOT NULL,              -- Para accesibilidad
    tags TEXT[],                         -- ['mapa', 'colombia', 'departamentos']
    
    -- Uso
    applicable_areas TEXT[] NOT NULL,    -- ['MAT', 'CN']
    applicable_competencies TEXT[],
    mcer_level VARCHAR(5),              -- Solo para inglés
    
    -- Licencia
    license_type VARCHAR(30) NOT NULL,  -- 'ORIGINAL', 'CC_BY', 'PUBLIC_DOMAIN'
    attribution TEXT,
    
    -- Estado
    times_used INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    uploaded_by_user_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**El docente busca assets al crear preguntas:**

```
┌─────────────────────────────────────────────┐
│  🔍 Buscar en banco de imágenes:            │
│  [mapa colombia departamentos         ] [🔍] │
│                                              │
│  Filtros: Área [Sociales ▼] Tipo [Mapa ▼]   │
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │      │  │      │  │      │  │      │    │
│  │ 🗺️  │  │ 🗺️  │  │ 🗺️  │  │ 🗺️  │    │
│  │      │  │      │  │      │  │      │    │
│  ├──────┤  ├──────┤  ├──────┤  ├──────┤    │
│  │Col.  │  │Col.  │  │Caribe│  │Andina│    │
│  │polít.│  │físic.│  │      │  │      │    │
│  └──────┘  └──────┘  └──────┘  └──────┘    │
│  [Seleccionar]                               │
└─────────────────────────────────────────────┘
```

---

## 3. Modelo de datos actualizado para question_media

```sql
CREATE TABLE question_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    
    -- Tipo y origen
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN (
        'chart',           -- Gráfica (barras, líneas, dispersión, torta)
        'table',           -- Tabla de datos
        'diagram',         -- Diagrama (cuerpo libre, circuito, cadena trófica)
        'map',             -- Mapa geográfico/temático
        'infographic',     -- Infografía compleja
        'comic',           -- Cómic, historieta, caricatura
        'public_sign',     -- Aviso público (Inglés partes 1-3)
        'photograph',      -- Foto real (laboratorio, organismo, etc.)
        'timeline',        -- Línea de tiempo
        'state_structure', -- Estructura organizacional/estatal
        'geometric_figure',-- Figura geométrica/plano
        'probability_diagram' -- Diagrama de árbol, espacio muestral
    )),
    
    source VARCHAR(20) NOT NULL CHECK (source IN (
        'UPLOAD',          -- Subido por docente/admin
        'PROGRAMMATIC',    -- Generado por SVG/HTML desde datos
        'ASSET_LIBRARY'    -- Tomado del banco curado
    )),
    
    -- Referencia al almacenamiento
    storage_url TEXT,                    -- URL del archivo (UPLOAD y ASSET)
    thumbnail_url TEXT,
    asset_id UUID REFERENCES visual_assets(id),  -- Si viene del banco
    
    -- Datos programáticos (si source = PROGRAMMATIC)
    visual_data JSONB,                   -- Datos estructurados para renderizar
    render_engine VARCHAR(20) CHECK (render_engine IN (
        'chart_js',        -- Para gráficas estadísticas
        'svg_template',    -- Para diagramas, figuras geométricas
        'html_template',   -- Para tablas, avisos, señales
        'map_renderer',    -- Para mapas temáticos
        'timeline_renderer'-- Para líneas de tiempo
    )),
    
    -- Metadatos de accesibilidad (SIEMPRE obligatorios)
    alt_text TEXT NOT NULL,              -- Descripción textual completa
    alt_text_detailed TEXT,              -- Descripción extendida para screen readers
    is_essential BOOLEAN DEFAULT TRUE,   -- ¿Se necesita para resolver la pregunta?
    
    -- Posición y presentación
    position INT DEFAULT 0,              -- Orden si hay múltiples medios
    display_mode VARCHAR(20) DEFAULT 'INLINE' CHECK (display_mode IN (
        'INLINE',          -- Dentro del flujo del contexto
        'ABOVE_STEM',      -- Entre contexto y enunciado
        'FULL_WIDTH',      -- Ancho completo del contenedor
        'SIDE_BY_SIDE'     -- Junto a texto (para comparaciones)
    )),
    caption TEXT,                        -- Pie de imagen/fuente
    
    -- Dimensiones sugeridas
    width_px INT,
    height_px INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Renderizado programático — Engines por tipo

### 4.1 Chart Engine (gráficas estadísticas)

Usa Chart.js en el frontend para renderizar datos JSON en gráficas interactivas.

**Estructura de `visual_data` para gráficas:**

```json
{
  "chart_type": "bar",
  "title": "Distribución de edades en municipio X",
  "x_axis": {
    "label": "Rango de edad",
    "values": ["0-14", "15-29", "30-44", "45-59", "60+"]
  },
  "y_axis": {
    "label": "Porcentaje de población",
    "min": 0,
    "max": 40,
    "unit": "%"
  },
  "series": [
    {
      "name": "Hombres",
      "values": [28, 24, 22, 16, 10],
      "color": "#378ADD"
    },
    {
      "name": "Mujeres",
      "values": [26, 25, 23, 15, 11],
      "color": "#D4537E"
    }
  ],
  "source_caption": "Fuente: DANE, Censo Nacional 2018 (datos ficticios)"
}
```

**Tipos de gráfica soportados:** `bar`, `line`, `scatter`, `pie`, `histogram`, `box_plot`, `area`, `stacked_bar`.

### 4.2 SVG Template Engine (diagramas científicos y técnicos)

Para diagramas que requieren posicionamiento preciso de elementos (vectores de fuerza, circuitos, cadenas tróficas), el sistema usa plantillas SVG parametrizables.

**Ejemplo — Diagrama de cuerpo libre:**

```json
{
  "template": "free_body_diagram",
  "object": {
    "shape": "block",
    "position": {"x": 300, "y": 200},
    "mass_label": "5 kg",
    "surface": "inclined_plane",
    "angle_deg": 30
  },
  "forces": [
    {"type": "weight", "magnitude": "mg", "direction": "down"},
    {"type": "normal", "magnitude": "N", "direction": "perpendicular_to_surface"},
    {"type": "friction", "magnitude": "f", "direction": "along_surface_upward"},
    {"type": "applied", "magnitude": "F", "direction": "along_surface_downward", "value": "20 N"}
  ],
  "annotations": [
    {"type": "angle", "value": "30°", "position": "base"}
  ]
}
```

El SVG Template Engine tiene plantillas para:

- `free_body_diagram` — Diagramas de cuerpo libre con vectores
- `circuit` — Circuitos eléctricos con componentes estándar
- `trophic_chain` — Cadenas/redes tróficas con niveles
- `molecular_structure` — Representaciones de moléculas simples
- `ecosystem_flow` — Flujos de materia/energía en ecosistemas
- `cell_diagram` — Esquema celular simplificado
- `wave_diagram` — Representación de ondas (longitud, amplitud, frecuencia)
- `geometric_figure` — Figuras geométricas con medidas y ángulos
- `probability_tree` — Diagramas de árbol probabilístico
- `venn_diagram` — Diagramas de Venn para conjuntos

### 4.3 HTML Template Engine (avisos y tablas)

Para Inglés (partes 1-3 especialmente) y tablas de datos.

**Ejemplo — Aviso público para Inglés Parte 1:**

```json
{
  "template": "public_sign",
  "style": "institutional_notice",
  "content": {
    "header": "RIVERSIDE PUBLIC LIBRARY",
    "body": "Opening hours:\nMonday to Friday: 8:00 a.m. - 6:00 p.m.\nSaturday: 9:00 a.m. - 1:00 p.m.\nClosed on Sundays and public holidays",
    "footer": "Free WiFi available for all visitors"
  },
  "visual_style": {
    "background": "#F5F0E8",
    "border": true,
    "icon": "library"
  }
}
```

El HTML se renderiza en un contenedor controlado y se captura como PNG para almacenamiento estático (fallback para navegadores antiguos), pero se entrega como HTML en vivo al frontend moderno para máxima nitidez.

### 4.4 Map Renderer (mapas temáticos)

Usa un juego de SVGs base de Colombia (departamentos, regiones naturales, hidrografía) con overlay de datos temáticos.

```json
{
  "template": "colombia_departments",
  "highlighted": ["ANTIOQUIA", "VALLE_DEL_CAUCA", "CUNDINAMARCA"],
  "highlight_color": "#D85A30",
  "labels": {
    "ANTIOQUIA": "32%",
    "VALLE_DEL_CAUCA": "28%",
    "CUNDINAMARCA": "40%"
  },
  "legend": "Porcentaje de producción industrial por departamento",
  "source_caption": "Fuente: Datos ficticios para uso educativo"
}
```

---

## 5. Prompt engineering para preguntas con imagen (AI Generator)

Cuando el AI Generator necesita crear una pregunta que requiera una imagen, el prompt se estructura en dos fases:

### Fase 1 — Generación de datos + pregunta

```python
AI_VISUAL_QUESTION_PROMPT = """
Genera una pregunta de {area} que REQUIERA interpretar un recurso visual 
para ser resuelta. El estudiante NO puede responder correctamente sin 
analizar el recurso visual.

COMPETENCIA: {competency}
EVIDENCIA: {evidence}
TIPO DE RECURSO VISUAL: {visual_type}

INSTRUCCIONES PARA EL RECURSO VISUAL:
1. En el campo "visual_data", genera los DATOS ESTRUCTURADOS que describen 
   el recurso visual (NO una URL ni una descripción; datos puros).
2. Usa el formato JSON del render_engine "{render_engine}".
3. Los datos deben ser realistas pero ficticios.
4. El recurso visual debe contener información SUFICIENTE para que las 
   4 opciones de respuesta sean evaluables a partir de él.

INSTRUCCIONES PARA LOS DISTRACTORES CON IMAGEN:
- Al menos un distractor debe explotar un error de LECTURA del recurso 
  visual (ej: confundir ejes, leer mal la escala, ignorar la leyenda).
- Al menos un distractor debe representar una interpretación PARCIAL 
  correcta del recurso (ej: leer solo una serie de datos, ignorar la 
  tendencia global).

INSTRUCCIONES PARA EL CONTEXTO:
- El campo "context" debe REFERENCIAR el recurso visual explícitamente
  (ej: "La siguiente gráfica muestra...", "Observe el siguiente diagrama...",
  "A partir de la información presentada en la tabla...").
- El contexto NO debe describir textualmente lo que la imagen muestra.
  El estudiante debe LEER la imagen, no leer una descripción de la imagen.

INSTRUCCIONES PARA alt_text:
- Genera un alt_text COMPLETO que permita a un estudiante con discapacidad 
  visual comprender el recurso. Debe incluir todos los datos numéricos y 
  relaciones presentes en la imagen.

Responde SOLO con JSON.
"""
```

### Fase 2 — Validación automática de coherencia imagen-pregunta

```python
def validate_visual_question(question_data):
    """
    Verifica que la imagen y la pregunta sean coherentes.
    """
    checks = []
    
    # 1. ¿El contexto referencia explícitamente el recurso visual?
    visual_refs = ['gráfica', 'diagrama', 'tabla', 'mapa', 'imagen', 
                   'figura', 'esquema', 'aviso', 'infografía']
    has_ref = any(ref in question_data['context'].lower() for ref in visual_refs)
    checks.append(('context_references_visual', has_ref))
    
    # 2. ¿Los datos de la imagen son suficientes para evaluar todas las opciones?
    # (Validación heurística: todas las opciones deben contener valores 
    #  que aparezcan o puedan derivarse de los datos visuales)
    
    # 3. ¿Hay alt_text?
    checks.append(('has_alt_text', bool(question_data.get('alt_text'))))
    
    # 4. ¿El alt_text contiene los datos clave de la imagen?
    if question_data.get('visual_data', {}).get('series'):
        for series in question_data['visual_data']['series']:
            for val in series['values']:
                if str(val) not in question_data.get('alt_text', ''):
                    checks.append(('alt_text_has_data', False))
                    break
    
    # 5. ¿Es posible renderizar el visual_data con el engine indicado?
    engine = question_data.get('render_engine')
    try:
        render_preview(engine, question_data['visual_data'])
        checks.append(('renderable', True))
    except RenderError:
        checks.append(('renderable', False))
    
    return all(ok for _, ok in checks), checks
```

---

## 6. Entrega al frontend — Renderizado dual

El frontend recibe la pregunta y renderiza las imágenes de dos maneras según el origen:

### Para imágenes estáticas (UPLOAD, ASSET_LIBRARY):

```tsx
<QuestionMedia 
  type="photograph"
  src={media.storage_url}
  alt={media.alt_text}
  caption={media.caption}
  displayMode={media.display_mode}
  lazyLoad={true}
  fallbackSrc={media.thumbnail_url}
/>
```

### Para imágenes programáticas (PROGRAMMATIC):

```tsx
function ProgrammaticMedia({ media }) {
  switch (media.render_engine) {
    case 'chart_js':
      return (
        <ChartRenderer 
          data={media.visual_data}
          alt={media.alt_text}
          interactive={false}  // No interactivo durante examen
        />
      );
    case 'svg_template':
      return (
        <SVGDiagramRenderer
          template={media.visual_data.template}
          params={media.visual_data}
          alt={media.alt_text}
        />
      );
    case 'html_template':
      return (
        <HTMLCardRenderer
          template={media.visual_data.template}
          content={media.visual_data.content}
          style={media.visual_data.visual_style}
          alt={media.alt_text}
        />
      );
    case 'map_renderer':
      return (
        <ColombiaMapRenderer
          data={media.visual_data}
          alt={media.alt_text}
        />
      );
  }
}
```

**Regla crítica de seguridad**: Durante un examen, las gráficas programáticas se renderizan como **no interactivas** (sin tooltip al hover, sin zoom, sin clic en series de datos). El estudiante debe leer la gráfica visualmente, igual que en el examen real en papel. Fuera de examen (en modo repaso), sí se permite interactividad.

---

## 7. Generación de imágenes con IA generativa (cuándo y cuándo NO)

### Cuándo NO usar IA generativa de imágenes (Stable Diffusion, DALL-E, etc.):

- **Nunca para gráficas de datos**: La IA generativa inventa números, ejes incorrectos y escalas incoherentes. Siempre usar renderizado programático desde datos exactos.
- **Nunca para diagramas científicos**: Un diagrama de cuerpo libre necesita vectores con magnitudes precisas. La IA generativa no garantiza precisión.
- **Nunca para mapas**: Un mapa de Colombia generado por IA podría tener departamentos incorrectos.
- **Nunca para tablas**: Las tablas generadas por IA contienen texto ilegible o datos inconsistentes.

### Cuándo SÍ puede considerarse IA generativa:

- **Avisos públicos estilizados para Inglés**: Se puede usar como punto de partida, pero SIEMPRE con revisión y edición humana posterior.
- **Ilustraciones de escenas para contexto**: Una escena de un mercado para ambientar una pregunta de Inglés.
- **Caricaturas editoriales**: Con las limitaciones propias de derechos y sesgo, y siempre marcadas como generadas por IA.

**Política del sistema**: Las imágenes generadas con IA generativa entran al banco SIEMPRE en estado `PENDING_REVIEW` y requieren aprobación explícita de un docente o admin antes de poder usarse en preguntas.

---

## 8. Accesibilidad — Cumplimiento inclusivo alineado al ICFES

El ICFES proporciona kits tiflológicos y lectores profesionales para estudiantes con discapacidad visual. El simulador debe ofrecer equivalentes digitales:

### Para cada imagen:

1. **`alt_text` obligatorio** (1-2 oraciones): descripción funcional para screen readers.
2. **`alt_text_detailed` opcional** (1-2 párrafos): descripción completa con todos los datos numéricos, relaciones y patrones visibles. Se activa con un botón "Descripción detallada".
3. **Tabla de datos accesible**: Para gráficas programáticas, un toggle que muestra los datos subyacentes como tabla HTML nativa (navegable con teclado).
4. **Contraste mínimo 4.5:1** en todos los textos sobre imagen.
5. **No depender solo del color**: Patrones (rayas, puntos) además de colores en gráficas de múltiples series.

### Ejemplo de alt_text vs alt_text_detailed:

```
alt_text: "Gráfica de barras comparando la producción agrícola de 5 
departamentos de Colombia entre 2020 y 2025."

alt_text_detailed: "Gráfica de barras verticales con dos series: 
producción 2020 (azul) y producción 2025 (naranja). Eje horizontal: 
Antioquia, Valle del Cauca, Cundinamarca, Boyacá, Nariño. Eje vertical: 
millones de toneladas, escala de 0 a 500. Antioquia: 320 en 2020, 
410 en 2025 (incremento 28%). Valle del Cauca: 280 en 2020, 350 en 
2025 (incremento 25%). Cundinamarca: 200 en 2020, 180 en 2025 
(decremento 10%). Boyacá: 150 en 2020, 220 en 2025 (incremento 47%). 
Nariño: 120 en 2020, 190 en 2025 (incremento 58%). La tendencia 
general muestra crecimiento en todos los departamentos excepto 
Cundinamarca."
```

---

## 9. Object Storage y CDN

### Estructura del almacenamiento:

```
s3://saber11-media/
├── uploads/                      # Imágenes subidas por docentes
│   ├── {question_id}/
│   │   ├── original/             # Archivo original
│   │   ├── optimized/            # WebP comprimido
│   │   └── thumbnail/            # 200px miniatura
├── assets/                       # Banco curado
│   ├── english/
│   ├── social_studies/
│   ├── natural_sciences/
│   └── critical_reading/
├── programmatic_cache/           # Cache de renders programáticos (PNG fallback)
│   ├── charts/
│   ├── diagrams/
│   └── maps/
└── ai_generated/                 # Imágenes de IA generativa (marcadas)
    └── pending_review/
```

### CDN y performance:

- Todas las imágenes se sirven vía CDN con cache-control de 30 días.
- Lazy loading con Intersection Observer para imágenes debajo del fold.
- Placeholder blur (LQIP de 20px) mientras carga la imagen HD.
- Las imágenes programáticas (SVG/Chart.js) no necesitan CDN — se renderizan client-side.
- Formato preferido: WebP con fallback PNG para navegadores antiguos.

---

## 10. Resumen de la arquitectura visual por tipo de pregunta

| Escenario | Origen | Engine | Formato final | Editable |
|---|---|---|---|---|
| Docente sube foto de montaje de laboratorio | UPLOAD | — | WebP (CDN) | Reemplazar archivo |
| IA genera pregunta con gráfica de barras | PROGRAMMATIC | chart_js | SVG en vivo (client) | Editar JSON de datos |
| IA genera pregunta con diagrama de cuerpo libre | PROGRAMMATIC | svg_template | SVG parametrizado | Editar fuerzas/ángulos |
| IA genera pregunta de Inglés con aviso público | PROGRAMMATIC | html_template | HTML renderizado | Editar texto del aviso |
| Docente selecciona mapa de Colombia del banco | ASSET_LIBRARY | — | SVG estático (CDN) | Reusar con highlight diferente |
| IA genera pregunta con cadena trófica | PROGRAMMATIC | svg_template | SVG parametrizado | Editar organismos/flechas |
| Docente sube caricatura editorial escaneada | UPLOAD | — | WebP (CDN) | Reemplazar archivo |
| IA genera pregunta con tabla de datos | PROGRAMMATIC | html_template | HTML tabla nativa | Editar celdas |
