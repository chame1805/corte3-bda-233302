import { useState } from "react";
import type { DemoUser } from "../models/types";

interface Props {
  demoUsers: DemoUser[];
  loading: boolean;
  error: string | null;
  onLogin: (username: string) => void;
}

const ROLE_ICONS: Record<string, string> = {
  veterinario: "🩺",
  recepcion: "📋",
  admin: "🔑",
};


export function LoginView({ demoUsers, loading, error, onLogin }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleLogin = () => {
    if (selected) onLogin(selected);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🐾</div>
        <h1 className="login-title">Clínica Veterinaria</h1>
        <p className="login-subtitle">
          Selecciona tu perfil para iniciar sesión
          <br />
          <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
            Sistema de demo — contraseña universal: <code style={{ fontFamily: "var(--font-mono)" }}>1234</code>
          </span>
        </p>

        <div style={{ marginBottom: "20px" }}>
          {demoUsers.length === 0 && (
            <p style={{ color: "var(--text-3)", textAlign: "center", fontSize: "13px" }}>
              Cargando usuarios...
            </p>
          )}
          {demoUsers.map((u) => (
            <button
              key={u.username}
              className={`user-option ${selected === u.username ? "selected" : ""}`}
              onClick={() => setSelected(u.username)}
            >
              <div className="user-option-icon">
                {ROLE_ICONS[u.role] || "👤"}
              </div>
              <div>
                <div className="user-option-name">{u.name}</div>
                <div className="user-option-role">{u.role} · password: 1234</div>
              </div>
              {selected === u.username && (
                <span style={{ marginLeft: "auto", color: "var(--text-2)" }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "16px" }}>
            ⚠️ {error}
          </div>
        )}

        <button
          className="btn btn-primary btn-full"
          disabled={!selected || loading}
          onClick={handleLogin}
          style={{ fontSize: "15px", padding: "12px" }}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Iniciando sesión...
            </>
          ) : (
            "Ingresar al sistema"
          )}
        </button>

        <div style={{ marginTop: "24px", padding: "14px", background: "var(--bg-3)", borderRadius: "var(--radius)", fontSize: "12px", color: "var(--text-3)" }}>
          <strong style={{ color: "var(--text-2)" }}>Contexto de evaluación:</strong>
          <ul style={{ marginTop: "6px", paddingLeft: "16px", lineHeight: "1.8" }}>
            <li>Veterinario → RLS filtra sus mascotas asignadas</li>
            <li>Recepción → ve todo excepto vacunas aplicadas</li>
            <li>Admin → acceso total con BYPASSRLS</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
