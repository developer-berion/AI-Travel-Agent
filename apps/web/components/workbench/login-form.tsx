"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

type AuthMode = "mock" | "supabase";

export const LoginForm = ({ authMode }: { authMode: AuthMode }) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authMode === "mock") {
      setEmail("operator@alana.mock");
      setPassword("mock-password");
      return;
    }

    setEmail("");
    setPassword("");
  }, [authMode]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      setError(
        authMode === "mock"
          ? "No pude iniciar la sesion mock."
          : "No pude iniciar la sesion del operador provisionado.",
      );
      setIsSubmitting(false);
      return;
    }

    router.push("/quotes");
    router.refresh();
  };

  return (
    <form className="auth-card" onSubmit={onSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Asistente operatorio</p>
        <h1>Alana Travel Quoting OS</h1>
        <p className="muted">
          {authMode === "mock"
            ? "Acceso local listo para revisar el workbench y validar la experiencia sin depender del entorno real."
            : "Ingresa con tu cuenta provisionada para continuar con la operación de cotizaciones."}
        </p>
        <p className="auth-mode-badge">
          {authMode === "mock" ? "Modo local" : "Acceso provisionado"}
        </p>
      </div>

      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          placeholder={
            authMode === "mock" ? "operator@alana.mock" : "operator@alana.ai"
          }
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
      </label>

      <label className="field">
        <span>Contraseña</span>
        <input
          autoComplete="current-password"
          placeholder={
            authMode === "mock" ? "mock-password" : "Ingresa tu contraseña"
          }
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Ingresando..." : "Ingresar al workspace"}
      </button>
    </form>
  );
};
