from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from ....application.use_cases import AplicarVacuna, ObtenerVacunacionPendiente
from ....infrastructure.db.connection import get_db
from ....infrastructure.db.repositories import PostgresVacunaRepository
from ..deps import get_cache, get_current_user, require_role
from ..schemas import AplicarVacunaRequest, AplicarVacunaResponse, VacunaPendienteOut
from ..security import TokenPayload

router = APIRouter(prefix="/vacunas", tags=["vacunas"])


@router.get("/pendientes", response_model=List[VacunaPendienteOut])
def vacunacion_pendiente(
    user: TokenPayload = Depends(require_role("veterinario", "admin")),
    cache=Depends(get_cache),
):
    """
    Retorna mascotas con vacunación pendiente.
    Resultado cacheado en Redis con TTL=300s (5 minutos).
    Cache key: 'vacunacion_pendiente'
    Invalidación: automática al aplicar una vacuna nueva.
    """
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresVacunaRepository(conn)
        use_case = ObtenerVacunacionPendiente(repo, cache)
        pendientes = use_case.ejecutar()

    return [
        VacunaPendienteOut(
            mascota_id=p.mascota_id,
            nombre_mascota=p.nombre_mascota,
            especie=p.especie,
            nombre_dueno=p.nombre_dueno,
            telefono=p.telefono,
            fecha_ultima_vacuna=p.fecha_ultima_vacuna,
            dias_desde_ultima_vacuna=p.dias_desde_ultima_vacuna,
            prioridad=p.prioridad,
        )
        for p in pendientes
    ]


@router.post("/aplicar", response_model=AplicarVacunaResponse, status_code=status.HTTP_201_CREATED)
def aplicar_vacuna(
    body: AplicarVacunaRequest,
    user: TokenPayload = Depends(require_role("veterinario", "admin")),
    cache=Depends(get_cache),
):
    """
    Aplica una vacuna a una mascota.
    Después de insertar, invalida el caché de vacunación_pendiente
    para que la próxima consulta refleje el cambio.
    """
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresVacunaRepository(conn)
        use_case = AplicarVacuna(repo, cache)
        try:
            nueva_id = use_case.ejecutar(
                body.mascota_id,
                body.vacuna_id,
                user.vet_id or 0,
                body.costo_cobrado,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    return AplicarVacunaResponse(id=nueva_id)
