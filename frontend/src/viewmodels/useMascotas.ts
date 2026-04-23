import { useCallback, useState } from "react";
import { mascotasApi } from "../services/apiClient";
import type { Mascota } from "../models/types";

export function useMascotas() {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const buscar = useCallback(async (termino: string) => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const resultado = await mascotasApi.buscar(termino);
      setMascotas(resultado);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Error al buscar mascotas";
      setError(msg);
      setMascotas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  return { mascotas, query, loading, error, searched, buscar, handleQueryChange };
}
