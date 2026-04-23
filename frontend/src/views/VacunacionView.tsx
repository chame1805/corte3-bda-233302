import { useVacunacion } from "../viewmodels/useVacunacion";
import type { User } from "../models/types";

interface Props {
  user: User;
}

export function VacunacionView({ user }: Props) {
  const {
    pendientes,
    loading,
    error,
    cacheInfo,
    latencia,
    loadedOnce,
    cargar,
    aplicarVacuna,
  } = useVacunacion();

  const isHit = cacheInfo?.includes("HIT");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Vacunación Pendiente</h1>
        <p className="page-description">
          Mascotas con vacuna vencida (+365 días) o nunca vacunadas. Resultado cacheado en Redis (TTL 5 min).
        </p>
      </div>

      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Estado del caché Redis</div>
            <div className="card-subtitle">
              Key: <code style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>vacunacion_pendiente</code>
              &nbsp;— TTL: 300 segundos (5 minutos)
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {cacheInfo && (
              <>
                <span className={`cache-indicator ${isHit ? "cache-hit" : "cache-miss"}`}>
                  {isHit ? "⚡ CACHE HIT" : "🗄️ CACHE MISS"}
                </span>
                {latencia !== null && (
                  <span className="latencia">{latencia}ms</span>
                )}
              </>
            )}
            <button className="btn btn-primary btn-sm" onClick={cargar} disabled={loading}>
              {loading ? <><span className="spinner" /> Cargando...</> : "Consultar"}
            </button>
          </div>
        </div>

        <div style={{
          background: "var(--bg-3)",
          borderRadius: "var(--radius)",
          padding: "14px 16px",
          fontSize: "12px",
          color: "var(--text-3)",
          fontFamily: "var(--font-mono)",
          lineHeight: "1.8",
        }}>
          <div>1ª consulta → <span style={{ color: "var(--warn)" }}>CACHE MISS</span> — consulta PostgreSQL (~100–300ms)</div>
          <div>2ª consulta → <span style={{ color: "var(--ok)" }}>CACHE HIT</span> — sirve desde Redis (~5–20ms)</div>
          <div>Aplicar vacuna → <span style={{ color: "var(--err)" }}>INVALIDACIÓN</span> — borra la key del caché</div>
          <div>3ª consulta → <span style={{ color: "var(--warn)" }}>CACHE MISS</span> — datos frescos desde BD</div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "16px" }}>⚠️ {error}</div>
      )}

      {!loadedOnce && !loading && (
        <div className="empty-state" style={{ background: "var(--bg-2)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
          <div className="empty-state-icon">⏱️</div>
          <div className="empty-state-title">Presiona "Consultar" para cargar los datos</div>
          <p style={{ fontSize: "13px" }}>La primera vez verás CACHE MISS, la segunda CACHE HIT.</p>
        </div>
      )}

      {loadedOnce && !loading && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                Mascotas que requieren vacunación
                <span style={{ marginLeft: "8px", color: "var(--text-3)", fontWeight: 400, fontSize: "13px" }}>
                  {pendientes.length} registros
                </span>
              </div>
              {user.role === "veterinario" && (
                <div className="card-subtitle" style={{ color: "var(--text-2)" }}>
                  ✓ RLS activo — solo tus mascotas
                </div>
              )}
            </div>
          </div>

          {pendientes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">¡Todo al día!</div>
              <p>No hay mascotas con vacunación pendiente.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mascota</th>
                    <th>Especie</th>
                    <th>Dueño</th>
                    <th>Teléfono</th>
                    <th>Última vacuna</th>
                    <th>Días</th>
                    <th>Prioridad</th>
                    {user.role === "veterinario" && <th>Acción</th>}
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((p) => (
                    <tr key={p.mascota_id}>
                      <td style={{ fontWeight: 500 }}>{p.nombre_mascota}</td>
                      <td style={{ color: "var(--text-2)" }}>
                        {p.especie === "perro" ? "🐕" : p.especie === "gato" ? "🐈" : "🐇"} {p.especie}
                      </td>
                      <td>{p.nombre_dueno}</td>
                      <td className="text-mono" style={{ color: "var(--text-2)" }}>
                        {p.telefono ?? "—"}
                      </td>
                      <td className="text-mono" style={{ color: "var(--text-3)" }}>
                        {p.fecha_ultima_vacuna ?? "—"}
                      </td>
                      <td className="text-mono" style={{ color: "var(--text-2)" }}>
                        {p.dias_desde_ultima_vacuna ?? "∞"}
                      </td>
                      <td>
                        <span className={`badge badge-${p.prioridad === "NUNCA_VACUNADA" ? "nunca" : "vencida"}`}>
                          {p.prioridad === "NUNCA_VACUNADA" ? "🔴 NUNCA" : "🟡 VENCIDA"}
                        </span>
                      </td>
                      {user.role === "veterinario" && (
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => aplicarVacuna(p.mascota_id, 1, 350)}
                            title="Aplicar vacuna antirrábica (demo)"
                          >
                            Vacunar
                          </button>
                        </td>
                      )}
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
