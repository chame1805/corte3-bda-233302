"""
Manejo de JWT para autenticación basada en roles.
Los usuarios demo están hardcodeados (no se evalúa auth real, solo roles).
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from pydantic import BaseModel

JWT_SECRET = os.environ.get("JWT_SECRET", "dev_secret")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "480"))

# Usuarios de demostración para mostrar RLS y permisos
DEMO_USERS = {
    "lopez":     {"password": "1234", "role": "veterinario", "vet_id": 1, "name": "Dr. Fernando López Castro"},
    "garcia":    {"password": "1234", "role": "veterinario", "vet_id": 2, "name": "Dra. Sofía García Velasco"},
    "mendez":    {"password": "1234", "role": "veterinario", "vet_id": 3, "name": "Dr. Andrés Méndez Bravo"},
    "recepcion": {"password": "1234", "role": "recepcion",   "vet_id": None, "name": "Personal de Recepción"},
    "admin":     {"password": "1234", "role": "admin",       "vet_id": None, "name": "Administrador"},
}


class TokenPayload(BaseModel):
    sub: str
    role: str
    vet_id: Optional[int]
    name: str


def crear_token(username: str) -> str:
    user = DEMO_USERS[username]
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": username,
        "role": user["role"],
        "vet_id": user["vet_id"],
        "name": user["name"],
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def crear_token_db(username: str, role: str, vet_id, name: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": username, "role": role, "vet_id": vet_id, "name": name, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decodificar_token(token: str) -> TokenPayload:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return TokenPayload(**data)
    except JWTError as exc:
        raise ValueError("Token inválido o expirado") from exc
