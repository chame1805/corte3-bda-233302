"""
Casos de uso: lógica de aplicación.
Solo importa del dominio. No conoce PostgreSQL, Redis, ni HTTP.
"""
import json
import logging
from typing import List

from ..domain.entities import Cita, InventarioVacuna, Mascota, VacunaAplicada, VacunaPendiente, VetMascota, Veterinario
from ..domain.ports import AdminRepository, CachePort, CitaRepository, MascotaRepository, VacunaRepository, VeterinarioRepository

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 300  # 5 minutos: balance entre frescura y carga en BD


def cache_key_vacunacion(role: str, vet_id: int | None) -> str:
    """
    Key por rol+vet_id para evitar que la caché de un usuario
    contamine los resultados de otro (cada vet ve sus mascotas vía RLS).
    """
    return f"vacunacion_pendiente:{role}:{vet_id or 'all'}"


class BuscarMascotas:
    """Busca mascotas por nombre. El RLS filtra resultados según el rol."""

    def __init__(self, repo: MascotaRepository):
        self._repo = repo

    def ejecutar(self, termino: str) -> List[Mascota]:
        return self._repo.buscar(termino.strip())


class AgendarCita:
    """Llama al procedure sp_agendar_cita que valida todas las reglas de negocio."""

    def __init__(self, repo: CitaRepository):
        self._repo = repo

    def ejecutar(
        self,
        mascota_id: int,
        veterinario_id: int,
        fecha_hora: str,
        motivo: str,
    ) -> int:
        return self._repo.agendar(mascota_id, veterinario_id, fecha_hora, motivo)


class ObtenerVacunacionPendiente:
    """
    Obtiene lista de mascotas con vacunación pendiente.
    TTL 300s (5 min): la consulta tarda ~100-300ms y se llama frecuentemente.
    Con 5 min de caché, una clínica con 50 consultas/hora solo golpea la BD
    una vez cada 5 minutos en lugar de 50 veces.
    Invalidación activa: se borra el caché cuando se aplica una vacuna nueva.
    Key por rol+vet_id para que cada usuario tenga su propia entrada de caché.
    """

    def __init__(self, repo: VacunaRepository, cache: CachePort, key: str):
        self._repo = repo
        self._cache = cache
        self._key = key

    def ejecutar(self) -> List[VacunaPendiente]:
        cached = self._cache.get(self._key)
        if cached:
            logger.info("[CACHE HIT] %s — sirviendo desde Redis", self._key)
            data = json.loads(cached)
            return [VacunaPendiente(**item) for item in data]

        logger.info("[CACHE MISS] %s — consultando PostgreSQL", self._key)
        resultado = self._repo.listar_pendientes()

        payload = json.dumps([vars(r) for r in resultado], default=str)
        self._cache.set(self._key, payload, CACHE_TTL_SECONDS)
        logger.info("[CACHE SET] %s — TTL=%ds", self._key, CACHE_TTL_SECONDS)

        return resultado


class ListarVeterinarios:
    def __init__(self, repo: VeterinarioRepository):
        self._repo = repo

    def ejecutar(self) -> List[Veterinario]:
        return self._repo.listar_activos()


class ListarTodasCitas:
    def __init__(self, repo: CitaRepository):
        self._repo = repo

    def ejecutar(self) -> List[Cita]:
        return self._repo.listar_todas()


class ListarCitasMascota:
    def __init__(self, repo: CitaRepository):
        self._repo = repo

    def ejecutar(self, mascota_id: int) -> List[Cita]:
        return self._repo.listar_por_mascota(mascota_id)


class ObtenerInventario:
    def __init__(self, repo: AdminRepository):
        self._repo = repo

    def ejecutar(self) -> List[InventarioVacuna]:
        return self._repo.listar_inventario()


class ActualizarStock:
    def __init__(self, repo: AdminRepository):
        self._repo = repo

    def ejecutar(self, inv_id: int, nuevo_stock: int) -> None:
        self._repo.actualizar_stock(inv_id, nuevo_stock)


class ObtenerVetMascotas:
    def __init__(self, repo: AdminRepository):
        self._repo = repo

    def ejecutar(self) -> List[VetMascota]:
        return self._repo.listar_vet_mascotas()


class AsignarVetMascota:
    def __init__(self, repo: AdminRepository):
        self._repo = repo

    def ejecutar(self, vet_id: int, mascota_id: int) -> None:
        self._repo.asignar(vet_id, mascota_id)


class DesasignarVetMascota:
    def __init__(self, repo: AdminRepository):
        self._repo = repo

    def ejecutar(self, vet_id: int, mascota_id: int) -> None:
        self._repo.desasignar(vet_id, mascota_id)


class ObtenerTotalFacturado:
    def __init__(self, repo: AdminRepository):
        self._repo = repo

    def ejecutar(self, mascota_id: int, anio: int) -> float:
        return self._repo.total_facturado(mascota_id, anio)


class AplicarVacuna:
    """
    Registra la aplicación de una vacuna.
    Invalida el caché de vacunación pendiente porque los datos cambiaron.
    """

    def __init__(self, repo: VacunaRepository, cache: CachePort):
        self._repo = repo
        self._cache = cache

    def ejecutar(
        self,
        mascota_id: int,
        vacuna_id: int,
        veterinario_id: int,
        costo_cobrado: float,
    ) -> int:
        vacuna_id_nueva = self._repo.aplicar(mascota_id, vacuna_id, veterinario_id, costo_cobrado)
        key = cache_key_vacunacion("veterinario", veterinario_id) if veterinario_id else cache_key_vacunacion("admin", None)
        self._cache.delete(key)
        logger.info("[CACHE INVALIDADO] %s — nueva vacuna aplicada a mascota_id=%d", key, mascota_id)
        return vacuna_id_nueva
