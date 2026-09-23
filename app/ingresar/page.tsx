"use client";

import { FormEvent, useState } from "react";

export default function SignInPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "No se pudo iniciar sesión.");
      window.location.assign("/");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "No se pudo iniciar sesión.");
    } finally { setLoading(false); }
  }

  return <main className="shell"><section className="content"><div className="surface auth-card"><div className="eyebrow">PROCREARE</div><h1>Ingresar</h1><p className="muted">Acceda a la gestión segura de su finca.</p><form className="form" onSubmit={submit}><label>Correo electrónico<input type="email" name="email" autoComplete="email" required /></label><label>Contraseña<input type="password" name="password" autoComplete="current-password" minLength={8} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button" type="submit" disabled={loading}>{loading ? "Ingresando…" : "Ingresar"}</button></form><p className="muted"><a href="/configuracion-inicial">Configurar una finca nueva</a></p></div></section></main>;
}
