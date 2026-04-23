from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class Mascota:
    id: int
    nombre: str
    especie: str
    fecha_nacimiento: Optional[date]
    dueno_id: int
    nombre_dueno: Optional[str] = None
    telefono_dueno: Optional[str] = None


@dataclass
class Veterinario:
    id: int
    nombre: str
    cedula: str
    dias_descanso: str
    activo: bool


@dataclass
class Cita:
    id: int
    mascota_id: int
    veterinario_id: int
    fecha_hora: datetime
    motivo: Optional[str]
    costo: Optional[float]
    estado: str
    nombre_mascota: Optional[str] = None
    nombre_veterinario: Optional[str] = None


@dataclass
class VacunaPendiente:
    mascota_id: int
    nombre_mascota: str
    especie: str
    nombre_dueno: str
    telefono: Optional[str]
    fecha_ultima_vacuna: Optional[date]
    dias_desde_ultima_vacuna: Optional[int]
    prioridad: str


@dataclass
class InventarioVacuna:
    id: int
    nombre_vacuna: str
    stock_actual: int
    stock_minimo: int
    precio_unitario: Optional[float]


@dataclass
class VetMascota:
    vet_id: int
    nombre_vet: str
    mascota_id: int
    nombre_mascota: str
    especie: str


@dataclass
class VacunaAplicada:
    id: int
    mascota_id: int
    vacuna_id: int
    veterinario_id: int
    fecha_aplicacion: date
    costo_cobrado: Optional[float]
