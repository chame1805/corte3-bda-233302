from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ....application.use_cases import AgendarCita, BuscarMascotas, ListarCitasMascota, ListarTodasCitas
from ....infrastructure.db.connection import get_db
from ....infrastructure.db.repositories import PostgresCitaRepository, PostgresMascotaRepository
from ..deps import get_current_user, require_role
from ..schemas import AgendarCitaRequest, AgendarCitaResponse, CitaOut, MascotaOut
from ..security import TokenPayload

router = APIRouter(prefix="/mascotas", tags=["mascotas"])


@router.get("", response_model=List[MascotaOut])
def buscar_mascotas(
    q: str = Query(default="", description="Término de búsqueda por nombre"),
    user: TokenPayload = Depends(require_role("veterinario", "recepcion", "admin")),
):
    """
    Busca mascotas por nombre.
    RLS filtra resultados según el rol:
      - veterinario → solo sus mascotas asignadas
      - recepcion   → todas las mascotas
      - admin       → todas las mascotas (BYPASSRLS)

    DEFENSA SQL INJECTION:
    El parámetro 'q' se pasa a PostgresMascotaRepository.buscar() que usa:
        cur.execute(sql, (f"%{termino}%",))
    psycopg2 escapa cualquier caracter especial antes de enviar a la BD.
    Ver: api/src/infrastructure/db/repositories.py — método buscar(), línea ~40
    """
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresMascotaRepository(conn)
        use_case = BuscarMascotas(repo)
        mascotas = use_case.ejecutar(q)

    return [
        MascotaOut(
            id=m.id,
            nombre=m.nombre,
            especie=m.especie,
            fecha_nacimiento=m.fecha_nacimiento,
            nombre_dueno=m.nombre_dueno,
            telefono_dueno=m.telefono_dueno,
        )
        for m in mascotas
    ]


@router.get("/citas", response_model=List[CitaOut])
def listar_citas(
    user: TokenPayload = Depends(require_role("veterinario", "recepcion", "admin")),
):
    """RLS filtra: vet solo ve sus citas, recepcion y admin ven todas."""
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresCitaRepository(conn)
        citas = ListarTodasCitas(repo).ejecutar()
    return [
        CitaOut(
            id=c.id, mascota_id=c.mascota_id, veterinario_id=c.veterinario_id,
            fecha_hora=c.fecha_hora, motivo=c.motivo, costo=c.costo,
            estado=c.estado, nombre_mascota=c.nombre_mascota,
            nombre_veterinario=c.nombre_veterinario,
        )
        for c in citas
    ]


@router.post("/citas", response_model=AgendarCitaResponse, status_code=status.HTTP_201_CREATED)
def agendar_cita(
    body: AgendarCitaRequest,
    user: TokenPayload = Depends(require_role("veterinario", "recepcion", "admin")),
):
    """
    Agenda una cita llamando al stored procedure sp_agendar_cita.
    El procedure valida: existencia de mascota y vet, día de descanso, colisión de horario.
    """
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresCitaRepository(conn)
        use_case = AgendarCita(repo)
        try:
            cita_id = use_case.ejecutar(
                body.mascota_id,
                body.veterinario_id,
                body.fecha_hora,
                body.motivo,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    return AgendarCitaResponse(cita_id=cita_id)


@router.get("/{mascota_id}/citas", response_model=List[CitaOut])
def listar_citas_mascota(
    mascota_id: int,
    user: TokenPayload = Depends(require_role("veterinario", "recepcion", "admin")),
):
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresCitaRepository(conn)
        use_case = ListarCitasMascota(repo)
        citas = use_case.ejecutar(mascota_id)

    return [
        CitaOut(
            id=c.id,
            mascota_id=c.mascota_id,
            veterinario_id=c.veterinario_id,
            fecha_hora=c.fecha_hora,
            motivo=c.motivo,
            costo=c.costo,
            estado=c.estado,
            nombre_mascota=c.nombre_mascota,
            nombre_veterinario=c.nombre_veterinario,
        )
        for c in citas
    ]
