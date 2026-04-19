/* Validadores puros para el formulario de creación manual de preguntas. */

import type { QuestionFormData, FormErrors, FormTab } from "./questionFormTypes";

// --- Validación por campo individual ---

export function validateField(
  field: keyof QuestionFormData,
  value: string,
  formData: QuestionFormData,
): string | undefined {
  switch (field) {
    // Taxonomía — requeridos
    case "area_id":
      return !value ? "Selecciona un área" : undefined;
    case "competency_id":
      return !value ? "Selecciona una competencia" : undefined;
    case "assertion_id":
      return !value ? "Selecciona una afirmación" : undefined;

    // Contenido — requeridos
    case "context":
      if (!value.trim()) return "El contexto es requerido";
      if (value.trim().length < 10) return "Mínimo 10 caracteres";
      return undefined;
    case "context_type":
      return !value ? "Selecciona el tipo de contexto" : undefined;
    case "stem":
      if (!value.trim()) return "El enunciado es requerido";
      if (value.trim().length < 5) return "Mínimo 5 caracteres";
      return undefined;
    case "option_a":
    case "option_b":
    case "option_c":
      return !value.trim() ? "Esta opción es requerida" : undefined;
    case "option_d":
      // Opcional, pero si correct_answer es D, se requiere
      if (!value.trim() && formData.correct_answer === "D")
        return "La opción D es requerida si es la respuesta correcta";
      return undefined;
    case "correct_answer":
      return !value ? "Selecciona la respuesta correcta" : undefined;

    // Explicaciones
    case "explanation_correct":
      if (!value.trim()) return "La explicación de la respuesta correcta es requerida";
      if (value.trim().length < 5) return "Mínimo 5 caracteres";
      return undefined;
    case "explanation_d":
      return undefined;

    // Metadatos
    case "difficulty_estimated":
      if (value) {
        const n = Number(value);
        if (Number.isNaN(n) || n < 0 || n > 1) return "Valor entre 0 y 1";
      }
      return undefined;

    // Inglés
    case "english_section":
      if (value) {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1 || n > 7) return "Sección entre 1 y 7";
      }
      return undefined;

    default:
      return undefined;
  }
}

// --- Validación de un tab completo ---

const TAB_FIELDS: Record<FormTab, (keyof QuestionFormData)[]> = {
  taxonomy: ["area_id", "competency_id", "assertion_id"],
  content: [
    "context",
    "context_type",
    "stem",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_answer",
  ],
  explanations: [
    "explanation_correct",
    "explanation_a",
    "explanation_b",
    "explanation_c",
    "explanation_d",
    "cognitive_process",
    "difficulty_estimated",
    "english_section",
    "mcer_level",
  ],
  review: [],
};

export function validateTab(tab: FormTab, formData: QuestionFormData): FormErrors {
  const errors: FormErrors = {};
  for (const field of TAB_FIELDS[tab]) {
    const err = validateField(field, formData[field], formData);
    if (err) errors[field] = err;
  }
  return errors;
}

// --- Validación completa del formulario ---

export function validateAll(formData: QuestionFormData): FormErrors {
  const errors: FormErrors = {};
  const tabs: FormTab[] = ["taxonomy", "content", "explanations"];
  for (const tab of tabs) {
    Object.assign(errors, validateTab(tab, formData));
  }
  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// --- Campos con error por tab (para indicador visual) ---

export function tabHasErrors(tab: FormTab, errors: FormErrors): boolean {
  return TAB_FIELDS[tab].some((f) => !!errors[f]);
}
