import { useCallback, useEffect, useState } from "react";
import { useAgendarCita } from "../viewmodels/useAgendarCita";
import { mascotasApi } from "../services/apiClient";
import type { Cita, User } from "../models/types";

interface Props {
  user: User;
}

const ESTADO_LABEL: Record<string, string> = {
  AGENDADA: "Agendada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

export function AgendarCitaView({ user }: Props) {
  const {
    mascotas,
    veterinarios,
    query,
    mascotaId,
    veterinarioId,
    fechaHora,
    motivo,
    loading,
    success,
    error,
    cargarVeterinarios,
    buscarMascotas,
    setMascotaId,
    setVeterinarioId,
    setFechaHora,
    setMotivo,
    agendar,
  } = useAgendarCita();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [loadingCitas, setLoadingCitas] = useState(false);

  const cargarCitas = useCallback(async () => {
    setLoadingCitas(true);
    try {
      const data = await mascotasApi.listarTodasCitas();
      setCitas(data);
    } finally {
      setLoadingCitas(false);
    }
  }, []);

  useEffect(() => {
    if (user.role !== "veterinario") cargarVeterinarios();
    if (user.role === "veterinario" && user.vet_id) setVeterinarioId(user.vet_id);
    cargarCitas();
  }, [cargarVeterinarios, cargarCitas, user.role, user.vet_id, setVeterinarioId]);

  // Recargar citas después de agendar con éxito
  useEffect(() => {
    if (success) cargarCitas();
  }, [success, cargarCitas]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    agendar();
  };

  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 30);
  const minDateStr = minDate.toISOString().slice(0, 16);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Agendar Cita</h1>
        <p className="page-description">
          Registra una nueva cita llamando al stored procedure{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>sp_agendar_cita</code>{" "}
          — valida mascota, veterinario activo, día de descanso y colisiones de horario.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", marginBottom: "24px" }}>
        {/* Formulario principal */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Nueva cita</div>
              <div className="card-subtitle">Todos los campos son obligatorios</div>
            </div>
          </div>

          {success && (
            <div className="alert alert-success" style={{ marginBottom: "16px" }}>
              ✓ {success}
            </div>
          )}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: "16px" }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Buscar mascota */}
            <div className="form-group">
              <label className="form-label">Mascota</label>
              <input
                type="text"
                className="form-input"
                placeholder="Escribe el nombre para buscar..."
                value={query}
                onChange={(e) => buscarMascotas(e.target.value)}
                autoComplete="off"
              />
              {mascotas.length > 0 && (
                <div
                  style={{
                    background: "var(--bg-3)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    marginTop: "4px",
                    overflow: "hidden",
                  }}
                >
                  {mascotas.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMascotaId(m.id)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 14px",
                        background: mascotaId === m.id ? "var(--bg-4)" : "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--border-soft)",
                        color: "var(--text-1)",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{m.nombre}</span>
                      <span style={{ color: "var(--text-3)", marginLeft: "8px" }}>
                        {m.especie} · {m.nombre_dueno}
                      </span>
                      {mascotaId === m.id && (
                        <span style={{ float: "right", color: "var(--text-2)" }}>✓ seleccionada</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {mascotaId !== "" && (
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "4px" }}>
                  Seleccionada: {mascotas.find((m) => m.id === mascotaId)?.nombre ?? `ID #${mascotaId}`}
                </div>
              )}
            </div>

            {/* Veterinario */}
            {user.role === "veterinario" ? (
              <div
                style={{
                  padding: "10px 14px",
                  background: "var(--bg-3)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: "13px",
                  color: "var(--text-2)",
                  marginBottom: "16px",
                }}
              >
                <span style={{ color: "var(--text-3)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Veterinario
                </span>
                <div style={{ marginTop: "4px", fontWeight: 500 }}>{user.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
                  Asignado automáticamente a tu cuenta
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Veterinario</label>
                <select
                  className="form-select"
                  value={veterinarioId}
                  onChange={(e) => setVeterinarioId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Selecciona un veterinario...</option>
                  {veterinarios.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre}
                      {v.dias_descanso ? ` (descansa: ${v.dias_descanso})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fecha y hora */}
            <div className="form-group">
              <label className="form-label">Fecha y hora</label>
              <input
                type="datetime-local"
                className="form-input"
                value={fechaHora}
                min={minDateStr}
                onChange={(e) => setFechaHora(e.target.value)}
                style={{ colorScheme: "dark" }}
              />
            </div>

            {/* Motivo */}
            <div className="form-group">
              <label className="form-label">Motivo de la consulta</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Describe el motivo de la cita..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                style={{ resize: "vertical", minHeight: "80px" }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !mascotaId || !veterinarioId || !fechaHora || !motivo.trim()}
              style={{ fontSize: "14px", padding: "12px" }}
            >
              {loading ? <><span className="spinner" /> Agendando cita...</> : "Agendar cita con sp_agendar_cita"}
            </button>
          </form>
        </div>

        {/* Panel informativo */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: "12px" }}>Validaciones del SP</div>
            <div style={{ fontSize: "12px", color: "var(--text-3)", fontFamily: "var(--font-mono)", lineHeight: "2" }}>
              {["1. Mascota existe", "2. Vet existe y activo", "3. No es día de descanso", "4. Advisory lock", "5. Sin colisión"].map((v, i) => (
                <div key={i} style={{ color: "var(--text-2)" }}>{v}</div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: "8px" }}>Rol actual</div>
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
            <p style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "10px" }}>
              {user.role === "veterinario"
                ? "Solo ves mascotas asignadas a ti (RLS activo)."
                : "Puedes agendar citas para cualquier mascota y veterinario."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabla de citas agendadas ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              {user.role === "veterinario" ? "Mis citas agendadas" : "Todas las citas"}
              <span style={{ marginLeft: "8px", color: "var(--text-3)", fontWeight: 400, fontSize: "13px" }}>
                {citas.length} registros
              </span>
            </div>
            <div className="card-subtitle">
              {user.role === "veterinario"
                ? "RLS filtra: solo ves las citas donde eres el veterinario"
                : "Recepción y admin ven todas las citas del sistema"}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={cargarCitas} disabled={loadingCitas}>
            Recargar
          </button>
        </div>

        {loadingCitas ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : citas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">Sin citas registradas</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Mascota</th>
                  <th>Veterinario</th>
                  <th>Fecha y hora</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th>Costo</th>
                </tr>
              </thead>
              <tbody>
                {citas.map((c) => (
                  <tr key={c.id}>
                    <td className="text-mono" style={{ color: "var(--text-3)" }}>#{c.id}</td>
                    <td style={{ fontWeight: 500 }}>{c.nombre_mascota}</td>
                    <td style={{ color: "var(--text-2)" }}>{c.nombre_veterinario}</td>
                    <td className="text-mono" style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>
                      {new Date(c.fecha_hora).toLocaleString("es-MX", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td style={{ color: "var(--text-2)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.motivo ?? "—"}
                    </td>
                    <td>
                      <span className={`badge ${c.estado === "COMPLETADA" ? "badge-ok" : c.estado === "CANCELADA" ? "badge-nunca" : "badge-vencida"}`}>
                        {ESTADO_LABEL[c.estado] ?? c.estado}
                      </span>
                    </td>
                    <td className="text-mono" style={{ color: "var(--text-3)" }}>
                      {c.costo != null ? `$${c.costo.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
