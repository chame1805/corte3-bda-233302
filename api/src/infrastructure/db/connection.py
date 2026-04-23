"""
Gestión de pools de conexión por rol.
Cada rol tiene su propio pool con las credenciales correspondientes.
"""
import contextlib
import logging
import os
from typing import Generator

import psycopg2
from psycopg2 import pool as pgpool
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

_pools: dict[str, pgpool.ThreadedConnectionPool] = {}


def init_pools() -> None:
    host = os.environ["DB_HOST"]
    port = os.environ["DB_PORT"]
    name = os.environ["DB_NAME"]

    configs = {
        "veterinario": (os.environ["DB_USER_VET"], os.environ["DB_PASS_VET"]),
        "recepcion":   (os.environ["DB_USER_REC"], os.environ["DB_PASS_REC"]),
        "admin":       (os.environ["DB_USER_ADM"], os.environ["DB_PASS_ADM"]),
    }

    for role, (user, password) in configs.items():
        dsn = f"host={host} port={port} dbname={name} user={user} password={password}"
        _pools[role] = pgpool.ThreadedConnectionPool(1, 10, dsn=dsn)
        logger.info("Pool inicializado para rol: %s", role)


def close_pools() -> None:
    for role, p in _pools.items():
        p.closeall()
        logger.info("Pool cerrado para rol: %s", role)


@contextlib.contextmanager
def get_db(role: str, vet_id: int | None = None) -> Generator:
    """
    Obtiene una conexión del pool correspondiente al rol.
    Si el rol es 'veterinario', establece la variable de sesión
    SET LOCAL app.current_vet_id dentro de la transacción.

    SET LOCAL expira al hacer commit/rollback, lo que lo hace
    seguro en pools donde las conexiones se reutilizan.
    """
    if role not in _pools:
        raise ValueError(f"Rol desconocido: {role}")

    p = _pools[role]
    conn = p.getconn()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if role == "veterinario" and vet_id is not None:
                # DEFENSA SQL INJECTION: %s con psycopg2 escapa correctamente
                cur.execute("SET LOCAL app.current_vet_id = %s", (str(vet_id),))
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        p.putconn(conn)
