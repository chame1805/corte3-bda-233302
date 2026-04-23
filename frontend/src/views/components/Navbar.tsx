import { useNavigate, useLocation } from "react-router-dom";
import type { User } from "../../models/types";

interface Props {
  user: User;
  onLogout: () => void;
}

export function Navbar({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navItems = [
    { path: "/mascotas", label: "Buscar Mascotas", roles: ["veterinario", "recepcion", "admin"] },
    { path: "/citas", label: "Agendar Cita", roles: ["veterinario", "recepcion", "admin"] },
    { path: "/vacunacion", label: "Vacunación", roles: ["veterinario", "admin"] },
    { path: "/admin", label: "Panel Admin", roles: ["admin"] },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        🐾 <span>VetClinic</span>
        <span style={{ color: "var(--text-3)", fontSize: "12px", fontWeight: 400 }}>
          Sistema Seguro
        </span>
      </div>

      <div className="navbar-nav">
        {navItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => (
            <button
              key={item.path}
              className={`nav-link ${pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
      </div>

      <div className="navbar-user">
        <span style={{ color: "var(--text-2)", fontSize: "13px" }}>{user.name}</span>
        <span className={`role-badge role-${user.role}`}>{user.role}</span>
        <button className="btn btn-secondary btn-sm" onClick={onLogout}>
          Salir
        </button>
      </div>
    </nav>
  );
}
