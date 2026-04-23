import { useCallback, useState } from "react";
import { adminApi, mascotasApi, veterinariosApi } from "../services/apiClient";
import type { InventarioVacuna, Mascota, TotalFacturado, VetMascota, Veterinario } from "../models/types";

export function useAdmin() {
  const [inventario, setInventario] = useState<InventarioVacuna[]>([]);
  const [vetMascotas, setVetMascotas] = useState<VetMascota[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [totalFacturado, setTotalFacturado] = useState<TotalFacturado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cargarInventario = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.inventario();
      setInventario(data);
    } catch {
      setError("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarStock = useCallback(async (invId: number, nuevoStock: number) => {
    try {
      await adminApi.actualizarStock(invId, nuevoStock);
      setInventario((prev) =>
        prev.map((i) => (i.id === invId ? { ...i, stock_actual: nuevoStock } : i))
      );
      setSuccess("Stock actualizado");
      setTimeout(() => setSuccess(null), 2500);
    } catch {
      setError("Error al actualizar stock");
    }
  }, []);

  const cargarVetMascotas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [asigs, vets, mcts] = await Promise.all([
        adminApi.vetMascotas(),
        veterinariosApi.listar(),
        mascotasApi.buscar(""),
      ]);
      setVetMascotas(asigs);
      setVeterinarios(vets);
      setMascotas(mcts);
    } catch {
      setError("Error al cargar asignaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  const asignar = useCallback(async (vetId: number, mascotaId: number) => {
    try {
      await adminApi.asignar(vetId, mascotaId);
      setSuccess("Asignación creada");
      setTimeout(() => setSuccess(null), 2500);
      const data = await adminApi.vetMascotas();
      setVetMascotas(data);
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Error al asignar"
      );
    }
  }, []);

  const desasignar = useCallback(async (vetId: number, mascotaId: number) => {
    try {
      await adminApi.desasignar(vetId, mascotaId);
      setVetMascotas((prev) =>
        prev.filter((a) => !(a.vet_id === vetId && a.mascota_id === mascotaId))
      );
      setSuccess("Asignación eliminada");
      setTimeout(() => setSuccess(null), 2500);
    } catch {
      setError("Error al eliminar asignación");
    }
  }, []);

  const consultarFacturado = useCallback(async (mascotaId: number, anio: number) => {
    setLoading(true);
    setError(null);
    setTotalFacturado(null);
    try {
      const data = await adminApi.totalFacturado(mascotaId, anio);
      setTotalFacturado(data);
    } catch {
      setError("Error al consultar facturación");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
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
  };
}
