import { useState, useCallback } from "react";
import type { QBMetric, QuestionRow, ActivityItem, QBFiltersState } from "./types";

const MOCK_QUESTIONS: QuestionRow[] = [
  {
    id: "1",
    code: "MAT-4821",
    area: "Matemáticas",
    areaCode: "MAT",
    competencia: "Razonamiento cuantitativo",
    enunciado: "Un granero dispone de 120 metros de cerca p...",
    authorName: "Diego R.",
    authorInitial: "DR",
    status: "APROBADO",
    performance: 72,
  },
  {
    id: "2",
    code: "LEC-9012",
    area: "Lectura Crítica",
    areaCode: "LEC",
    competencia: "Comprensión de argumentación",
    enunciado: "A partir del siguiente fragmento del 'Elogio de ...",
    authorName: "ScholarAI",
    authorInitial: "AI",
    status: "PENDIENTE",
    performance: 58,
  },
  {
    id: "3",
    code: "ING-2334",
    area: "Inglés",
    areaCode: "ING",
    competencia: "B2: Top competent",
    enunciado: "Read the text about the Amazon rainforest an...",
    authorName: "María L.",
    authorInitial: "ML",
    status: "BORRADOR",
    performance: 45,
  },
  {
    id: "4",
    code: "NAT-5501",
    area: "Ciencias Naturales",
    areaCode: "NAT",
    competencia: "Uso de conceptos",
    enunciado: "En una reacción de oxidación-reducción se ob...",
    authorName: "Carlos P.",
    authorInitial: "CP",
    status: "APROBADO",
    performance: 81,
  },
  {
    id: "5",
    code: "SOC-3310",
    area: "Sociales y Ciudadanas",
    areaCode: "SOC",
    competencia: "Pensamiento sistémico",
    enunciado: "Analice las causas estructurales del conflicto ar...",
    authorName: "Ana G.",
    authorInitial: "AG",
    status: "APROBADO",
    performance: 65,
  },
  {
    id: "6",
    code: "MAT-4822",
    area: "Matemáticas",
    areaCode: "MAT",
    competencia: "Comunicación, representación",
    enunciado: "Si f(x) = 2x³ - 5x + 1, calcule el valor de f(3)...",
    authorName: "Diego R.",
    authorInitial: "DR",
    status: "PENDIENTE",
    performance: null,
  },
  {
    id: "7",
    code: "LEC-9013",
    area: "Lectura Crítica",
    areaCode: "LEC",
    competencia: "Comprensión lectora",
    enunciado: "El siguiente texto corresponde a un editorial del...",
    authorName: "ScholarAI",
    authorInitial: "AI",
    status: "BORRADOR",
    performance: null,
  },
  {
    id: "8",
    code: "ING-2335",
    area: "Inglés",
    areaCode: "ING",
    competencia: "B1: Pre-intermediate",
    enunciado: "Choose the correct form of the verb in each sent...",
    authorName: "María L.",
    authorInitial: "ML",
    status: "APROBADO",
    performance: 77,
  },
];

const MOCK_METRICS: QBMetric[] = [
  {
    id: "total",
    label: "Total Preguntas",
    value: "1,452",
    badge: "+12 hoy",
    icon: "quiz",
    variant: "default",
  },
  {
    id: "pending",
    label: "Pendiente Revisión",
    value: "84",
    helper: "Requieren aprobación",
    icon: "pending_actions",
    variant: "warning",
  },
  {
    id: "ai",
    label: "Generadas con IA",
    value: "348",
    helper: "24% del total",
    icon: "auto_awesome",
    variant: "ai",
  },
  {
    id: "difficulty",
    label: "Índice Dificultad Avg",
    value: "0.62",
    helper: "Escala 0–1",
    icon: "leaderboard",
    variant: "success",
  },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    text: "Pregunta #MAT-4821 aprobada por Supervisor",
    timeAgo: "Hace 14 minutos",
    category: "Matemáticas",
    iconVariant: "success",
  },
  {
    id: "2",
    text: "Nueva versión de borrador creada por Diego R.",
    timeAgo: "Hace 3 horas",
    category: "Ciencias Naturales",
    iconVariant: "info",
  },
  {
    id: "3",
    text: "Lote de 12 preguntas generadas con IA",
    timeAgo: "Hace 5 horas",
    category: "Lectura Crítica",
    iconVariant: "info",
  },
  {
    id: "4",
    text: "Pregunta #ING-2334 devuelta a revisión",
    timeAgo: "Ayer",
    category: "Inglés",
    iconVariant: "warning",
  },
];

const AREA_OPTIONS = ["Todas las Áreas", "Matemáticas", "Lectura Crítica", "Inglés", "Ciencias Naturales", "Sociales y Ciudadanas"];
const COMPETENCIA_OPTIONS = ["Cualquier Competencia", "Razonamiento cuantitativo", "Comprensión lectora", "Comunicación"];
const DIFICULTAD_OPTIONS = ["Todas", "Baja (0–0.3)", "Media (0.3–0.7)", "Alta (0.7–1)"];
const ESTADO_OPTIONS = ["Cualquier Estado", "APROBADO", "PENDIENTE", "BORRADOR"];

const ITEMS_PER_PAGE = 8;
const TOTAL_QUESTIONS = 1452;
const TOTAL_PAGES = Math.ceil(TOTAL_QUESTIONS / ITEMS_PER_PAGE);

export function useQuestionBankViewModel() {
  const [filters, setFilters] = useState<QBFiltersState>({
    area: AREA_OPTIONS[0],
    competencia: COMPETENCIA_OPTIONS[0],
    dificultad: DIFICULTAD_OPTIONS[0],
    estado: ESTADO_OPTIONS[0],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const updateFilter = useCallback(<K extends keyof QBFiltersState>(key: K, value: QBFiltersState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      area: AREA_OPTIONS[0],
      competencia: COMPETENCIA_OPTIONS[0],
      dificultad: DIFICULTAD_OPTIONS[0],
      estado: ESTADO_OPTIONS[0],
    });
    setCurrentPage(1);
  }, []);

  const visibleStart = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const visibleEnd = Math.min(currentPage * ITEMS_PER_PAGE, TOTAL_QUESTIONS);

  return {
    metrics: MOCK_METRICS,
    questions: MOCK_QUESTIONS,
    activity: MOCK_ACTIVITY,
    filters,
    updateFilter,
    clearFilters,
    areaOptions: AREA_OPTIONS,
    competenciaOptions: COMPETENCIA_OPTIONS,
    dificultadOptions: DIFICULTAD_OPTIONS,
    estadoOptions: ESTADO_OPTIONS,
    currentPage,
    totalPages: TOTAL_PAGES,
    totalQuestions: TOTAL_QUESTIONS,
    visibleStart,
    visibleEnd,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
  };
}
