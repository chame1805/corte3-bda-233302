import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .infrastructure.cache.redis_adapter import init_redis
from .infrastructure.db.connection import close_pools, init_pools
from .infrastructure.http.routers import auth, mascotas, vacunas
from .infrastructure.http.routers import veterinarios, admin as admin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

app = FastAPI(
    title="Clínica Veterinaria API",
    description="Sistema seguro con RLS, Redis cache y hardening contra SQL Injection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(mascotas.router)
app.include_router(vacunas.router)
app.include_router(veterinarios.router)
app.include_router(admin_router.router)


@app.on_event("startup")
def startup():
    init_pools()
    init_redis()


@app.on_event("shutdown")
def shutdown():
    close_pools()


@app.get("/health")
def health():
    return {"status": "ok"}
