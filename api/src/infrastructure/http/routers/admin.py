from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg2.extras import RealDictCursor

from ....application.use_cases import (
    ActualizarStock,
    AsignarVetMascota,
    DesasignarVetMascota,
    ObtenerInventario,
    ObtenerTotalFacturado,
    ObtenerVetMascotas,
)
from ....infrastructure.db.connection import get_db
from ....infrastructure.db.repositories import PostgresAdminRepository
from ..deps import require_role
from ..schemas import InventarioOut, StockUpdateRequest, TotalFacturadoOut, UsuarioCreateRequest, UsuarioOut, VetMascotaOut, VetMascotaRequest
from ..security import TokenPayload

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/inventario", response_model=List[InventarioOut])
def listar_inventario(
    user: TokenPayload = Depends(require_role("admin")),
):
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresAdminRepository(conn)
        items = ObtenerInventario(repo).ejecutar()
    return [
        InventarioOut(
            id=i.id,
            nombre_vacuna=i.nombre_vacuna,
            stock_actual=i.stock_actual,
            stock_minimo=i.stock_minimo,
            precio_unitario=i.precio_unitario,
        )
        for i in items
    ]


@router.patch("/inventario/{inv_id}/stock", status_code=status.HTTP_200_OK)
def actualizar_stock(
    inv_id: int,
    body: StockUpdateRequest,
    user: TokenPayload = Depends(require_role("admin")),
):
    if body.nuevo_stock < 0:
        raise HTTPException(status_code=400, detail="El stock no puede ser negativo")
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresAdminRepository(conn)
        ActualizarStock(repo).ejecutar(inv_id, body.nuevo_stock)
    return {"mensaje": "Stock actualizado"}


@router.get("/vet-mascotas", response_model=List[VetMascotaOut])
def listar_vet_mascotas(
    user: TokenPayload = Depends(require_role("admin")),
):
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresAdminRepository(conn)
        asignaciones = ObtenerVetMascotas(repo).ejecutar()
    return [
        VetMascotaOut(
            vet_id=a.vet_id,
            nombre_vet=a.nombre_vet,
            mascota_id=a.mascota_id,
            nombre_mascota=a.nombre_mascota,
            especie=a.especie,
        )
        for a in asignaciones
    ]


@router.post("/vet-mascotas", status_code=status.HTTP_201_CREATED)
def asignar_vet_mascota(
    body: VetMascotaRequest,
    user: TokenPayload = Depends(require_role("admin")),
):
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresAdminRepository(conn)
        AsignarVetMascota(repo).ejecutar(body.vet_id, body.mascota_id)
    return {"mensaje": "Asignación creada"}


@router.delete("/vet-mascotas", status_code=status.HTTP_200_OK)
def desasignar_vet_mascota(
    vet_id: int = Query(...),
    mascota_id: int = Query(...),
    user: TokenPayload = Depends(require_role("admin")),
):
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresAdminRepository(conn)
        DesasignarVetMascota(repo).ejecutar(vet_id, mascota_id)
    return {"mensaje": "Asignación eliminada"}


@router.get("/total-facturado/{mascota_id}/{anio}", response_model=TotalFacturadoOut)
def total_facturado(
    mascota_id: int,
    anio: int,
    user: TokenPayload = Depends(require_role("admin")),
):
    with get_db(user.role, user.vet_id) as conn:
        repo = PostgresAdminRepository(conn)
        total = ObtenerTotalFacturado(repo).ejecutar(mascota_id, anio)
    return TotalFacturadoOut(mascota_id=mascota_id, anio=anio, total=total)


# ── Gestión de usuarios ──────────────────────────────────────────

@router.get("/usuarios", response_model=List[UsuarioOut])
def listar_usuarios(user: TokenPayload = Depends(require_role("admin"))):
    with get_db(user.role, user.vet_id) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT username, nombre, rol, vet_id, activo FROM usuarios_app ORDER BY rol, nombre")
            rows = cur.fetchall()
    return [UsuarioOut(**dict(r)) for r in rows]


@router.post("/usuarios", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(body: UsuarioCreateRequest, user: TokenPayload = Depends(require_role("admin"))):
    if body.rol not in ("veterinario", "recepcion", "admin"):
        raise HTTPException(status_code=400, detail="Rol inválido")
    if body.rol == "veterinario" and not body.vet_id:
        raise HTTPException(status_code=400, detail="veterinario requiere vet_id")
    with get_db(user.role, user.vet_id) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute(
                    "INSERT INTO usuarios_app (username, nombre, rol, vet_id, password) VALUES (%s,%s,%s,%s,%s) RETURNING username, nombre, rol, vet_id, activo",
                    (body.username, body.nombre, body.rol, body.vet_id, body.password),
                )
                row = cur.fetchone()
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"No se pudo crear el usuario: {exc}") from exc
    return UsuarioOut(**dict(row))


@router.patch("/usuarios/{username}/activo", response_model=UsuarioOut)
def cambiar_activo(username: str, activo: bool = Query(...), user: TokenPayload = Depends(require_role("admin"))):
    if username == user.sub:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
    with get_db(user.role, user.vet_id) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "UPDATE usuarios_app SET activo=%s WHERE username=%s RETURNING username, nombre, rol, vet_id, activo",
                (activo, username),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return UsuarioOut(**dict(row))
