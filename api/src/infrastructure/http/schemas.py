from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    vet_id: Optional[int]


class MascotaOut(BaseModel):
    id: int
    nombre: str
    especie: str
    fecha_nacimiento: Optional[date]
    nombre_dueno: Optional[str]
    telefono_dueno: Optional[str]


class AgendarCitaRequest(BaseModel):
    mascota_id: int
    veterinario_id: int
    fecha_hora: str
    motivo: str

    @field_validator("motivo")
    @classmethod
    def motivo_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El motivo no puede estar vacío")
        return v.strip()


class AgendarCitaResponse(BaseModel):
    cita_id: int
    mensaje: str = "Cita agendada correctamente"


class VacunaPendienteOut(BaseModel):
    mascota_id: int
    nombre_mascota: str
    especie: str
    nombre_dueno: str
    telefono: Optional[str]
    fecha_ultima_vacuna: Optional[date]
    dias_desde_ultima_vacuna: Optional[int]
    prioridad: str


class AplicarVacunaRequest(BaseModel):
    mascota_id: int
    vacuna_id: int
    costo_cobrado: float


class AplicarVacunaResponse(BaseModel):
    id: int
    mensaje: str = "Vacuna aplicada y caché invalidado"


class ErrorResponse(BaseModel):
    detail: str


class VeterinarioOut(BaseModel):
    id: int
    nombre: str
    dias_descanso: Optional[str]
    activo: bool


class CitaOut(BaseModel):
    id: int
    mascota_id: int
    veterinario_id: int
    fecha_hora: datetime
    motivo: Optional[str]
    costo: Optional[float]
    estado: str
    nombre_mascota: Optional[str]
    nombre_veterinario: Optional[str]


class InventarioOut(BaseModel):
    id: int
    nombre_vacuna: str
    stock_actual: int
    stock_minimo: int
    precio_unitario: Optional[float]


class StockUpdateRequest(BaseModel):
    nuevo_stock: int


class VetMascotaOut(BaseModel):
    vet_id: int
    nombre_vet: str
    mascota_id: int
    nombre_mascota: str
    especie: str


class VetMascotaRequest(BaseModel):
    vet_id: int
    mascota_id: int


class TotalFacturadoOut(BaseModel):
    mascota_id: int
    anio: int
    total: float


class UsuarioOut(BaseModel):
    username: str
    nombre: str
    rol: str
    vet_id: Optional[int]
    activo: bool


class UsuarioCreateRequest(BaseModel):
    username: str
    nombre: str
    rol: str
    vet_id: Optional[int] = None
    password: str = "1234"
