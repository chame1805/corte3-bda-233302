import { useCallback, useState } from "react";
import { vacunasApi } from "../services/apiClient";
import type { VacunaPendiente } from "../models/types";

export function useVacunacion() {
  const [pendientes, setPendientes] = useState<VacunaPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<string | null>(null);
  const [latencia, setLatencia] = useState<number | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const inicio = performance.now();
    try {
      const data = await vacunasApi.pendientes();
      const ms = Math.round(performance.now() - inicio);
      setLatencia(ms);
      setPendientes(data);
      setLoadedOnce(true);
      // Heurística: Redis suele responder en <20ms, PostgreSQL >50ms
      setCacheInfo(ms < 30 ? "CACHE HIT (Redis)" : "CACHE MISS (PostgreSQL)");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al cargar vacunación pendiente");
    } finally {
      setLoading(false);
    }
  }, []);

  const aplicarVacuna = useCallback(
    async (mascota_id: number, vacuna_id: number, costo_cobrado: number) => {
      await vacunasApi.aplicar({ mascota_id, vacuna_id, costo_cobrado });
      // Forzar recarga para mostrar CACHE MISS después de la invalidación
      setCacheInfo(null);
      await cargar();
    },
    [cargar]
  );

  return { pendientes, loading, error, cacheInfo, latencia, loadedOnce, cargar, aplicarVacuna };
}
