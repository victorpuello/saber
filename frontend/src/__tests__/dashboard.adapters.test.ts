// S4-T01: Pruebas unitarias de adaptadores y lógica de área
import { describe, it, expect } from "vitest";
import {
  buildAreaBreakdown,
  pickAreaByPriority,
  type StudentDashboardSummary,
} from "../services/dashboard";

// Helpers para construir fixtures mínimos
type AreaBreakdown = StudentDashboardSummary["areaBreakdown"];

function makeAreaEntry(
  areaCode: string,
  progressPercent: number,
  accuracyPercent: number | null = null,
): AreaBreakdown[number] {
  return {
    areaCode,
    totalUnits: 10,
    completedUnits: Math.round((progressPercent / 100) * 10),
    progressPercent,
    accuracyPercent,
    competenciesTracked: accuracyPercent !== null ? 2 : 0,
  };
}

// ─── buildAreaBreakdown ────────────────────────────────────────────────────

describe("buildAreaBreakdown", () => {
  it("retorna array vacío cuando ambas fuentes son null", () => {
    expect(buildAreaBreakdown(null, null)).toEqual([]);
  });

  it("calcula progressPercent correctamente desde planProgress", () => {
    const planProgress = {
      total_units: 10,
      completed_units: 4,
      progress_percent: 40,
      current_week: 2,
      total_weeks: 8,
      by_area: {
        MAT: { total: 10, completed: 4, correct: 30, attempted: 40 },
      },
    } as Parameters<typeof buildAreaBreakdown>[0];

    const result = buildAreaBreakdown(planProgress, null);
    expect(result).toHaveLength(1);
    expect(result[0].areaCode).toBe("MAT");
    expect(result[0].progressPercent).toBe(40);
    expect(result[0].accuracyPercent).toBe(75); // 30/40 * 100
  });

  it("combina datos de plan y analítica por área", () => {
    const planProgress = {
      total_units: 20,
      completed_units: 8,
      progress_percent: 40,
      current_week: 2,
      total_weeks: 8,
      by_area: {
        MAT: { total: 10, completed: 5, correct: 0, attempted: 0 },
        LC: { total: 10, completed: 3, correct: 0, attempted: 0 },
      },
    } as Parameters<typeof buildAreaBreakdown>[0];

    const studentProgress = {
      student_user_id: 1,
      exam_count: 2,
      avg_score: null,
      avg_accuracy: null,
      recent_exams: [],
      competencies: [
        {
          competency_id: "c1",
          area_code: "MAT",
          theta_estimate: 0.5,
          performance_level: null,
          classification: null,
          questions_attempted: 20,
          questions_correct: 16,
          last_updated_at: "2026-04-01T00:00:00",
        },
      ],
    } as Parameters<typeof buildAreaBreakdown>[1];

    const result = buildAreaBreakdown(planProgress, studentProgress);
    const mat = result.find((a) => a.areaCode === "MAT");
    expect(mat?.accuracyPercent).toBe(80); // 16/20 * 100
    expect(mat?.competenciesTracked).toBe(1);
  });

  it("precisa accuracyPercent null cuando no hay preguntas intentadas", () => {
    const planProgress = {
      total_units: 10,
      completed_units: 2,
      progress_percent: 20,
      current_week: 1,
      total_weeks: 8,
      by_area: {
        CN: { total: 10, completed: 2, correct: 0, attempted: 0 },
      },
    } as Parameters<typeof buildAreaBreakdown>[0];

    const result = buildAreaBreakdown(planProgress, null);
    expect(result[0].accuracyPercent).toBeNull();
  });

  it("ordena áreas por progressPercent descendente", () => {
    const planProgress = {
      total_units: 30,
      completed_units: 10,
      progress_percent: 33,
      current_week: 1,
      total_weeks: 8,
      by_area: {
        ING: { total: 10, completed: 2, correct: 0, attempted: 0 },
        MAT: { total: 10, completed: 8, correct: 0, attempted: 0 },
        LC: { total: 10, completed: 5, correct: 0, attempted: 0 },
      },
    } as Parameters<typeof buildAreaBreakdown>[0];

    const result = buildAreaBreakdown(planProgress, null);
    expect(result[0].areaCode).toBe("MAT"); // 80%
    expect(result[1].areaCode).toBe("LC");  // 50%
    expect(result[2].areaCode).toBe("ING"); // 20%
  });
});

// ─── pickAreaByPriority ────────────────────────────────────────────────────

describe("pickAreaByPriority", () => {
  it("retorna null con array vacío", () => {
    expect(pickAreaByPriority([], "asc")).toBeNull();
    expect(pickAreaByPriority([], "desc")).toBeNull();
  });

  it("asc = área con menor accuracy (área más débil)", () => {
    const breakdown: AreaBreakdown = [
      makeAreaEntry("MAT", 80, 90),
      makeAreaEntry("LC", 60, 45),
      makeAreaEntry("SC", 70, 70),
    ];
    expect(pickAreaByPriority(breakdown, "asc")).toBe("LC");
  });

  it("desc = área con mayor accuracy (área más fuerte)", () => {
    const breakdown: AreaBreakdown = [
      makeAreaEntry("MAT", 80, 90),
      makeAreaEntry("LC", 60, 45),
      makeAreaEntry("SC", 70, 70),
    ];
    expect(pickAreaByPriority(breakdown, "desc")).toBe("MAT");
  });

  it("áreas sin accuracy se tratan como las mejores en asc (sin datos no implica debilidad)", () => {
    // null accuracy → 101 en asc: se ubica al final del ranking débil
    // MAT tiene accuracy 60 (confirmada débil) → ING sin datos se posterga
    const breakdown: AreaBreakdown = [
      makeAreaEntry("MAT", 50, 60),
      makeAreaEntry("ING", 30, null),
    ];
    expect(pickAreaByPriority(breakdown, "asc")).toBe("MAT");
  });

  it("desempata por progressPercent cuando accuracy es igual", () => {
    const breakdown: AreaBreakdown = [
      makeAreaEntry("MAT", 80, 70),
      makeAreaEntry("LC", 40, 70),
    ];
    // desc: misma accuracy, mayor progress → MAT
    expect(pickAreaByPriority(breakdown, "desc")).toBe("MAT");
  });
});
