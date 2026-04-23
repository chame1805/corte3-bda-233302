export interface User {
  username: string;
  role: "veterinario" | "recepcion" | "admin";
  name: string;
  vet_id: number | null;
  token: string;
}

export interface DemoUser {
  username: string;
  role: string;
  name: string;
}

export interface Mascota {
  id: number;
  nombre: string;
  especie: string;
  fecha_nacimiento: string | null;
  nombre_dueno: string | null;
  telefono_dueno: string | null;
}

export interface Veterinario {
  id: number;
  nombre: string;
  dias_descanso: string | null;
  activo: boolean;
}

export interface Cita {
  id: number;
  mascota_id: number;
  veterinario_id: number;
  fecha_hora: string;
  motivo: string | null;
  costo: number | null;
  estado: string;
  nombre_mascota: string | null;
  nombre_veterinario: string | null;
}

export interface VacunaPendiente {
  mascota_id: number;
  nombre_mascota: string;
  especie: string;
  nombre_dueno: string;
  telefono: string | null;
  fecha_ultima_vacuna: string | null;
  dias_desde_ultima_vacuna: number | null;
  prioridad: "NUNCA_VACUNADA" | "VENCIDA";
}

export interface AgendarCitaPayload {
  mascota_id: number;
  veterinario_id: number;
  fecha_hora: string;
  motivo: string;
}

export interface AplicarVacunaPayload {
  mascota_id: number;
  vacuna_id: number;
  costo_cobrado: number;
}

export interface InventarioVacuna {
  id: number;
  nombre_vacuna: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number | null;
}

export interface VetMascota {
  vet_id: number;
  nombre_vet: string;
  mascota_id: number;
  nombre_mascota: string;
  especie: string;
}

export interface TotalFacturado {
  mascota_id: number;
  anio: number;
  total: number;
}

export interface UsuarioApp {
  username: string;
  nombre: string;
  rol: string;
  vet_id: number | null;
  activo: boolean;
}
