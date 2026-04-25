import { API_BASE } from "../services/api";
import EnglishContextBlock from "./english/EnglishContextBlock";

type RenderableQuestionMedia = {
  id: string;
  media_type: string;
  source: string;
  storage_url?: string | null;
  thumbnail_url?: string | null;
  visual_data?: string | null;
  render_engine?: string | null;
  alt_text: string;
  alt_text_detailed?: string | null;
  is_essential?: boolean;
  position?: number;
  display_mode?: string;
  caption?: string | null;
  width_px?: number | null;
  height_px?: number | null;
};

interface QuestionContextMediaProps {
  media: RenderableQuestionMedia[];
  context?: string | null;
  contextType?: string | null;
  componentName?: string | null;
  compact?: boolean;
}

type ChartDataset = {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  tension?: number;
  fill?: boolean;
};

type GeoShape =
  | { type: "rect"; x: number; y: number; width: number; height: number; fill?: string; stroke?: string; label?: string }
  | { type: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; label?: string }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; stroke?: string };

type GeoAnnotation =
  | { type: "text"; x: number; y: number; text: string; align?: string; fontSize?: number; fill?: string }
  | { type: "arrow"; from: { x: number; y: number }; to: { x: number; y: number }; stroke?: string };

type ParsedVisualData =
  | { kind: "html"; markup: string }
  | { kind: "chart"; chartType: string; chart: { labels: string[]; datasets: ChartDataset[] } }
  | { kind: "table"; table: { headers: string[]; rows: Array<Array<string | number>> } }
  | { kind: "geometric"; shapes: GeoShape[]; annotations: GeoAnnotation[] }
  | { kind: "params"; template: string; params: Record<string, unknown> }
  | { kind: "json"; value: unknown }
  | null;

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${API_BASE}${url}`;
}

function isChartDataset(value: unknown): value is ChartDataset {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { data?: unknown }).data)
  );
}

// ── Traducciones para templates y claves de parámetros ───────────────────────
const TEMPLATE_LABELS: Record<string, string> = {
  phase_change_altitude_comparison: "Comparación de cambio de fase por altitud",
  skate_ramp_energy: "Rampa de skate — Energía",
  energy_conservation: "Conservación de energía",
  projectile_motion: "Movimiento de proyectil",
  pendulum: "Péndulo",
  free_fall: "Caída libre",
  spring_mass: "Sistema masa-resorte",
  circuit_diagram: "Diagrama de circuito",
  wave_interference: "Interferencia de ondas",
  dna_replication: "Replicación de ADN",
  cell_division: "División celular",
  food_web: "Red trófica",
  ecosystem: "Ecosistema",
  water_cycle: "Ciclo del agua",
  carbon_cycle: "Ciclo del carbono",
  nitrogen_cycle: "Ciclo del nitrógeno",
  chemical_reaction: "Reacción química",
  periodic_table_region: "Región de la tabla periódica",
  acid_base_reaction: "Reacción ácido-base",
  titration_curve: "Curva de titulación",
};

const PARAM_LABELS: Record<string, string> = {
  // Genéricos
  name: "Nombre",
  label: "Etiqueta",
  value: "Valor",
  title: "Título",
  description: "Descripción",
  color: "Color",
  unit: "Unidad",
  // Física
  pointa_label: "Etiqueta Punto A",
  pointb_label: "Etiqueta Punto B",
  pointc_label: "Etiqueta Punto C",
  pointd_label: "Etiqueta Punto D",
  heighta: "Altura A",
  heightb: "Altura B",
  heightc: "Altura C",
  heightd: "Altura D",
  height: "Altura",
  mass: "Masa",
  velocity: "Velocidad",
  angle: "Ángulo",
  energy: "Energía",
  force: "Fuerza",
  gravity: "Gravedad",
  // Geografía / altitud
  altitude: "Altitud",
  city1: "Ciudad 1",
  city2: "Ciudad 2",
  city: "Ciudad",
  region: "Región",
  // Presión / temperatura
  p_atm_label: "Etiqueta presión atm.",
  p_atm_value: "Presión atmosférica",
  temp_boil: "Temperatura de ebullición",
  temperature: "Temperatura",
  pressure: "Presión",
  air_molecule_density: "Densidad de moléculas de aire",
  vapor_arrows: "Flechas de vapor",
  // Química
  reactant: "Reactivo",
  product: "Producto",
  catalyst: "Catalizador",
  concentration: "Concentración",
  ph: "pH",
  // Biología
  organism: "Organismo",
  population: "Población",
  habitat: "Hábitat",
  // Circuitos
  resistance: "Resistencia",
  voltage: "Voltaje",
  current: "Corriente",
  capacitance: "Capacitancia",
};

function translateKey(raw: string): string {
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
  return PARAM_LABELS[normalized] ?? TEMPLATE_LABELS[normalized] ?? null;
}

function formatKeyEs(raw: string): string {
  const translated = translateKey(raw);
  if (translated) return translated;
  return raw
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function unescapeUnicodeLiterals(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function extractHtmlEnvelope(raw: string): string | null {
  if (!raw.startsWith("{")) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (typeof obj.html !== "string") return null;
    return unescapeUnicodeLiterals(obj.html);
  } catch {
    return null;
  }
}

function tryParseTemplateParams(raw: string): ParsedVisualData | null {
  if (!raw.startsWith("{")) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    // geometric figure nested in template/params
    if (typeof obj.template === "string" && obj.params !== null && typeof obj.params === "object" && !Array.isArray(obj.params)) {
      const p = obj.params as Record<string, unknown>;
      if (Array.isArray(p.shapes)) {
        return {
          kind: "geometric",
          shapes: (p.shapes as unknown[]).map((s) => s as GeoShape),
          annotations: Array.isArray(p.annotations)
            ? (p.annotations as unknown[]).map((a) => a as GeoAnnotation)
            : [],
        };
      }
      return {
        kind: "params",
        template: obj.template,
        params: p,
      };
    }
    // direct {shapes, ...}
    if (Array.isArray(obj.shapes)) {
      return {
        kind: "geometric",
        shapes: (obj.shapes as unknown[]).map((s) => s as GeoShape),
        annotations: Array.isArray(obj.annotations)
          ? (obj.annotations as unknown[]).map((a) => a as GeoAnnotation)
          : [],
      };
    }
  } catch { /* not JSON */ }
  return null;
}

function parseVisualData(media: RenderableQuestionMedia): ParsedVisualData {
  const raw = media.visual_data?.trim();
  if (!raw) return null;

  if (media.render_engine === "svg_template" || raw.startsWith("<svg")) {
    // svg_template may carry {template, params} JSON instead of actual SVG
    const asTemplate = tryParseTemplateParams(raw);
    if (asTemplate) return asTemplate;
    return { kind: "html", markup: raw };
  }
  if (media.render_engine === "html_template" || raw.startsWith("<div") || raw.startsWith("<section") || raw.startsWith("<table")) {
    const inner = extractHtmlEnvelope(raw);
    return { kind: "html", markup: inner ?? raw };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // {shapes, annotations} — geometric figure (direct or nested in params)
    const geoSource = (
      Array.isArray(parsed.shapes) ? parsed :
      (parsed.params && typeof parsed.params === "object" && !Array.isArray(parsed.params) &&
       Array.isArray((parsed.params as Record<string, unknown>).shapes))
        ? parsed.params as Record<string, unknown>
        : null
    );
    if (geoSource) {
      return {
        kind: "geometric",
        shapes: (geoSource.shapes as unknown[]).map((s) => s as GeoShape),
        annotations: Array.isArray(geoSource.annotations)
          ? (geoSource.annotations as unknown[]).map((a) => a as GeoAnnotation)
          : [],
      };
    }

    // {template, params} — template-based diagram
    if (typeof parsed.template === "string" && parsed.params !== null && typeof parsed.params === "object" && !Array.isArray(parsed.params)) {
      return {
        kind: "params",
        template: parsed.template,
        params: parsed.params as Record<string, unknown>,
      };
    }

    // Direct top-level { type?, labels, datasets } — the format the AI generator produces
    if (Array.isArray(parsed.labels) && Array.isArray(parsed.datasets) && (parsed.datasets as unknown[]).every(isChartDataset)) {
      return {
        kind: "chart",
        chartType: typeof parsed.type === "string" ? parsed.type : "bar",
        chart: {
          labels: (parsed.labels as unknown[]).map((l) => String(l)),
          datasets: parsed.datasets as ChartDataset[],
        },
      };
    }

    // Nested { data: { labels, datasets } } — legacy format
    const nested = parsed.data as { labels?: unknown; datasets?: unknown } | undefined;
    if (nested && Array.isArray(nested.labels) && Array.isArray(nested.datasets) && (nested.datasets as unknown[]).every(isChartDataset)) {
      return {
        kind: "chart",
        chartType: typeof parsed.type === "string" ? parsed.type : "bar",
        chart: {
          labels: (nested.labels as unknown[]).map((l) => String(l)),
          datasets: nested.datasets as ChartDataset[],
        },
      };
    }

    if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
      return {
        kind: "table",
        table: {
          headers: (parsed.headers as unknown[]).map((h) => String(h)),
          rows: (parsed.rows as unknown[]).map((row) =>
            Array.isArray(row) ? row.map((cell) => (typeof cell === "number" ? cell : String(cell))) : [String(row)],
          ),
        },
      };
    }

    // { html: "..." } wrapper — AI generator sometimes stores HTML inside a JSON envelope
    if (typeof parsed.html === "string") {
      return { kind: "html", markup: unescapeUnicodeLiterals(parsed.html) };
    }

    return { kind: "json", value: parsed };
  } catch {
    return { kind: "json", value: raw };
  }
}

function renderProgrammaticMedia(media: RenderableQuestionMedia, compact: boolean) {
  const parsed = parseVisualData(media);
  if (!parsed) {
    return (
      <div className="rounded-2xl bg-surface-container-low px-4 py-5 text-sm text-secondary">
        Recurso programático sin preview disponible.
      </div>
    );
  }

  if (parsed.kind === "html") {
    return (
      <div
        className={`overflow-hidden rounded-2xl border border-outline-variant/15 bg-white ${compact ? "p-3" : "p-4"}`}
        dangerouslySetInnerHTML={{ __html: parsed.markup }}
      />
    );
  }

  if (parsed.kind === "chart") {
    const isLine = parsed.chartType === "line";

    // Each dataset may have a different axis (yAxisID). Group them by axis so we
    // can normalise each independently and avoid tiny values being invisible next
    // to large ones (e.g. temperature vs. yield in a dual-axis line chart).
    const axisSets = new Map<string, ChartDataset[]>();
    for (const ds of parsed.chart.datasets) {
      const axis = (ds as { yAxisID?: string }).yAxisID ?? "default";
      if (!axisSets.has(axis)) axisSets.set(axis, []);
      axisSets.get(axis)!.push(ds);
    }
    const axisMaxes = new Map<string, number>();
    for (const [axis, dsList] of axisSets) {
      axisMaxes.set(axis, Math.max(...dsList.flatMap((d) => d.data), 1));
    }

    const resolveColor = (ds: ChartDataset, index: number, fallbackIndex: number): string => {
      const PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6"];
      const raw = isLine ? (ds.borderColor ?? ds.backgroundColor) : (ds.backgroundColor ?? ds.borderColor);
      if (!raw) return PALETTE[fallbackIndex % PALETTE.length];
      if (Array.isArray(raw)) return String(raw[index] ?? raw[0] ?? PALETTE[fallbackIndex % PALETTE.length]);
      return String(raw);
    };

    return (
      <div className={`rounded-2xl border border-outline-variant/15 bg-white ${compact ? "p-3" : "p-4"}`}>
        {isLine ? (
          // Line chart: SVG polyline
          <svg
            viewBox="0 0 400 160"
            className="w-full overflow-visible"
            aria-hidden="true"
          >
            {parsed.chart.datasets.map((dataset, dsIdx) => {
              const axis = (dataset as { yAxisID?: string }).yAxisID ?? "default";
              const maxVal = axisMaxes.get(axis) ?? 1;
              const color = resolveColor(dataset, 0, dsIdx);
              const n = parsed.chart.labels.length;
              const xStep = n > 1 ? 380 / (n - 1) : 0;
              const points = dataset.data.map((v, i) => {
                const x = 10 + i * xStep;
                const y = 10 + (1 - v / maxVal) * 130;
                return `${x},${y}`;
              }).join(" ");
              return (
                <g key={`${media.id}-line-${dsIdx}`}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {dataset.data.map((v, i) => (
                    <circle
                      key={i}
                      cx={10 + i * xStep}
                      cy={10 + (1 - v / maxVal) * 130}
                      r="3.5"
                      fill={color}
                    />
                  ))}
                </g>
              );
            })}
            {/* X-axis labels */}
            {parsed.chart.labels.map((label, i) => {
              const n = parsed.chart.labels.length;
              const xStep = n > 1 ? 380 / (n - 1) : 0;
              return (
                <text
                  key={i}
                  x={10 + i * xStep}
                  y="158"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                >
                  {label}
                </text>
              );
            })}
          </svg>
        ) : (
          // Bar chart
          <div className="flex h-52 items-end gap-3 overflow-x-auto pb-2">
            {parsed.chart.labels.map((label, labelIndex) => (
              <div key={`${media.id}-${label}-${labelIndex}`} className="flex min-w-14 flex-1 flex-col items-center gap-2">
                <div className="flex h-44 items-end gap-1">
                  {parsed.chart.datasets.map((dataset, dsIdx) => {
                    const axis = (dataset as { yAxisID?: string }).yAxisID ?? "default";
                    const maxVal = axisMaxes.get(axis) ?? 1;
                    const color = resolveColor(dataset, labelIndex, dsIdx);
                    const value = dataset.data[labelIndex] ?? 0;
                    return (
                      <div key={`${label}-${dsIdx}`} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-semibold text-secondary">{value}</span>
                        <div
                          className="w-4 rounded-t-md"
                          style={{ height: `${Math.max((value / maxVal) * 144, 8)}px`, backgroundColor: color }}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="text-center text-[11px] font-semibold text-on-surface-variant">{label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-secondary">
          {parsed.chart.datasets.map((dataset, dsIdx) => {
            const color = resolveColor(dataset, 0, dsIdx);
            return (
              <div key={`${media.id}-legend-${dsIdx}`} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {dataset.label ?? `Serie ${dsIdx + 1}`}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (parsed.kind === "table") {
    return (
      <div className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-container-low text-left text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
              {parsed.table.headers.map((header) => (
                <th key={`${media.id}-${header}`} className="px-4 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.table.rows.map((row, rowIndex) => (
              <tr key={`${media.id}-row-${rowIndex}`} className="border-t border-outline-variant/10">
                {row.map((cell, cellIndex) => (
                  <td key={`${media.id}-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-on-surface-variant">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (parsed.kind === "geometric") {
    // Compute viewBox from shape bounding boxes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of parsed.shapes) {
      if (s.type === "rect") {
        minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + s.width); maxY = Math.max(maxY, s.y + s.height);
      } else if (s.type === "circle") {
        minX = Math.min(minX, s.cx - s.r); minY = Math.min(minY, s.cy - s.r);
        maxX = Math.max(maxX, s.cx + s.r); maxY = Math.max(maxY, s.cy + s.r);
      } else if (s.type === "line") {
        minX = Math.min(minX, s.x1, s.x2); minY = Math.min(minY, s.y1, s.y2);
        maxX = Math.max(maxX, s.x1, s.x2); maxY = Math.max(maxY, s.y1, s.y2);
      }
    }
    for (const a of parsed.annotations) {
      if (a.type === "text") {
        minX = Math.min(minX, a.x - 60); minY = Math.min(minY, a.y - 12);
        maxX = Math.max(maxX, a.x + 60); maxY = Math.max(maxY, a.y + 4);
      } else if (a.type === "arrow") {
        minX = Math.min(minX, a.from.x, a.to.x); minY = Math.min(minY, a.from.y, a.to.y);
        maxX = Math.max(maxX, a.from.x, a.to.x); maxY = Math.max(maxY, a.from.y, a.to.y);
      }
    }
    const pad = 16;
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 500; maxY = 300; }
    const vx = minX - pad, vy = minY - pad;
    const vw = maxX - minX + pad * 2, vh = maxY - minY + pad * 2;

    return (
      <div className={`overflow-hidden rounded-2xl border border-outline-variant/15 bg-white ${compact ? "p-3" : "p-4"}`}>
        <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="w-full" aria-hidden="true">
          <defs>
            <marker id={`arrow-${media.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#374151" />
            </marker>
          </defs>
          {/* Shapes */}
          {parsed.shapes.map((s, i) => {
            if (s.type === "rect") return (
              <g key={`s${i}`}>
                <rect x={s.x} y={s.y} width={s.width} height={s.height}
                  fill={s.fill ?? "#e5e7eb"} stroke={s.stroke ?? "#374151"} strokeWidth="1.5" rx="4" />
                {s.label && (
                  <text x={s.x + s.width / 2} y={s.y + s.height / 2 + 5}
                    textAnchor="middle" fontSize="11" fontWeight="600" fill="#111827">
                    {unescapeUnicodeLiterals(s.label)}
                  </text>
                )}
              </g>
            );
            if (s.type === "circle") return (
              <g key={`s${i}`}>
                <circle cx={s.cx} cy={s.cy} r={s.r}
                  fill={s.fill ?? "#fef3c7"} stroke={s.stroke ?? "#374151"} strokeWidth="1.5" />
                {s.label && (
                  <text x={s.cx} y={s.cy + s.r + 12}
                    textAnchor="middle" fontSize="10" fontWeight="600" fill="#111827">
                    {unescapeUnicodeLiterals(s.label)}
                  </text>
                )}
              </g>
            );
            if (s.type === "line") return (
              <line key={`s${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={s.stroke ?? "#374151"} strokeWidth="1.5" />
            );
            return null;
          })}
          {/* Annotations */}
          {parsed.annotations.map((a, i) => {
            if (a.type === "text") return (
              <text key={`a${i}`} x={a.x} y={a.y}
                textAnchor={a.align === "center" ? "middle" : a.align === "right" ? "end" : "start"}
                fontSize={a.fontSize ?? 10} fill={a.fill ?? "#374151"}>
                {unescapeUnicodeLiterals(a.text)}
              </text>
            );
            if (a.type === "arrow") return (
              <line key={`a${i}`}
                x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y}
                stroke={a.stroke ?? "#374151"} strokeWidth="1.5"
                markerEnd={`url(#arrow-${media.id})`} />
            );
            return null;
          })}
        </svg>
      </div>
    );
  }

  if (parsed.kind === "params") {
    const renderValue = (v: unknown): string => {
      if (v === null || v === undefined) return "—";
      if (typeof v === "object") return JSON.stringify(v);
      return unescapeUnicodeLiterals(String(v));
    };

    const entries = Object.entries(parsed.params);

    return (
      <div className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-white">
        <div className="border-b border-outline-variant/10 bg-surface-container-low px-4 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
            {formatKeyEs(parsed.template)}
          </p>
        </div>
        <div className={`grid gap-3 p-4 ${entries.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {entries.map(([key, value]) => {
            const isNested = value !== null && typeof value === "object" && !Array.isArray(value);
            return (
              <div key={key} className="rounded-xl bg-surface-container-low p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">
                  {formatKeyEs(key)}
                </p>
                {isNested ? (
                  <div className="flex flex-col gap-1">
                    {Object.entries(value as Record<string, unknown>).map(([subKey, subVal]) => (
                      <div key={subKey} className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-on-surface-variant">{formatKeyEs(subKey)}</span>
                        <span className="text-right text-[11px] font-semibold text-on-surface">
                          {renderValue(subVal)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] font-semibold text-on-surface">{renderValue(value)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Visual data</p>
      <pre className="overflow-x-auto whitespace-pre-wrap text-[12px] leading-relaxed text-on-surface-variant">
        {typeof parsed.value === "string" ? parsed.value : JSON.stringify(parsed.value, null, 2)}
      </pre>
    </div>
  );
}

function mediaCardClasses(displayMode: string | undefined, compact: boolean): string {
  const base = compact ? "rounded-2xl p-3" : "rounded-[24px] p-4";
  if (displayMode === "FULL_WIDTH") {
    return `${base} md:col-span-2`;
  }
  return base;
}

export default function QuestionContextMedia({
  media,
  context,
  contextType,
  componentName,
  compact = false,
}: QuestionContextMediaProps) {
  const englishContext = context ? (
    <EnglishContextBlock
      context={context}
      contextType={contextType}
      componentName={componentName}
      compact={compact}
    />
  ) : null;

  if (media.length === 0 && !englishContext) {
    return null;
  }

  const orderedMedia = [...media].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));

  return (
    <div className={`grid grid-cols-1 gap-4 ${orderedMedia.some((item) => item.display_mode === "FULL_WIDTH") ? "md:grid-cols-2" : ""}`}>
      {englishContext && (
        <div className="md:col-span-2">
          {englishContext}
        </div>
      )}
      {orderedMedia.map((item) => {
        const imageUrl = resolveMediaUrl(item.storage_url ?? item.thumbnail_url ?? null);
        return (
          <figure key={item.id} className={`${mediaCardClasses(item.display_mode, compact)} border border-outline-variant/15 bg-white shadow-[0_8px_24px_rgba(25,28,30,0.04)]`}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.alt_text}
                className={`w-full rounded-[18px] bg-surface-container-lowest object-contain ${compact ? "max-h-60" : "max-h-80"}`}
              />
            ) : (
              renderProgrammaticMedia(item, compact)
            )}
            <figcaption className="mt-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                <span>{item.media_type.replaceAll("_", " ")}</span>
                <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[9px] text-on-surface-variant">
                  {item.source}
                </span>
                {item.is_essential && (
                  <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-[9px] text-on-primary-fixed">
                    Esencial
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold leading-relaxed text-on-surface">{item.alt_text}</p>
              {item.alt_text_detailed && (
                <p className="text-[13px] leading-relaxed text-on-surface-variant">{item.alt_text_detailed}</p>
              )}
              {item.caption && (
                <p className="text-[12px] italic text-secondary">{item.caption}</p>
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
