from typing import List

from fastapi import APIRouter, Depends

from ....application.use_cases import ListarVeterinarios
from ....infrastructure.db.connection import get_db
from ....infrastructure.db.repositories import PostgresVeterinarioRepository
from ..deps import require_role
from ..schemas import VeterinarioOut
from ..security import TokenPayload

router = APIRouter(prefix="/veterinarios", tags=["veterinarios"])


@router.get("", response_model=List[VeterinarioOut])
def listar_veterinarios(
    user: TokenPayload = Depends(require_role("veterinario", "recepcion", "admin")),
):
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresVeterinarioRepository(conn)
        vets = ListarVeterinarios(repo).ejecutar()

    return [
        VeterinarioOut(id=v.id, nombre=v.nombre, dias_descanso=v.dias_descanso, activo=v.activo)
        for v in vets
    ]
