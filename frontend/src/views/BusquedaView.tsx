import { useEffect, useState } from "react";
import { useMascotas } from "../viewmodels/useMascotas";
import type { User } from "../models/types";

interface Props {
  user: User;
}

export function BusquedaView({ user }: Props) {
  const { mascotas, query, loading, error, searched, buscar, handleQueryChange } = useMascotas();
  const [showSqlHint, setShowSqlHint] = useState(false);

  // Cargar automáticamente al entrar (todos los roles — RLS filtra en el servidor)
  useEffect(() => {
    buscar("");
  }, [buscar]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buscar(query);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Búsqueda de Mascotas</h1>
        <p className="page-description">
          {user.role === "veterinario"
            ? "Mostrando solo las mascotas que tú atiendes (RLS activo)"
            : "Mostrando todas las mascotas del sistema"}
        </p>
      </div>

      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Buscar paciente</div>
            <div className="card-subtitle">
              Superficie de prueba para SQL Injection — campo de texto libre
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSqlHint(!showSqlHint)}
          >
            {showSqlHint ? "Ocultar" : "Ver"} ataques de prueba
          </button>
        </div>

        {showSqlHint && (
          <div className="alert alert-info" style={{ marginBottom: "16px" }}>
            <div>
              <strong>Ataques que el sistema bloquea:</strong>
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {[
                  "' OR '1'='1",
                  "'; DROP TABLE mascotas; --",
                  "' UNION SELECT cedula FROM veterinarios --",
                  "' OR 1=1 --",
                ].map((ataque) => (
                  <code
                    key={ataque}
                    style={{
                      display: "block",
                      background: "var(--bg-3)",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      cursor: "pointer",
                      color: "var(--danger)",
                    }}
                    onClick={() => handleQueryChange(ataque)}
                    title="Clic para copiar al campo de búsqueda"
                  >
                    {ataque}
                  </code>
                ))}
              </div>
              <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-3)" }}>
                Haz clic en cualquier ataque para copiarlo al campo y luego busca. Todos serán bloqueados por
                las queries parametrizadas con psycopg2.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="search-row">
            <div className="form-group">
              <label className="form-label">Nombre de la mascota</label>
              <input
                type="text"
                className="form-input"
                placeholder="Escribe un nombre o intenta un ataque SQL..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Buscando...</> : "Buscar"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "16px" }}>
          ⚠️ {error}
        </div>
      )}

      {searched && !loading && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                Resultados
                {mascotas.length > 0 && (
                  <span style={{ marginLeft: "8px", color: "var(--text-3)", fontWeight: 400, fontSize: "13px" }}>
                    {mascotas.length} mascota{mascotas.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {user.role === "veterinario" && (
                <div className="card-subtitle" style={{ color: "var(--text-2)", marginTop: "2px" }}>
                  ✓ RLS aplicado — solo tus mascotas asignadas son visibles
                </div>
              )}
            </div>
          </div>

          {mascotas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">Sin resultados</div>
              <p style={{ fontSize: "13px" }}>
                {query.includes("'") || query.includes("--") || query.toLowerCase().includes("union")
                  ? "⛔ Ataque bloqueado — query parametrizada previno la inyección"
                  : "No se encontraron mascotas con ese nombre"}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Especie</th>
                    <th>Nacimiento</th>
                    <th>Dueño</th>
                    <th>Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {mascotas.map((m) => (
                    <tr key={m.id}>
                      <td className="text-mono" style={{ color: "var(--text-3)" }}>#{m.id}</td>
                      <td style={{ fontWeight: 500 }}>{m.nombre}</td>
                      <td>
                        <span style={{ color: "var(--text-2)" }}>
                          {m.especie === "perro" ? "🐕" : m.especie === "gato" ? "🐈" : "🐇"} {m.especie}
                        </span>
                      </td>
                      <td className="text-mono" style={{ color: "var(--text-3)" }}>
                        {m.fecha_nacimiento ?? "—"}
                      </td>
                      <td>{m.nombre_dueno}</td>
                      <td className="text-mono" style={{ color: "var(--text-2)" }}>
                        {m.telefono_dueno ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
