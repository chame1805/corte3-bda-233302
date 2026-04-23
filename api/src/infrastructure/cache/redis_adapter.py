import logging
import os
from typing import Optional

import redis

logger = logging.getLogger(__name__)

_client: Optional[redis.Redis] = None


def init_redis() -> None:
    global _client
    _client = redis.from_url(os.environ["REDIS_URL"], decode_responses=True)
    _client.ping()
    logger.info("Redis conectado: %s", os.environ["REDIS_URL"])


def get_redis() -> redis.Redis:
    if _client is None:
        raise RuntimeError("Redis no inicializado")
    return _client


class RedisCacheAdapter:
    """Adaptador Redis que implementa el puerto CachePort del dominio."""

    def __init__(self, client: redis.Redis):
        self._client = client

    def get(self, key: str) -> Optional[str]:
        return self._client.get(key)

    def set(self, key: str, value: str, ttl: int) -> None:
        self._client.setex(key, ttl, value)

    def delete(self, key: str) -> None:
        self._client.delete(key)
