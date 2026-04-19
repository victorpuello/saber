/* Hook de orquestación para el formulario de nueva pregunta manual. */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getApiErrorMessage } from "../../../services/api";
import { fetchAreas, fetchAreaDetail, createQuestion, updateQuestion, getQuestion } from "../../../services/questions";
import {
  validateField,
  validateTab,
  validateAll,
  hasErrors,
} from "./questionFormValidators";
import {
  INITIAL_FORM_DATA,
  type QuestionFormData,
  type FormErrors,
  type FormTab,
  type AreaSummary,
  type AreaDetail,
  type QuestionCreatePayload,
  type QuestionOut,
} from "./questionFormTypes";

const TAB_ORDER: FormTab[] = ["taxonomy", "content", "explanations", "review"];

interface FormViewModelOptions {
  onSuccess?: (q: QuestionOut) => void;
  editQuestionId?: string;
}

export function useNewQuestionFormViewModel(onSuccessOrOpts?: ((q: QuestionOut) => void) | FormViewModelOptions) {
  // Normalize overloaded argument
  const opts: FormViewModelOptions =
    typeof onSuccessOrOpts === "function"
      ? { onSuccess: onSuccessOrOpts }
      : onSuccessOrOpts ?? {};
  const { onSuccess, editQuestionId } = opts;
  const isEditMode = Boolean(editQuestionId);

  const { authFetch } = useAuth();

  // --- Estado del formulario ---
  const [formData, setFormData] = useState<QuestionFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [activeTab, setActiveTab] = useState<FormTab>("taxonomy");
  const [submitting, setSubmitting] = useState(false);

  // --- Taxonomía ---
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [areaDetail, setAreaDetail] = useState<AreaDetail | null>(null);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Cargar áreas al montar
  useEffect(() => {
    let active = true;
    setLoadingAreas(true);
    fetchAreas(authFetch)
      .then((data) => { if (active) setAreas(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingAreas(false); });
    return () => { active = false; };
  }, [authFetch]);

  // Cargar detalle del área seleccionada
  useEffect(() => {
    if (!formData.area_id) {
      setAreaDetail(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    fetchAreaDetail(authFetch, formData.area_id)
      .then((data) => { if (active) setAreaDetail(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingDetail(false); });
    return () => { active = false; };
  }, [authFetch, formData.area_id]);

  // Cargar datos de pregunta existente en modo edición
  useEffect(() => {
    if (!editQuestionId) return;
    let active = true;
    getQuestion(authFetch, editQuestionId)
      .then((q) => {
        if (!active) return;
        setFormData({
          area_id: q.area_id,
          competency_id: q.competency_id,
          assertion_id: q.assertion_id,
          evidence_id: q.evidence_id ?? "",
          content_component_id: q.content_component_id ?? "",
          context: q.context,
          context_type: (q.context_type as QuestionFormData["context_type"]) || "",
          stem: q.stem,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d ?? "",
          correct_answer: (q.correct_answer as QuestionFormData["correct_answer"]) || "",
          explanation_correct: q.explanation_correct,
          explanation_a: q.explanation_a ?? "",
          explanation_b: q.explanation_b ?? "",
          explanation_c: q.explanation_c ?? "",
          explanation_d: q.explanation_d ?? "",
          cognitive_process: q.cognitive_process ?? "",
          difficulty_estimated: q.difficulty_estimated != null ? String(q.difficulty_estimated) : "",
          english_section: q.english_section != null ? String(q.english_section) : "",
          mcer_level: q.mcer_level ?? "",
        });
      })
      .catch((err) => {
        setErrors({ form: getApiErrorMessage(err) });
      });
    return () => { active = false; };
  }, [authFetch, editQuestionId]);

  // Opciones derivadas de taxonomía
  const competencies = useMemo(() => areaDetail?.competencies ?? [], [areaDetail]);
  const selectedCompetency = useMemo(
    () => competencies.find((c) => c.id === formData.competency_id),
    [competencies, formData.competency_id],
  );
  const assertions = useMemo(() => selectedCompetency?.assertions ?? [], [selectedCompetency]);
  const selectedAssertion = useMemo(
    () => assertions.find((a) => a.id === formData.assertion_id),
    [assertions, formData.assertion_id],
  );
  const evidences = useMemo(() => selectedAssertion?.evidences ?? [], [selectedAssertion]);
  const contentComponents = useMemo(() => areaDetail?.content_components ?? [], [areaDetail]);

  // Es área de inglés
  const isEnglish = useMemo(() => {
    const code = areas.find((a) => a.id === formData.area_id)?.code;
    return code === "ING";
  }, [areas, formData.area_id]);

  // --- Handlers ---

  const updateField = useCallback(
    <K extends keyof QuestionFormData>(field: K, value: QuestionFormData[K]) => {
      setFormData((prev) => {
        const next = { ...prev, [field]: value };

        // Reset cascada al cambiar área
        if (field === "area_id") {
          next.competency_id = "";
          next.assertion_id = "";
          next.evidence_id = "";
          next.content_component_id = "";
        }
        if (field === "competency_id") {
          next.assertion_id = "";
          next.evidence_id = "";
        }
        if (field === "assertion_id") {
          next.evidence_id = "";
        }

        return next;
      });

      // Limpiar error del campo editado
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    },
    [],
  );

  const handleBlur = useCallback(
    (field: keyof QuestionFormData) => {
      const err = validateField(field, formData[field], formData);
      setErrors((prev) => {
        if (!err) {
          if (!prev[field]) return prev;
          const copy = { ...prev };
          delete copy[field];
          return copy;
        }
        return { ...prev, [field]: err };
      });
    },
    [formData],
  );

  // --- Navegación de tabs ---

  const activeTabIndex = TAB_ORDER.indexOf(activeTab);

  const goNext = useCallback(() => {
    // Validar tab actual antes de avanzar
    const tabErrors = validateTab(activeTab, formData);
    if (hasErrors(tabErrors)) {
      setErrors((prev) => ({ ...prev, ...tabErrors }));
      return;
    }
    const nextIdx = activeTabIndex + 1;
    if (nextIdx < TAB_ORDER.length) {
      setActiveTab(TAB_ORDER[nextIdx]);
    }
  }, [activeTab, activeTabIndex, formData]);

  const goBack = useCallback(() => {
    const prevIdx = activeTabIndex - 1;
    if (prevIdx >= 0) {
      setActiveTab(TAB_ORDER[prevIdx]);
    }
  }, [activeTabIndex]);

  // --- Submit ---

  const buildPayload = useCallback((): QuestionCreatePayload => {
    return {
      area_id: formData.area_id,
      competency_id: formData.competency_id,
      assertion_id: formData.assertion_id,
      evidence_id: formData.evidence_id || null,
      content_component_id: formData.content_component_id || null,
      context: formData.context.trim(),
      context_type: formData.context_type as QuestionCreatePayload["context_type"],
      stem: formData.stem.trim(),
      option_a: formData.option_a.trim(),
      option_b: formData.option_b.trim(),
      option_c: formData.option_c.trim(),
      option_d: formData.option_d.trim() || null,
      correct_answer: formData.correct_answer as QuestionCreatePayload["correct_answer"],
      explanation_correct: formData.explanation_correct.trim(),
      explanation_a: formData.explanation_a.trim() || null,
      explanation_b: formData.explanation_b.trim() || null,
      explanation_c: formData.explanation_c.trim() || null,
      explanation_d:
        formData.explanation_d.trim() ||
        (formData.option_d.trim() ? "Distractor" : null),
      cognitive_process: formData.cognitive_process || null,
      difficulty_estimated: formData.difficulty_estimated
        ? Number(formData.difficulty_estimated)
        : null,
      source: "MANUAL",
      english_section: formData.english_section
        ? Number(formData.english_section)
        : null,
      mcer_level: formData.mcer_level || null,
    };
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    const allErrors = validateAll(formData);
    if (hasErrors(allErrors)) {
      const fieldNames = Object.keys(allErrors).filter((k) => k !== "form");
      setErrors({ ...allErrors, form: `Corrige los campos: ${fieldNames.join(", ")}` });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const payload = buildPayload();
      const result = editQuestionId
        ? await updateQuestion(authFetch, editQuestionId, payload)
        : await createQuestion(authFetch, payload);
      onSuccess?.(result);
    } catch (err) {
      setErrors({ form: getApiErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }, [authFetch, buildPayload, formData, onSuccess]);

  const reset = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setActiveTab("taxonomy");
    setAreaDetail(null);
  }, []);

  return {
    // Form state
    formData,
    errors,
    activeTab,
    setActiveTab,
    submitting,
    isEditMode,

    // Field actions
    updateField,
    handleBlur,

    // Tab navigation
    goNext,
    goBack,

    // Submit
    handleSubmit,
    reset,

    // Taxonomy data
    areas,
    loadingAreas,
    loadingDetail,
    competencies,
    assertions,
    evidences,
    contentComponents,
    isEnglish,
  };
}
