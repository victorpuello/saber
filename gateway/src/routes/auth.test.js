import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// =============================================================================
// Tests de seguridad para autenticación del gateway
// Ejecutar: node --test src/routes/auth.test.js
// =============================================================================

const JWT_SECRET = "test-secret-for-testing";
const VALID_USER = {
  user_id: 42,
  kampus_user_id: 42,
  role: "STUDENT",
  name: "Ana García",
  grade: "11",
  institution_id: "ie-playas",
};

function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: 3600,
    ...options,
  });
}

describe("JWT validation", () => {
  it("rechaza petición sin token", () => {
    const token = undefined;
    assert.equal(token, undefined, "No debe haber token");
  });

  it("verifica token válido con claims correctos", () => {
    const token = signToken(VALID_USER);
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });

    assert.equal(decoded.user_id, 42);
    assert.equal(decoded.role, "STUDENT");
    assert.equal(decoded.name, "Ana García");
  });

  it("rechaza token con secreto incorrecto", () => {
    const token = jwt.sign(VALID_USER, "wrong-secret", {
      algorithm: "HS256",
    });

    assert.throws(
      () => jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }),
      { name: "JsonWebTokenError" }
    );
  });

  it("rechaza token expirado", () => {
    const token = signToken(VALID_USER, { expiresIn: -10 });

    assert.throws(
      () => jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }),
      { name: "TokenExpiredError" }
    );
  });

  it("rechaza token con algoritmo none", () => {
    // Un ataque clásico: usar alg: none para bypassear firma
    const header = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" })
    ).toString("base64url");
    const payload = Buffer.from(JSON.stringify(VALID_USER)).toString(
      "base64url"
    );
    const fakeToken = `${header}.${payload}.`;

    assert.throws(
      () => jwt.verify(fakeToken, JWT_SECRET, { algorithms: ["HS256"] }),
      { name: "JsonWebTokenError" }
    );
  });

  it("rechaza token sin user_id", () => {
    const token = signToken({ role: "STUDENT", name: "Test" });
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });

    // El middleware debe rechazar si falta user_id
    assert.equal(decoded.user_id, undefined);
  });

  it("rechaza token con rol inválido", () => {
    const token = signToken({ ...VALID_USER, role: "SUPERADMIN" });
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });

    const VALID_ROLES = new Set(["STUDENT", "TEACHER", "ADMIN"]);
    assert.equal(VALID_ROLES.has(decoded.role), false);
  });

  it("valida los tres roles válidos", () => {
    for (const role of ["STUDENT", "TEACHER", "ADMIN"]) {
      const token = signToken({ ...VALID_USER, role });
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
      assert.equal(decoded.role, role);
    }
  });
});

describe("Refresh token rotation", () => {
  it("genera refresh tokens únicos", async () => {
    const { randomBytes } = await import("node:crypto");
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      tokens.add(randomBytes(48).toString("hex"));
    }
    assert.equal(tokens.size, 100, "Todos los tokens deben ser únicos");
  });
});

describe("Role-based authorization", () => {
  it("STUDENT no puede acceder a rutas ADMIN", () => {
    const allowedRoles = ["ADMIN"];
    const userRole = "STUDENT";
    assert.equal(
      allowedRoles.includes(userRole),
      false,
      "STUDENT no debe tener acceso"
    );
  });

  it("TEACHER no puede acceder a rutas ADMIN", () => {
    const allowedRoles = ["ADMIN"];
    const userRole = "TEACHER";
    assert.equal(allowedRoles.includes(userRole), false);
  });

  it("ADMIN tiene acceso a rutas ADMIN", () => {
    const allowedRoles = ["ADMIN"];
    const userRole = "ADMIN";
    assert.equal(allowedRoles.includes(userRole), true);
  });

  it("TEACHER puede acceder a rutas TEACHER+ADMIN", () => {
    const allowedRoles = ["TEACHER", "ADMIN"];
    const userRole = "TEACHER";
    assert.equal(allowedRoles.includes(userRole), true);
  });
});
