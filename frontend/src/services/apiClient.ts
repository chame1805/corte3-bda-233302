import axios from "axios";
import type {
  AgendarCitaPayload,
  AplicarVacunaPayload,
  Cita,
  DemoUser,
  InventarioVacuna,
  Mascota,
  TotalFacturado,
  User,
  UsuarioApp,
  VacunaPendiente,
  VetMascota,
  Veterinario,
} from "../models/types";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8001",
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const raw = localStorage.getItem("auth_user");
  if (raw) {
    const user: User = JSON.parse(raw);
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export const authApi = {
  login: async (username: string, password: string): Promise<User> => {
    const { data } = await http.post("/auth/login", { username, password });
    return {
      username,
      role: data.role,
      name: data.name,
      vet_id: data.vet_id,
      token: data.access_token,
    };
  },
  getDemoUsers: async (): Promise<DemoUser[]> => {
    const { data } = await http.get("/auth/usuarios-demo");
    return data;
  },
};

export const mascotasApi = {
  buscar: async (q: string): Promise<Mascota[]> => {
    const { data } = await http.get("/mascotas", { params: { q } });
    return data;
  },
  agendarCita: async (payload: AgendarCitaPayload) => {
    const { data } = await http.post("/mascotas/citas", payload);
    return data;
  },
  listarCitas: async (mascotaId: number): Promise<Cita[]> => {
    const { data } = await http.get(`/mascotas/${mascotaId}/citas`);
    return data;
  },
  listarTodasCitas: async (): Promise<Cita[]> => {
    const { data } = await http.get("/mascotas/citas");
    return data;
  },
};

export const vacunasApi = {
  pendientes: async (): Promise<VacunaPendiente[]> => {
    const { data } = await http.get("/vacunas/pendientes");
    return data;
  },
  aplicar: async (payload: AplicarVacunaPayload) => {
    const { data } = await http.post("/vacunas/aplicar", payload);
    return data;
  },
};

export const veterinariosApi = {
  listar: async (): Promise<Veterinario[]> => {
    const { data } = await http.get("/veterinarios");
    return data;
  },
};

export const adminApi = {
  inventario: async (): Promise<InventarioVacuna[]> => {
    const { data } = await http.get("/admin/inventario");
    return data;
  },
  actualizarStock: async (invId: number, nuevoStock: number) => {
    const { data } = await http.patch(`/admin/inventario/${invId}/stock`, {
      nuevo_stock: nuevoStock,
    });
    return data;
  },
  vetMascotas: async (): Promise<VetMascota[]> => {
    const { data } = await http.get("/admin/vet-mascotas");
    return data;
  },
  asignar: async (vetId: number, mascotaId: number) => {
    const { data } = await http.post("/admin/vet-mascotas", {
      vet_id: vetId,
      mascota_id: mascotaId,
    });
    return data;
  },
  desasignar: async (vetId: number, mascotaId: number) => {
    const { data } = await http.delete("/admin/vet-mascotas", {
      params: { vet_id: vetId, mascota_id: mascotaId },
    });
    return data;
  },
  totalFacturado: async (mascotaId: number, anio: number): Promise<TotalFacturado> => {
    const { data } = await http.get(`/admin/total-facturado/${mascotaId}/${anio}`);
    return data;
  },
  listarUsuarios: async (): Promise<UsuarioApp[]> => {
    const { data } = await http.get("/admin/usuarios");
    return data;
  },
  crearUsuario: async (payload: {
    username: string;
    nombre: string;
    rol: string;
    vet_id?: number | null;
    password: string;
  }): Promise<UsuarioApp> => {
    const { data } = await http.post("/admin/usuarios", payload);
    return data;
  },
  cambiarActivo: async (username: string, activo: boolean): Promise<UsuarioApp> => {
    const { data } = await http.patch(`/admin/usuarios/${username}/activo`, null, {
      params: { activo },
    });
    return data;
  },
};
