// S4-T02: Pruebas unitarias de reglas de "próxima acción"
import { describe, it, expect } from "vitest";
import { pickNextRecommendedUnit } from "../services/dashboard";

// Fixture de unidad
function makeUnit(id: string, completed: boolean, priority = "HIGH") {
  return {
    id,
    competency_id: `comp-${id}`,
    area_code: "MAT",
    title: `Unidad ${id}`,
    description: null,
    priority,
    recommended_questions: 15,
    completed,
  };
}

describe("pickNextRecommendedUnit", () => {
  it("retorna null cuando weekData es null", () => {
    expect(pickNextRecommendedUnit(null)).toBeNull();
  });

  it("retorna null cuando todas las unidades están completadas", () => {
    const weekData = {
      week_number: 1,
      units: [makeUnit("u1", true), makeUnit("u2", true)],
    };
    expect(pickNextRecommendedUnit(weekData)).toBeNull();
  });

  it("retorna null cuando la semana no tiene unidades", () => {
    expect(pickNextRecommendedUnit({ week_number: 1, units: [] })).toBeNull();
  });

  it("retorna la primera unidad incompleta", () => {
    const weekData = {
      week_number: 2,
      units: [
        makeUnit("u1", true),
        makeUnit("u2", false),
        makeUnit("u3", false),
      ],
    };
    const result = pickNextRecommendedUnit(weekData);
    expect(result?.id).toBe("u2");
  });

  it("mapea correctamente todos los campos del modelo", () => {
    const weekData = {
      week_number: 1,
      units: [
        {
          id: "unit-abc",
          competency_id: "comp-xyz",
          area_code: "LC",
          title: "Comprensión lectora avanzada",
          description: "Texto descriptivo de la unidad",
          priority: "HIGH",
          recommended_questions: 20,
          completed: false,
        },
      ],
    };
    const result = pickNextRecommendedUnit(weekData);
    expect(result).toEqual({
      id: "unit-abc",
      competencyId: "comp-xyz",
      areaCode: "LC",
      title: "Comprensión lectora avanzada",
      description: "Texto descriptivo de la unidad",
      priority: "HIGH",
      recommendedQuestions: 20,
    });
  });
});
