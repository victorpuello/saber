/* Hook de orquestación para el formulario de nueva pregunta manual. */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getApiErrorMessage } from "../../../services/api";
import {
  fetchAreas,
  fetchAreaDetail,
  createQuestion,
  createProgrammaticQuestionMedia,
  updateQuestion,
  deleteQuestionMedia,
  getQuestion,
  createQuestionBlock,
  updateQuestionBlock,
  getQuestionBlock,
  linkAssetToQuestion,
  listQuestionMedia,
  listVisualAssets,
  uploadQuestionMedia,
  uploadVisualAsset,
} from "../../../services/questions";
import {
  validateField,
  validateTab,
  validateAll,
  hasErrors,
} from "./questionFormValidators";
import {
  INITIAL_FORM_DATA,
  INITIAL_CONTEXT_MEDIA_DRAFT,
  INITIAL_ASSET_UPLOAD_DRAFT,
  createEmptyBlockItem,
  type AssetUploadDraft,
  type ContextMediaDraft,
  type ContextMediaMode,
  type BlockItemErrors,
  type QuestionBlockFormItem,
  type QuestionFormData,
  type FormErrors,
  type FormTab,
  type AreaSummary,
  type AreaDetail,
  type QuestionCreatePayload,
  type QuestionOut,
  type QuestionBlockCreatePayload,
  type QuestionBlockItemPayload,
  type QuestionBlockOut,
  type QuestionMediaOut,
  type StructureType,
  type VisualAssetSummary,
} from "./questionFormTypes";

const TAB_ORDER: FormTab[] = ["taxonomy", "content", "explanations", "review"];
const MIN_BLOCK_ITEMS = 2;
const MAX_BLOCK_ITEMS = 3;

const ENGLISH_COMPONENT_BY_SECTION: Record<number, string | null> = {
  1: "NoticeSign",
  2: null,
  3: "ChatUI",
  4: null,
  5: null,
  6: null,
  7: null,
};

function deriveEnglishComponentName(englishSection: string): string | null {
  const section = Number(englishSection);
  if (!Number.isInteger(section)) {
    return null;
  }
  return ENGLISH_COMPONENT_BY_SECTION[section] ?? null;
}

function parseTagsInput(value: string): string[] | null {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? Array.from(new Set(tags)) : null;
}

type SaveResult = QuestionOut | QuestionBlockOut;

interface FormViewModelOptions {
  onSuccess?: (q: SaveResult) => void;
  editQuestionId?: string;
  editBlockId?: string;
}

function mapQuestionToFormData(q: QuestionOut): QuestionFormData {
  return {
    area_id: q.area_id,
    competency_id: q.competency_id,
    assertion_id: q.assertion_id,
    evidence_id: q.evidence_id ?? "",
    content_component_id: q.content_component_id ?? "",
    structure_type: q.structure_type ?? "INDIVIDUAL",
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
    tags: (q.tags ?? []).join(", "),
    english_section: q.english_section != null ? String(q.english_section) : "",
    mcer_level: q.mcer_level ?? "",
  };
}

function mapQuestionToBlockItem(q: QuestionOut): QuestionBlockFormItem {
  return {
    stem: q.stem,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d ?? "",
    correct_answer: (q.correct_answer as QuestionBlockFormItem["correct_answer"]) || "",
    explanation_correct: q.explanation_correct,
    explanation_a: q.explanation_a ?? "",
    explanation_b: q.explanation_b ?? "",
    explanation_c: q.explanation_c ?? "",
    explanation_d: q.explanation_d ?? "",
    cognitive_process: q.cognitive_process ?? "",
    difficulty_estimated: q.difficulty_estimated != null ? String(q.difficulty_estimated) : "",
    english_section: q.english_section != null ? String(q.english_section) : "",
    mcer_level: q.mcer_level ?? "",
  };
}

function mapFormToBlockSeed(formData: QuestionFormData): QuestionBlockFormItem {
  return {
    stem: formData.stem,
    option_a: formData.option_a,
    option_b: formData.option_b,
    option_c: formData.option_c,
    option_d: formData.option_d,
    correct_answer: formData.correct_answer,
    explanation_correct: formData.explanation_correct,
    explanation_a: formData.explanation_a,
    explanation_b: formData.explanation_b,
    explanation_c: formData.explanation_c,
    explanation_d: formData.explanation_d,
    cognitive_process: formData.cognitive_process,
    difficulty_estimated: formData.difficulty_estimated,
    english_section: formData.english_section,
    mcer_level: formData.mcer_level,
  };
}

function mapBlockItemToFormPatch(item: QuestionBlockFormItem): Pick<
  QuestionFormData,
  | "stem"
  | "option_a"
  | "option_b"
  | "option_c"
  | "option_d"
  | "correct_answer"
  | "explanation_correct"
  | "explanation_a"
  | "explanation_b"
  | "explanation_c"
  | "explanation_d"
  | "cognitive_process"
  | "difficulty_estimated"
  | "english_section"
  | "mcer_level"
> {
  return {
    stem: item.stem,
    option_a: item.option_a,
    option_b: item.option_b,
    option_c: item.option_c,
    option_d: item.option_d,
    correct_answer: item.correct_answer,
    explanation_correct: item.explanation_correct,
    explanation_a: item.explanation_a,
    explanation_b: item.explanation_b,
    explanation_c: item.explanation_c,
    explanation_d: item.explanation_d,
    cognitive_process: item.cognitive_process,
    difficulty_estimated: item.difficulty_estimated,
    english_section: item.english_section,
    mcer_level: item.mcer_level,
  };
}

function isBlockItemEmpty(item: QuestionBlockFormItem): boolean {
  return Object.values(item).every((value) => value === "");
}

function validateBlockItem(item: QuestionBlockFormItem): BlockItemErrors {
  const formShape: QuestionFormData = {
    ...INITIAL_FORM_DATA,
    structure_type: "QUESTION_BLOCK",
    context: "placeholder",
    context_type: "continuous_text",
    ...mapBlockItemToFormPatch(item),
  };

  const errors: BlockItemErrors = {};
  for (const field of [
    "stem",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_answer",
    "explanation_correct",
    "difficulty_estimated",
    "english_section",
  ] as const) {
    const err = validateField(field, formShape[field], formShape);
    if (err) {
      errors[field] = err;
    }
  }
  return errors;
}

function hasBlockItemErrors(errors: BlockItemErrors): boolean {
  return Object.keys(errors).length > 0;
}

function getMediaOwnerQuestionId(result: SaveResult): string {
  return "items" in result ? result.items[0]?.id ?? "" : result.id;
}

function validateContextMediaDraft(
  draft: ContextMediaDraft,
  existingMediaCount: number,
  mediaMarkedForRemoval: boolean,
): string | null {
  if (draft.mode === "NONE") {
    if (mediaMarkedForRemoval || existingMediaCount === 0) {
      return null;
    }
    return null;
  }

  if (!draft.media_type) {
    return "Selecciona el tipo de recurso visual.";
  }
  if (draft.alt_text.trim().length < 5) {
    return "El texto alternativo es obligatorio y debe tener al menos 5 caracteres.";
  }

  if (draft.mode === "UPLOAD" && !draft.upload_file) {
    return "Selecciona un archivo para subir.";
  }
  if (draft.mode === "ASSET_LIBRARY" && !draft.asset_id) {
    return "Selecciona un recurso del banco.";
  }
  if (draft.mode === "PROGRAMMATIC") {
    if (!draft.render_engine) {
      return "Selecciona el motor de render programático.";
    }
    if (!draft.visual_data.trim()) {
      return "Ingresa el visual_data del recurso programático.";
    }
  }

  return null;
}

export function useNewQuestionFormViewModel(onSuccessOrOpts?: ((q: SaveResult) => void) | FormViewModelOptions) {
  const opts: FormViewModelOptions =
    typeof onSuccessOrOpts === "function"
      ? { onSuccess: onSuccessOrOpts }
      : onSuccessOrOpts ?? {};
  const { onSuccess, editQuestionId, editBlockId } = opts;
  const isEditMode = Boolean(editQuestionId || editBlockId);

  const { authFetch } = useAuth();

  const [formData, setFormData] = useState<QuestionFormData>(INITIAL_FORM_DATA);
  const [blockItems, setBlockItems] = useState<QuestionBlockFormItem[]>([
    createEmptyBlockItem(),
    createEmptyBlockItem(),
  ]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [blockErrors, setBlockErrors] = useState<BlockItemErrors[]>([]);
  const [contextMedia, setContextMedia] = useState<ContextMediaDraft>(INITIAL_CONTEXT_MEDIA_DRAFT);
  const [existingMedia, setExistingMedia] = useState<QuestionMediaOut[]>([]);
  const [mediaDirty, setMediaDirty] = useState(false);
  const [mediaMarkedForRemoval, setMediaMarkedForRemoval] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [assetResults, setAssetResults] = useState<VisualAssetSummary[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetUploadDraft, setAssetUploadDraft] = useState<AssetUploadDraft>(INITIAL_ASSET_UPLOAD_DRAFT);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [activeTab, setActiveTab] = useState<FormTab>("taxonomy");
  const [submitting, setSubmitting] = useState(false);

  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [areaDetail, setAreaDetail] = useState<AreaDetail | null>(null);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingAreas(true);
    fetchAreas(authFetch)
      .then((data) => {
        if (active) setAreas(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingAreas(false);
      });
    return () => {
      active = false;
    };
  }, [authFetch]);

  useEffect(() => {
    if (!formData.area_id) {
      setAreaDetail(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    fetchAreaDetail(authFetch, formData.area_id)
      .then((data) => {
        if (active) setAreaDetail(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingDetail(false);
      });
    return () => {
      active = false;
    };
  }, [authFetch, formData.area_id]);

  useEffect(() => {
    if (!editQuestionId && !editBlockId) return;
    let active = true;

    async function loadEditTarget() {
      try {
        if (editBlockId) {
          const block = await getQuestionBlock(authFetch, editBlockId);
          if (!active) return;
          const firstItem = block.items[0];
          setFormData({
            ...mapQuestionToFormData(firstItem),
            structure_type: "QUESTION_BLOCK",
            stem: "",
            option_a: "",
            option_b: "",
            option_c: "",
            option_d: "",
            correct_answer: "",
            explanation_correct: "",
            explanation_a: "",
            explanation_b: "",
            explanation_c: "",
            explanation_d: "",
            cognitive_process: "",
            difficulty_estimated: "",
            tags: "",
            english_section: "",
            mcer_level: "",
          });
          setBlockItems(
            block.items
              .slice()
              .sort((a, b) => (a.block_item_order ?? 0) - (b.block_item_order ?? 0))
              .map(mapQuestionToBlockItem),
          );
          setBlockErrors([]);
          const media = await listQuestionMedia(authFetch, firstItem.id);
          if (!active) return;
          setExistingMedia(media);
          setMediaDirty(false);
          setMediaMarkedForRemoval(false);
          setMediaError(null);
          setContextMedia(INITIAL_CONTEXT_MEDIA_DRAFT);
          setAssetUploadDraft(INITIAL_ASSET_UPLOAD_DRAFT);
          return;
        }

        if (!editQuestionId) return;
        const q = await getQuestion(authFetch, editQuestionId);
        if (!active) return;
        setFormData(mapQuestionToFormData(q));
        setBlockItems([createEmptyBlockItem(), createEmptyBlockItem()]);
        setBlockErrors([]);
        const media = await listQuestionMedia(authFetch, q.id);
        if (!active) return;
        setExistingMedia(media);
        setMediaDirty(false);
        setMediaMarkedForRemoval(false);
        setMediaError(null);
        setContextMedia(INITIAL_CONTEXT_MEDIA_DRAFT);
        setAssetUploadDraft(INITIAL_ASSET_UPLOAD_DRAFT);
      } catch (err) {
        setErrors({ form: getApiErrorMessage(err) });
      }
    }

    void loadEditTarget();
    return () => {
      active = false;
    };
  }, [authFetch, editBlockId, editQuestionId]);

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

  const isEnglish = useMemo(() => {
    const code = areas.find((a) => a.id === formData.area_id)?.code;
    return code === "ING";
  }, [areas, formData.area_id]);

  const isBlockMode = formData.structure_type === "QUESTION_BLOCK";

  const hasVisualContext = contextMedia.mode !== "NONE" || existingMedia.length > 0;

  const updateField = useCallback(
    <K extends keyof QuestionFormData>(field: K, value: QuestionFormData[K]) => {
      setFormData((prev) => {
        const next = { ...prev, [field]: value };

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

      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const updateStructureType = useCallback(
    (nextType: StructureType) => {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.form;
        return next;
      });
      setMediaError(null);

      if (nextType === "QUESTION_BLOCK") {
        setBlockItems((prev) => {
          const meaningfulItems = prev.filter((item) => !isBlockItemEmpty(item));
          if (meaningfulItems.length >= MIN_BLOCK_ITEMS) {
            return meaningfulItems.slice(0, MAX_BLOCK_ITEMS);
          }
          const seed = isBlockItemEmpty(mapFormToBlockSeed(formData))
            ? createEmptyBlockItem()
            : mapFormToBlockSeed(formData);
          return [seed, createEmptyBlockItem()];
        });
      }

      if (nextType === "INDIVIDUAL") {
        const firstItem = blockItems[0];
        if (firstItem && !isBlockItemEmpty(firstItem)) {
          setFormData((prev) => ({
            ...prev,
            structure_type: nextType,
            ...mapBlockItemToFormPatch(firstItem),
          }));
          return;
        }
      }

      setFormData((prev) => ({ ...prev, structure_type: nextType }));
    },
    [blockItems, formData],
  );

  const handleBlur = useCallback(
    (field: keyof QuestionFormData) => {
      if (field === "structure_type") {
        return;
      }
      const err = validateField(field, formData[field], formData);
      setErrors((prev) => {
        if (!err) {
          if (!prev[field]) return prev;
          const next = { ...prev };
          delete next[field];
          return next;
        }
        return { ...prev, [field]: err };
      });
    },
    [formData],
  );

  const updateContextMediaMode = useCallback((mode: ContextMediaMode) => {
    setContextMedia((prev) => ({
      ...prev,
      mode,
      upload_file: mode === "UPLOAD" ? prev.upload_file : null,
      asset_id: mode === "ASSET_LIBRARY" ? prev.asset_id : null,
      render_engine: mode === "PROGRAMMATIC" ? prev.render_engine : "",
      visual_data: mode === "PROGRAMMATIC" ? prev.visual_data : "",
    }));
    setMediaDirty(true);
    setMediaError(null);
  }, []);

  const updateContextMediaField = useCallback(
    <K extends keyof ContextMediaDraft>(field: K, value: ContextMediaDraft[K]) => {
      setContextMedia((prev) => ({ ...prev, [field]: value }));
      setMediaDirty(true);
      setMediaError(null);
    },
    [],
  );

  const setContextMediaFile = useCallback((file: File | null) => {
    setContextMedia((prev) => ({ ...prev, upload_file: file, mode: file ? "UPLOAD" : prev.mode }));
    setMediaDirty(true);
    setMediaError(null);
  }, []);

  const selectAsset = useCallback((asset: VisualAssetSummary) => {
    setContextMedia((prev) => ({
      ...prev,
      mode: "ASSET_LIBRARY",
      asset_id: asset.id,
      media_type: asset.media_type,
      alt_text: prev.alt_text || asset.alt_text,
      upload_file: null,
    }));
    setMediaDirty(true);
    setMediaError(null);
  }, []);

  const markExistingMediaForRemoval = useCallback(() => {
    setMediaMarkedForRemoval(true);
    setMediaDirty(true);
    setMediaError(null);
  }, []);

  const searchAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const response = await listVisualAssets(authFetch, {
        q: assetSearchQuery.trim() || undefined,
        media_type: contextMedia.media_type || undefined,
        page_size: 8,
      });
      setAssetResults(response.items);
    } catch (err) {
      setMediaError(getApiErrorMessage(err));
    } finally {
      setLoadingAssets(false);
    }
  }, [assetSearchQuery, authFetch, contextMedia.media_type]);

  const updateAssetUploadField = useCallback(
    <K extends keyof AssetUploadDraft>(field: K, value: AssetUploadDraft[K]) => {
      setAssetUploadDraft((prev) => ({ ...prev, [field]: value }));
      setMediaError(null);
    },
    [],
  );

  const setAssetUploadFile = useCallback((file: File | null) => {
    setAssetUploadDraft((prev) => ({
      ...prev,
      file,
      title: file && !prev.title ? file.name.replace(/\.[^.]+$/, "") : prev.title,
    }));
    setMediaError(null);
  }, []);

  const uploadAssetAndSelect = useCallback(async () => {
    const mediaType = contextMedia.media_type;
    if (!mediaType) {
      setMediaError("Selecciona primero el tipo de recurso para crear el asset.");
      return;
    }
    if (contextMedia.alt_text.trim().length < 5) {
      setMediaError("Completa el texto alternativo antes de subir el asset al banco.");
      return;
    }
    if (!assetUploadDraft.file) {
      setMediaError("Selecciona un archivo para crear el asset.");
      return;
    }
    if (assetUploadDraft.title.trim().length < 3) {
      setMediaError("El asset debe tener un título de al menos 3 caracteres.");
      return;
    }

    setUploadingAsset(true);
    setMediaError(null);
    try {
      const createdAsset = await uploadVisualAsset(authFetch, {
        file: assetUploadDraft.file,
        title: assetUploadDraft.title.trim(),
        alt_text: contextMedia.alt_text.trim(),
        media_type: mediaType,
        area_id: formData.area_id || null,
        description: assetUploadDraft.description.trim() || null,
        tags: assetUploadDraft.tags.trim() || null,
        license_type: assetUploadDraft.license_type,
        attribution: assetUploadDraft.attribution.trim() || null,
      });

      const summary: VisualAssetSummary = {
        id: createdAsset.id,
        media_type: createdAsset.media_type,
        title: createdAsset.title,
        thumbnail_url: createdAsset.thumbnail_url,
        alt_text: createdAsset.alt_text,
        tags: createdAsset.tags,
        times_used: createdAsset.times_used,
      };

      setAssetResults((prev) => [summary, ...prev.filter((asset) => asset.id !== summary.id)]);
      selectAsset(summary);
      setAssetUploadDraft(INITIAL_ASSET_UPLOAD_DRAFT);
    } catch (err) {
      setMediaError(getApiErrorMessage(err));
    } finally {
      setUploadingAsset(false);
    }
  }, [assetUploadDraft, authFetch, contextMedia.alt_text, contextMedia.media_type, formData.area_id, selectAsset]);

  const resetContextMedia = useCallback(() => {
    setContextMedia(INITIAL_CONTEXT_MEDIA_DRAFT);
    setAssetSearchQuery("");
    setAssetResults([]);
    setAssetUploadDraft(INITIAL_ASSET_UPLOAD_DRAFT);
    setMediaDirty(true);
    setMediaError(null);
  }, []);

  const updateBlockItem = useCallback(
    <K extends keyof QuestionBlockFormItem>(index: number, field: K, value: QuestionBlockFormItem[K]) => {
      setBlockItems((prev) => prev.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )));
      setBlockErrors((prev) => prev.map((itemErrors, itemIndex) => {
        if (itemIndex !== index || !itemErrors?.[field]) {
          return itemErrors;
        }
        const next = { ...(itemErrors ?? {}) };
        delete next[field];
        return next;
      }));
    },
    [],
  );

  const handleBlockItemBlur = useCallback((index: number) => {
    setBlockErrors((prev) => {
      const next = [...prev];
      next[index] = validateBlockItem(blockItems[index]);
      return next;
    });
  }, [blockItems]);

  const addBlockItem = useCallback(() => {
    setBlockItems((prev) => (
      prev.length >= MAX_BLOCK_ITEMS ? prev : [...prev, createEmptyBlockItem()]
    ));
  }, []);

  const removeBlockItem = useCallback((index: number) => {
    setBlockItems((prev) => (
      prev.length <= MIN_BLOCK_ITEMS ? prev : prev.filter((_, itemIndex) => itemIndex !== index)
    ));
    setBlockErrors((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const activeTabIndex = TAB_ORDER.indexOf(activeTab);

  const goNext = useCallback(() => {
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
      tags: parseTagsInput(formData.tags),
      source: "MANUAL",
      structure_type: "INDIVIDUAL",
      english_section: formData.english_section
        ? Number(formData.english_section)
        : null,
      mcer_level: formData.mcer_level || null,
      component_name: deriveEnglishComponentName(formData.english_section),
    };
  }, [formData]);

  const buildBlockItemPayload = useCallback((item: QuestionBlockFormItem): QuestionBlockItemPayload => ({
    stem: item.stem.trim(),
    option_a: item.option_a.trim(),
    option_b: item.option_b.trim(),
    option_c: item.option_c.trim(),
    option_d: item.option_d.trim() || null,
    correct_answer: item.correct_answer as QuestionBlockItemPayload["correct_answer"],
    explanation_correct: item.explanation_correct.trim(),
    explanation_a: item.explanation_a.trim() || null,
    explanation_b: item.explanation_b.trim() || null,
    explanation_c: item.explanation_c.trim() || null,
    explanation_d: item.explanation_d.trim() || (item.option_d.trim() ? "Distractor" : null),
    cognitive_process: item.cognitive_process || null,
    difficulty_estimated: item.difficulty_estimated ? Number(item.difficulty_estimated) : null,
    english_section: item.english_section ? Number(item.english_section) : null,
    mcer_level: item.mcer_level || null,
    component_name: deriveEnglishComponentName(item.english_section),
  }), []);

  const buildBlockPayload = useCallback((): QuestionBlockCreatePayload => ({
    area_id: formData.area_id,
    competency_id: formData.competency_id,
    assertion_id: formData.assertion_id,
    evidence_id: formData.evidence_id || null,
    content_component_id: formData.content_component_id || null,
    context: formData.context.trim(),
    context_type: formData.context_type as QuestionBlockCreatePayload["context_type"],
    source: "MANUAL",
    items: blockItems.map(buildBlockItemPayload),
  }), [blockItems, buildBlockItemPayload, formData]);

  const validateBlockSubmit = useCallback(() => {
    const sharedFields: Array<keyof QuestionFormData> = [
      "area_id",
      "competency_id",
      "assertion_id",
      "context",
      "context_type",
    ];
    const nextErrors: FormErrors = {};
    for (const field of sharedFields) {
      const err = validateField(field, formData[field], formData);
      if (err) {
        nextErrors[field] = err;
      }
    }

    if (blockItems.length < MIN_BLOCK_ITEMS) {
      nextErrors.form = "Un bloque debe tener al menos 2 subpreguntas.";
    }
    if (blockItems.length > MAX_BLOCK_ITEMS) {
      nextErrors.form = "Un bloque no puede tener más de 3 subpreguntas.";
    }

    const nextBlockErrors = blockItems.map(validateBlockItem);
    setErrors(nextErrors);
    setBlockErrors(nextBlockErrors);

    return hasErrors(nextErrors) || nextBlockErrors.some(hasBlockItemErrors);
  }, [blockItems, formData]);

  const syncContextMedia = useCallback(async (ownerQuestionId: string) => {
    const validationError = validateContextMediaDraft(
      contextMedia,
      existingMedia.length,
      mediaMarkedForRemoval,
    );
    if (validationError) {
      throw new Error(validationError);
    }

    if (!mediaDirty) {
      return;
    }

    if ((existingMedia.length > 0 && mediaMarkedForRemoval) || (existingMedia.length > 0 && contextMedia.mode !== "NONE")) {
      await Promise.all(existingMedia.map((media) => deleteQuestionMedia(authFetch, ownerQuestionId, media.id)));
    }

    if (contextMedia.mode === "NONE") {
      setExistingMedia([]);
      return;
    }

    const mediaType = contextMedia.media_type;
    if (!mediaType) {
      throw new Error("Selecciona el tipo de recurso visual.");
    }

    let savedMedia: QuestionMediaOut;
    if (contextMedia.mode === "UPLOAD" && contextMedia.upload_file) {
      savedMedia = await uploadQuestionMedia(authFetch, ownerQuestionId, {
        file: contextMedia.upload_file,
        media_type: mediaType,
        alt_text: contextMedia.alt_text,
        is_essential: contextMedia.is_essential,
        display_mode: contextMedia.display_mode,
        caption: contextMedia.caption || null,
        position: 0,
      });
    } else if (contextMedia.mode === "ASSET_LIBRARY" && contextMedia.asset_id) {
      savedMedia = await linkAssetToQuestion(authFetch, ownerQuestionId, contextMedia.asset_id, {
        alt_text: contextMedia.alt_text,
        is_essential: contextMedia.is_essential,
        display_mode: contextMedia.display_mode,
        caption: contextMedia.caption || null,
        position: 0,
      });
    } else if (contextMedia.mode === "PROGRAMMATIC") {
      const renderEngine = contextMedia.render_engine;
      if (!renderEngine) {
        throw new Error("Selecciona el motor de render programático.");
      }
      savedMedia = await createProgrammaticQuestionMedia(authFetch, ownerQuestionId, {
        media_type: mediaType,
        visual_data: contextMedia.visual_data,
        render_engine: renderEngine,
        alt_text: contextMedia.alt_text,
        alt_text_detailed: contextMedia.alt_text_detailed || null,
        is_essential: contextMedia.is_essential,
        display_mode: contextMedia.display_mode,
        caption: contextMedia.caption || null,
        position: 0,
      });
    } else {
      return;
    }

    setExistingMedia([savedMedia]);
    setMediaDirty(false);
    setMediaMarkedForRemoval(false);
    setContextMedia(INITIAL_CONTEXT_MEDIA_DRAFT);
  }, [authFetch, contextMedia, existingMedia, mediaDirty, mediaMarkedForRemoval]);

  const handleSubmit = useCallback(async () => {
    if (isBlockMode) {
      const blockHasErrors = validateBlockSubmit();
      if (blockHasErrors) {
        if (!errors.form) {
          setErrors((prev) => ({
            ...prev,
            form: prev.form ?? "Corrige el contexto y las subpreguntas del bloque antes de guardar.",
          }));
        }
        return;
      }
    } else {
      const allErrors = validateAll(formData);
      if (hasErrors(allErrors)) {
        const fieldNames = Object.keys(allErrors).filter((k) => k !== "form");
        setErrors({ ...allErrors, form: `Corrige los campos: ${fieldNames.join(", ")}` });
        return;
      }
    }

    const mediaValidationError = validateContextMediaDraft(contextMedia, existingMedia.length, mediaMarkedForRemoval);
    if (mediaValidationError) {
      setMediaError(mediaValidationError);
      return;
    }

    setSubmitting(true);
    setErrors({});
    setMediaError(null);
    try {
      const result = isBlockMode
        ? editBlockId
          ? await updateQuestionBlock(authFetch, editBlockId, buildBlockPayload())
          : await createQuestionBlock(authFetch, buildBlockPayload())
        : editQuestionId
          ? await updateQuestion(authFetch, editQuestionId, buildPayload())
          : await createQuestion(authFetch, buildPayload());
      const ownerQuestionId = getMediaOwnerQuestionId(result);
      if (ownerQuestionId) {
        await syncContextMedia(ownerQuestionId);
      }
      onSuccess?.(result);
    } catch (err) {
      setErrors({ form: getApiErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }, [
    authFetch,
    buildBlockPayload,
    buildPayload,
    contextMedia,
    editBlockId,
    editQuestionId,
    errors.form,
    existingMedia,
    formData,
    isBlockMode,
    mediaMarkedForRemoval,
    onSuccess,
    syncContextMedia,
    validateBlockSubmit,
  ]);

  const reset = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setBlockItems([createEmptyBlockItem(), createEmptyBlockItem()]);
    setErrors({});
    setBlockErrors([]);
    setContextMedia(INITIAL_CONTEXT_MEDIA_DRAFT);
    setExistingMedia([]);
    setMediaDirty(false);
    setMediaMarkedForRemoval(false);
    setMediaError(null);
    setAssetSearchQuery("");
    setAssetResults([]);
    setAssetUploadDraft(INITIAL_ASSET_UPLOAD_DRAFT);
    setActiveTab("taxonomy");
    setAreaDetail(null);
  }, []);

  const isDirty = useMemo(() => {
    const individualDirty = Object.entries(formData).some(([key, value]) => (
      key === "structure_type"
        ? value !== INITIAL_FORM_DATA.structure_type
        : value !== ""
    ));
    const blockDirty = blockItems.some((item) => !isBlockItemEmpty(item));
    return individualDirty || blockDirty || mediaDirty || mediaMarkedForRemoval;
  }, [blockItems, formData, mediaDirty, mediaMarkedForRemoval]);

  return {
    formData,
    blockItems,
    errors,
    blockErrors,
    contextMedia,
    existingMedia,
    mediaError,
    assetSearchQuery,
    assetResults,
    loadingAssets,
    assetUploadDraft,
    uploadingAsset,
    activeTab,
    setActiveTab,
    submitting,
    isEditMode,
    isDirty,
    isBlockMode,
    hasVisualContext,
    mediaMarkedForRemoval,
    canAddBlockItem: blockItems.length < MAX_BLOCK_ITEMS,
    canRemoveBlockItem: blockItems.length > MIN_BLOCK_ITEMS,

    updateField,
    updateStructureType,
    handleBlur,
    updateContextMediaMode,
    updateContextMediaField,
    setContextMediaFile,
    setAssetSearchQuery,
    searchAssets,
    selectAsset,
    updateAssetUploadField,
    setAssetUploadFile,
    uploadAssetAndSelect,
    resetContextMedia,
    markExistingMediaForRemoval,
    updateBlockItem,
    handleBlockItemBlur,
    addBlockItem,
    removeBlockItem,

    goNext,
    goBack,

    handleSubmit,
    reset,

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
