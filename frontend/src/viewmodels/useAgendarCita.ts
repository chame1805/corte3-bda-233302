import { useCallback, useState } from "react";
import { mascotasApi, veterinariosApi } from "../services/apiClient";
import type { Mascota, Veterinario } from "../models/types";

export function useAgendarCita() {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);
  const [query, setQuery] = useState("");
  const [mascotaId, setMascotaId] = useState<number | "">("");
  const [veterinarioId, setVeterinarioId] = useState<number | "">("");
  const [fechaHora, setFechaHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingVets, setLoadingVets] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarVeterinarios = useCallback(async () => {
    setLoadingVets(true);
    try {
      const data = await veterinariosApi.listar();
      setVeterinarios(data);
    } catch {
      // silencioso — el formulario mostrará sin opciones
    } finally {
      setLoadingVets(false);
    }
  }, []);

  const buscarMascotas = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) {
      setMascotas([]);
      return;
    }
    try {
      const data = await mascotasApi.buscar(q);
      setMascotas(data);
    } catch {
      setMascotas([]);
    }
  }, []);

  const agendar = useCallback(async () => {
    if (!mascotaId || !veterinarioId || !fechaHora || !motivo.trim()) {
      setError("Todos los campos son obligatorios");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await mascotasApi.agendarCita({
        mascota_id: Number(mascotaId),
        veterinario_id: Number(veterinarioId),
        fecha_hora: fechaHora.replace("T", " "),
        motivo: motivo.trim(),
      });
      setSuccess(`Cita #${res.cita_id} agendada correctamente`);
      setMascotaId("");
      setVeterinarioId("");
      setFechaHora("");
      setMotivo("");
      setQuery("");
      setMascotas([]);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Error al agendar la cita";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [mascotaId, veterinarioId, fechaHora, motivo]);

  return {
    mascotas,
    veterinarios,
    query,
    mascotaId,
    veterinarioId,
    fechaHora,
    motivo,
    loading,
    loadingVets,
    success,
    error,
    cargarVeterinarios,
    buscarMascotas,
    setMascotaId,
    setVeterinarioId,
    setFechaHora,
    setMotivo,
    agendar,
  };
}
