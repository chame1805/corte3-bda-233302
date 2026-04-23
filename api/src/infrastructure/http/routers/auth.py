from fastapi import APIRouter, HTTPException, status
from psycopg2.extras import RealDictCursor

from ....infrastructure.db.connection import get_db
from ..schemas import LoginRequest, LoginResponse
from ..security import crear_token_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    """Valida credenciales contra la tabla usuarios_app en PostgreSQL."""
    with get_db("admin", None) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT username, nombre, rol, vet_id FROM usuarios_app WHERE username = %s AND password = %s AND activo = TRUE",
                (body.username, body.password),
            )
            user = cur.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas o usuario inactivo",
        )

    token = crear_token_db(user["username"], user["rol"], user["vet_id"], user["nombre"])
    return LoginResponse(
        access_token=token,
        role=user["rol"],
        name=user["nombre"],
        vet_id=user["vet_id"],
    )


@router.get("/usuarios-demo")
def usuarios_demo():
    """Lista todos los usuarios activos (para la pantalla de login del demo)."""
    with get_db("admin", None) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT username, nombre, rol FROM usuarios_app WHERE activo = TRUE ORDER BY rol, nombre"
            )
            users = cur.fetchall()
    return [{"username": u["username"], "role": u["rol"], "name": u["nombre"]} for u in users]
