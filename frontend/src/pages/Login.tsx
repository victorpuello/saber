import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SESSION_NOTICE_KEY, useAuth } from "../context/AuthContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { getApiErrorMessage } from "../services/api";

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  ADMIN: "/admin",
};

const USERNAME_PATTERN = /^[A-Za-z0-9._@-]{3,120}$/;
const DEFAULT_FORGOT_PASSWORD_URL = "/auth/forgot-password";
const DEFAULT_TERMS_URL = "/legal/terms";
const DEFAULT_PRIVACY_URL = "/legal/privacy";

function isExternalUrl(url: string): boolean {
  return /^(https?:)?\/\//i.test(url);
}

interface SmartLinkProps {
  to: string;
  className?: string;
  children: ReactNode;
}

function SmartLink({ to, className, children }: SmartLinkProps) {
  if (isExternalUrl(to)) {
    return (
      <a href={to} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

export default function Login() {
  useDocumentTitle("Iniciar Sesión");
  const { login, loading, error, user, authReady, clearError } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const forgotPasswordUrl = useMemo(
    () => import.meta.env.VITE_FORGOT_PASSWORD_URL || DEFAULT_FORGOT_PASSWORD_URL,
    [],
  );
  const termsUrl = useMemo(() => import.meta.env.VITE_TERMS_URL || DEFAULT_TERMS_URL, []);
  const privacyUrl = useMemo(() => import.meta.env.VITE_PRIVACY_URL || DEFAULT_PRIVACY_URL, []);

  useEffect(() => {
    if (!authReady || !user) {
      return;
    }

    navigate(ROLE_HOME[user.role] || "/student", { replace: true });
  }, [authReady, navigate, user]);

  useEffect(() => {
    const notice = sessionStorage.getItem(SESSION_NOTICE_KEY);
    if (notice) {
      setSessionNotice(notice);
      sessionStorage.removeItem(SESSION_NOTICE_KEY);
    }

    return () => {
      clearError();
    };
  }, [clearError]);

  function validate(values: { username: string; password: string }) {
    const nextErrors: { username?: string; password?: string } = {};
    const normalizedUsername = values.username.trim();

    if (!normalizedUsername) {
      nextErrors.username = "Debes ingresar usuario o correo institucional.";
    } else if (!USERNAME_PATTERN.test(normalizedUsername)) {
      nextErrors.username = "Usa un identificador válido: letras, números, punto, guion o arroba.";
    }

    if (!values.password) {
      nextErrors.password = "Debes ingresar tu contraseña.";
    } else if (values.password.length < 6) {
      nextErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    return nextErrors;
  }

  function handleUsernameBlur() {
    const nextErrors = validate({ username, password });
    setFieldErrors((prev) => ({ ...prev, username: nextErrors.username }));
  }

  function handlePasswordBlur() {
    const nextErrors = validate({ username, password });
    setFieldErrors((prev) => ({ ...prev, password: nextErrors.password }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validate({ username, password });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    const normalizedUsername = username.trim();

    setFormError(null);
    setSessionNotice(null);

    try {
      await login(normalizedUsername, password);
    } catch (submitError) {
      setFormError(getApiErrorMessage(submitError, error || "No se pudo iniciar sesión."));
    }
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="glass-panel animate-login-fade-in rounded-2xl border border-outline-variant px-6 py-4 text-sm font-semibold text-secondary">
          Preparando autenticación...
        </div>
      </main>
    );
  }

  const globalFeedback = formError || error;

  return (
    <main className="flex min-h-screen bg-surface text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      <section className="scholar-gradient relative hidden w-7/12 flex-col justify-between overflow-hidden p-16 lg:flex">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="animate-login-rise-in relative z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-lowest shadow-sm">
            <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_stories
            </span>
          </div>
          <div>
            <h1 className="font-headline text-3xl font-black tracking-tight text-on-primary-container">Saber 11</h1>
            <p className="text-xs font-semibold tracking-[0.32em] text-on-primary-container/70 uppercase">Simulador</p>
          </div>
        </div>

        <div className="animate-login-rise-in relative z-10 max-w-xl">
          <div className="mb-12 aspect-video overflow-hidden rounded-3xl shadow-scholar-card">
            <img
              src="https://69e6e4edb30eaee8c8b2ac91.imgix.net/saber/DSC02658.jpg"
              alt="Estudiantes realizando prueba con tablet"
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
            />
          </div>
          <h2 className="text-balance mb-6 font-headline text-4xl font-extrabold leading-tight tracking-tight text-on-primary-container">
            El dominio académico comienza con una práctica disciplinada.
          </h2>
          <p className="text-balance text-xl font-light leading-relaxed text-on-primary-container/85">
            Accede a una experiencia curada de aprendizaje diseñada para optimizar tu flujo cognitivo y elevar tus
            resultados.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          <div className="h-px w-12 bg-on-primary-container/30" />
          <span className="text-xs font-semibold tracking-[0.28em] text-on-primary-container/60 uppercase">
            @victorpuellog
          </span>
        </div>
      </section>

      <section className="flex w-full flex-col items-center justify-center bg-surface p-12 lg:w-5/12 lg:px-16">
        <div className="w-full max-w-[400px] animate-login-fade-in">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <span className="material-symbols-outlined text-4xl text-primary">auto_stories</span>
            <h1 className="font-headline text-2xl font-black tracking-tight text-primary">Saber 11</h1>
          </div>

          <h3 className="mb-3 font-headline text-[30px] font-bold tracking-tight text-on-surface">Iniciar sesión</h3>

          <div role="status" aria-live="polite" className="space-y-3">
            {sessionNotice && (
              <p className="rounded-xl border border-primary/20 bg-primary-fixed px-4 py-3 text-sm font-medium text-on-primary-fixed">
                {sessionNotice}
              </p>
            )}
            {globalFeedback && (
              <p className="rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
                {globalFeedback}
              </p>
            )}
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label htmlFor="kampus-id" className="px-1 text-[10px] font-bold tracking-[0.14em] text-on-surface-variant uppercase">
                Usuario o correo (Kampus ID)
              </label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="material-symbols-outlined text-outline transition-colors group-focus-within:text-primary">
                    person
                  </span>
                </div>
                <input
                  id="kampus-id"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  onBlur={handleUsernameBlur}
                  placeholder="nombre.apellido@institucion.edu"
                  autoComplete="username"
                  aria-invalid={fieldErrors.username ? "true" : "false"}
                  aria-describedby={fieldErrors.username ? "kampus-id-error" : undefined}
                  className={`block w-full rounded-xl border py-3.5 pl-12 pr-3.5 text-sm text-on-surface placeholder:text-outline transition-all focus:outline-none focus:ring-3 focus:ring-primary/35 ${
                    fieldErrors.username
                      ? "border-error/60 bg-error-container/45"
                      : "border-transparent bg-surface-container-highest focus:border-primary/30 focus:bg-surface-container-lowest"
                  }`}
                />
              </div>
              {fieldErrors.username && (
                <p id="kampus-id-error" className="px-1 text-xs font-semibold text-error">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label htmlFor="password" className="text-[10px] font-bold tracking-[0.14em] text-on-surface-variant uppercase">
                  Contraseña
                </label>
                <SmartLink
                  to={forgotPasswordUrl}
                  className="text-sm font-semibold text-primary transition-colors hover:text-primary-container"
                >
                  ¿Olvidó su contraseña?
                </SmartLink>
              </div>

              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="material-symbols-outlined text-outline transition-colors group-focus-within:text-primary">
                    lock
                  </span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  onBlur={handlePasswordBlur}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  aria-invalid={fieldErrors.password ? "true" : "false"}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  className={`block w-full rounded-xl border py-3.5 pl-12 pr-3.5 text-sm text-on-surface placeholder:text-outline transition-all focus:outline-none focus:ring-3 focus:ring-primary/35 ${
                    fieldErrors.password
                      ? "border-error/60 bg-error-container/45"
                      : "border-transparent bg-surface-container-highest focus:border-primary/30 focus:bg-surface-container-lowest"
                  }`}
                />
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="px-1 text-xs font-semibold text-error">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="scholar-gradient mt-2 mb-8 flex w-full items-center justify-center gap-3 rounded-xl py-4 text-base font-bold text-white shadow-scholar-card transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
            >
              <span>{loading ? "Ingresando..." : "Iniciar sesión"}</span>
              <span className="material-symbols-outlined text-xl">login</span>
            </button>
          </form>

          <div className="mt-8 border-t border-surface-container-high pt-8">
            <p className="text-center text-[13px] font-medium leading-relaxed text-secondary">
              Este simulador utiliza una infraestructura federada. Al iniciar sesión, usted acepta los{" "}
              <SmartLink
                to={termsUrl}
                className="font-bold text-on-surface underline decoration-primary/35 underline-offset-4"
              >
                Términos de Servicio
              </SmartLink>{" "}
              y la{" "}
              <SmartLink
                to={privacyUrl}
                className="font-bold text-on-surface underline decoration-primary/35 underline-offset-4"
              >
                Política de Privacidad
              </SmartLink>
              .
            </p>
          </div>

          {import.meta.env.DEV && (
            <p className="mt-6 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-xs font-semibold tracking-wide text-secondary">
              Entorno de desarrollo: estudiante, docente o admin con contraseña demo1234.
            </p>
          )}
        </div>

        <footer className="mt-auto pt-12">
          <p className="text-center text-[10px] tracking-[0.2em] text-outline uppercase">
            Versión 4.2.0-Scholar | © 2026 Víctor Puello. Todos los derechos reservados.
          </p>
        </footer>
      </section>
    </main>
  );
}
