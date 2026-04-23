import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./viewmodels/useAuth";
import { LoginView } from "./views/LoginView";
import { BusquedaView } from "./views/BusquedaView";
import { VacunacionView } from "./views/VacunacionView";
import { AgendarCitaView } from "./views/AgendarCitaView";
import { AdminView } from "./views/AdminView";
import { Navbar } from "./views/components/Navbar";

export default function App() {
  const { user, demoUsers, loading, error, login, logout } = useAuth();

  if (!user) {
    return (
      <LoginView
        demoUsers={demoUsers}
        loading={loading}
        error={error}
        onLogin={login}
      />
    );
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar user={user} onLogout={logout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/mascotas" replace />} />
            <Route path="/mascotas" element={<BusquedaView user={user} />} />
            <Route
              path="/citas"
              element={<AgendarCitaView user={user} />}
            />
            <Route
              path="/vacunacion"
              element={
                user.role === "recepcion" ? (
                  <div className="alert alert-error">
                    ⛔ Tu rol <strong>recepcion</strong> no tiene permiso para ver vacunas aplicadas.
                    Esta operación fue bloqueada por REVOKE en PostgreSQL.
                  </div>
                ) : (
                  <VacunacionView user={user} />
                )
              }
            />
            <Route
              path="/admin"
              element={
                user.role !== "admin" ? (
                  <div className="alert alert-error">
                    ⛔ Acceso denegado. Esta sección es exclusiva del administrador.
                  </div>
                ) : (
                  <AdminView />
                )
              }
            />
            <Route path="*" element={<Navigate to="/mascotas" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
