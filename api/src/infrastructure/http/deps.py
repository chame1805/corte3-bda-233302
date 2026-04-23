"""
Inyección de dependencias para los routers.
Extrae el token, valida, y construye el contexto de DB con el rol correcto.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..cache.redis_adapter import RedisCacheAdapter, get_redis
from ..db.connection import get_db
from .security import TokenPayload, decodificar_token

bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> TokenPayload:
    try:
        return decodificar_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


def require_role(*roles: str):
    def _check(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol '{user.role}' no tiene permiso para esta operación",
            )
        return user
    return _check


def get_cache():
    return RedisCacheAdapter(get_redis())
