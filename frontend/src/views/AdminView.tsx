import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../viewmodels/useAdmin";
import { adminApi, veterinariosApi } from "../services/apiClient";
import type { UsuarioApp, Veterinario } from "../models/types";

export function AdminView() {
  const {
    inventario,
    vetMascotas,
    veterinarios,
    mascotas,
    totalFacturado,
    loading,
    error,
    success,
    cargarInventario,
    actualizarStock,
    cargarVetMascotas,
    asignar,
    desasignar,
    consultarFacturado,
    setError,
  } = useAdmin();

  const [tab, setTab] = useState<"inventario" | "asignaciones" | "facturacion" | "usuarios">("inventario");

  // ── Estado de usuarios ──
  const [usuarios, setUsuarios] = useState<UsuarioApp[]>([]);
  const [vetsParaUsuario, setVetsParaUsuario] = useState<Veterinario[]>([]);
  const [nuevoUser, setNuevoUser] = useState({ username: "", nombre: "", rol: "veterinario", vet_id: "", password: "1234" });
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [usuarioError, setUsuarioError] = useState<string | null>(null);
  const [usuarioSuccess, setUsuarioSuccess] = useState<string | null>(null);

  const cargarUsuarios = useCallback(async () => {
    setLoadingUsuarios(true);
    setUsuarioError(null);
    try {
      const [users, vets] = await Promise.all([adminApi.listarUsuarios(), veterinariosApi.listar()]);
      setUsuarios(users);
      setVetsParaUsuario(vets);
    } catch {
      setUsuarioError("Error al cargar usuarios");
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  const crearUsuario = useCallback(async () => {
    setUsuarioError(null);
    if (!nuevoUser.username.trim() || !nuevoUser.nombre.trim()) {
      setUsuarioError("Username y nombre son obligatorios");
      return;
    }
    try {
      await adminApi.crearUsuario({
        username: nuevoUser.username.trim(),
        nombre: nuevoUser.nombre.trim(),
        rol: nuevoUser.rol,
        vet_id: nuevoUser.rol === "veterinario" && nuevoUser.vet_id ? Number(nuevoUser.vet_id) : null,
        password: nuevoUser.password || "1234",
      });
      setUsuarioSuccess("Usuario creado");
      setTimeout(() => setUsuarioSuccess(null), 2500);
      setNuevoUser({ username: "", nombre: "", rol: "veterinario", vet_id: "", password: "1234" });
      const users = await adminApi.listarUsuarios();
      setUsuarios(users);
    } catch (e: unknown) {
      setUsuarioError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al crear usuario");
    }
  }, [nuevoUser]);

  const toggleActivo = useCallback(async (username: string, activo: boolean) => {
    try {
      const updated = await adminApi.cambiarActivo(username, activo);
      setUsuarios((prev) => prev.map((u) => (u.username === username ? updated : u)));
      setUsuarioSuccess(`Usuario ${activo ? "activado" : "desactivado"}`);
      setTimeout(() => setUsuarioSuccess(null), 2000);
    } catch {
      setUsuarioError("Error al cambiar estado del usuario");
    }
  }, []);
  const [editStock, setEditStock] = useState<Record<number, string>>({});
  const [newVetId, setNewVetId] = useState<number | "">("");
  const [newMascotaId, setNewMascotaId] = useState<number | "">("");
  const [factMascotaId, setFactMascotaId] = useState("");
  const [factAnio, setFactAnio] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (tab === "inventario") cargarInventario();
    if (tab === "asignaciones") cargarVetMascotas();
    if (tab === "usuarios") cargarUsuarios();
  }, [tab, cargarInventario, cargarVetMascotas, cargarUsuarios]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Panel Administrador</h1>
        <p className="page-description">
          Gestión de inventario de vacunas, asignaciones veterinario↔mascota y facturación (fn_total_facturado).
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
        {(["inventario", "asignaciones", "facturacion", "usuarios"] as const).map((t) => (
          <button
            key={t}
            className="nav-link"
            style={{
              borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
              borderBottom: tab === t ? "2px solid var(--text-1)" : "2px solid transparent",
              color: tab === t ? "var(--text-1)" : "var(--text-3)",
              paddingBottom: "10px",
            }}
            onClick={() => { setTab(t); setError(null); }}
          >
            {t === "inventario" ? "Inventario vacunas" : t === "asignaciones" ? "Vet ↔ Mascota" : t === "facturacion" ? "Facturación" : "Usuarios"}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "16px" }}>⚠️ {error}</div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: "16px" }}>✓ {success}</div>
      )}

      {/* ── TAB: INVENTARIO ── */}
      {tab === "inventario" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Inventario de vacunas</div>
              <div className="card-subtitle">El trigger trg_stock_vacuna decrementa stock al aplicar una vacuna</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={cargarInventario} disabled={loading}>
              Recargar
            </button>
          </div>

          {loading ? (
            <div className="empty-state"><span className="spinner" /></div>
          ) : inventario.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">Sin datos</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Vacuna</th>
                    <th>Stock actual</th>
                    <th>Stock mínimo</th>
                    <th>Precio unitario</th>
                    <th>Estado</th>
                    <th>Actualizar stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.map((item) => {
                    const bajo = item.stock_actual <= item.stock_minimo;
                    return (
                      <tr key={item.id}>
                        <td className="text-mono" style={{ color: "var(--text-3)" }}>#{item.id}</td>
                        <td style={{ fontWeight: 500 }}>{item.nombre_vacuna}</td>
                        <td className="text-mono" style={{ color: bajo ? "var(--err)" : "var(--text-1)" }}>
                          {item.stock_actual}
                        </td>
                        <td className="text-mono" style={{ color: "var(--text-3)" }}>{item.stock_minimo}</td>
                        <td className="text-mono" style={{ color: "var(--text-2)" }}>
                          {item.precio_unitario != null ? `$${item.precio_unitario.toFixed(2)}` : "—"}
                        </td>
                        <td>
                          <span className={`badge ${bajo ? "badge-nunca" : "badge-ok"}`}>
                            {bajo ? "⚠ Bajo" : "OK"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input
                              type="number"
                              min="0"
                              style={{
                                width: "70px",
                                background: "var(--bg-3)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-sm)",
                                color: "var(--text-1)",
                                padding: "4px 8px",
                                fontSize: "13px",
                                outline: "none",
                              }}
                              value={editStock[item.id] ?? item.stock_actual}
                              onChange={(e) =>
                                setEditStock((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                const val = parseInt(editStock[item.id] ?? String(item.stock_actual));
                                if (!isNaN(val)) actualizarStock(item.id, val);
                              }}
                            >
                              Guardar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ASIGNACIONES ── */}
      {tab === "asignaciones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Nueva asignación</div>
                <div className="card-subtitle">Asigna una mascota a un veterinario (tabla vet_atiende_mascota)</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "flex-end" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Veterinario</label>
                <select
                  className="form-select"
                  value={newVetId}
                  onChange={(e) => setNewVetId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Seleccionar...</option>
                  {veterinarios.map((v) => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Mascota</label>
                <select
                  className="form-select"
                  value={newMascotaId}
                  onChange={(e) => setNewMascotaId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Seleccionar...</option>
                  {mascotas.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre} ({m.especie})</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                disabled={!newVetId || !newMascotaId}
                onClick={() => {
                  if (newVetId && newMascotaId) {
                    asignar(Number(newVetId), Number(newMascotaId));
                    setNewVetId("");
                    setNewMascotaId("");
                  }
                }}
              >
                Asignar
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Asignaciones actuales</div>
                <div className="card-subtitle">{vetMascotas.length} asignaciones registradas</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={cargarVetMascotas} disabled={loading}>
                Recargar
              </button>
            </div>

            {loading ? (
              <div className="empty-state"><span className="spinner" /></div>
            ) : vetMascotas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔗</div>
                <div className="empty-state-title">Sin asignaciones</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Veterinario</th>
                      <th>Mascota</th>
                      <th>Especie</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vetMascotas.map((a) => (
                      <tr key={`${a.vet_id}-${a.mascota_id}`}>
                        <td style={{ fontWeight: 500 }}>{a.nombre_vet}</td>
                        <td>{a.nombre_mascota}</td>
                        <td style={{ color: "var(--text-2)" }}>
                          {a.especie === "perro" ? "🐕" : a.especie === "gato" ? "🐈" : "🐇"} {a.especie}
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => desasignar(a.vet_id, a.mascota_id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: FACTURACIÓN ── */}
      {tab === "facturacion" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Total facturado por mascota</div>
              <div className="card-subtitle">
                Llama a{" "}
                <code style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>fn_total_facturado(mascota_id, año)</code>
                {" "}— suma citas COMPLETADAS + vacunas aplicadas
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px auto", gap: "12px", alignItems: "flex-end", marginBottom: "20px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">ID de mascota</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej: 1"
                value={factMascotaId}
                onChange={(e) => setFactMascotaId(e.target.value)}
                min="1"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Año</label>
              <input
                type="number"
                className="form-input"
                value={factAnio}
                onChange={(e) => setFactAnio(e.target.value)}
                min="2020"
                max="2099"
              />
            </div>
            <button
              className="btn btn-primary"
              disabled={loading || !factMascotaId || !factAnio}
              onClick={() => consultarFacturado(Number(factMascotaId), Number(factAnio))}
            >
              {loading ? <><span className="spinner" /> Consultando...</> : "Consultar"}
            </button>
          </div>

          {totalFacturado && (
            <div
              style={{
                background: "var(--bg-3)",
                border: "1px solid var(--border-hi)",
                borderRadius: "var(--radius)",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", fontFamily: "var(--font-mono)" }}>
                fn_total_facturado({totalFacturado.mascota_id}, {totalFacturado.anio})
              </div>
              <div style={{ fontSize: "36px", fontWeight: 700, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
                ${totalFacturado.total.toFixed(2)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "8px" }}>
                Citas completadas + vacunas aplicadas en {totalFacturado.anio}
              </div>
              {totalFacturado.total === 0 && (
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>
                  COALESCE retornó 0 — no hay registros para ese año (nunca NULL)
                </div>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: "20px",
              padding: "14px 16px",
              background: "var(--bg-3)",
              borderRadius: "var(--radius)",
              fontSize: "12px",
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Mascotas del seed: ID 1 (Toby) · ID 2 (Firulais) · ID 3 (Luna) · ID 4 (Mishi)
            <br />
            Años con datos: 2024, 2025
          </div>
        </div>
      )}
      {/* ── TAB: USUARIOS ── */}
      {tab === "usuarios" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {usuarioError && <div className="alert alert-error">⚠️ {usuarioError}</div>}
          {usuarioSuccess && <div className="alert alert-success">✓ {usuarioSuccess}</div>}

          {/* Formulario crear usuario */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Crear nuevo usuario</div>
                <div className="card-subtitle">Se guarda en la tabla <code style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>usuarios_app</code> de PostgreSQL</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px 1fr 120px auto", gap: "12px", alignItems: "flex-end" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Username</label>
                <input className="form-input" placeholder="ej: drperez" value={nuevoUser.username}
                  onChange={(e) => setNuevoUser((p) => ({ ...p, username: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nombre completo</label>
                <input className="form-input" placeholder="Dr. Juan Pérez" value={nuevoUser.nombre}
                  onChange={(e) => setNuevoUser((p) => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Rol</label>
                <select className="form-select" value={nuevoUser.rol}
                  onChange={(e) => setNuevoUser((p) => ({ ...p, rol: e.target.value, vet_id: "" }))}>
                  <option value="veterinario">Veterinario</option>
                  <option value="recepcion">Recepción</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {nuevoUser.rol === "veterinario" ? (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Veterinario BD</label>
                  <select className="form-select" value={nuevoUser.vet_id}
                    onChange={(e) => setNuevoUser((p) => ({ ...p, vet_id: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {vetsParaUsuario.map((v) => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div />
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Password</label>
                <input className="form-input" type="text" value={nuevoUser.password}
                  onChange={(e) => setNuevoUser((p) => ({ ...p, password: e.target.value }))} />
              </div>
              <button className="btn btn-primary"
                disabled={!nuevoUser.username || !nuevoUser.nombre || (nuevoUser.rol === "veterinario" && !nuevoUser.vet_id)}
                onClick={crearUsuario}>
                Crear
              </button>
            </div>
          </div>

          {/* Lista de usuarios */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Usuarios del sistema</div>
                <div className="card-subtitle">{usuarios.length} usuarios registrados</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={cargarUsuarios} disabled={loadingUsuarios}>Recargar</button>
            </div>
            {loadingUsuarios ? (
              <div className="empty-state"><span className="spinner" /></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Vet ID</th>
                      <th>Password</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.username}>
                        <td className="text-mono" style={{ color: "var(--text-2)" }}>{u.username}</td>
                        <td style={{ fontWeight: 500 }}>{u.nombre}</td>
                        <td><span className={`role-badge role-${u.rol}`}>{u.rol}</span></td>
                        <td className="text-mono" style={{ color: "var(--text-3)" }}>{u.vet_id ?? "—"}</td>
                        <td className="text-mono" style={{ color: "var(--text-3)" }}>1234</td>
                        <td>
                          <span className={`badge ${u.activo ? "badge-ok" : "badge-nunca"}`}>
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${u.activo ? "btn-danger" : "btn-secondary"}`}
                            onClick={() => toggleActivo(u.username, !u.activo)}
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
