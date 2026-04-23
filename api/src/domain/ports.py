"""
Puertos (interfaces) del dominio.
Definen QUÉ operaciones existen sin conocer cómo se implementan.
La capa de aplicación solo depende de estos puertos.
"""
from abc import ABC, abstractmethod
from typing import List, Optional

from .entities import Cita, InventarioVacuna, Mascota, VacunaAplicada, VacunaPendiente, VetMascota, Veterinario


class MascotaRepository(ABC):
    @abstractmethod
    def buscar(self, termino: str) -> List[Mascota]:
        ...

    @abstractmethod
    def obtener_por_id(self, mascota_id: int) -> Optional[Mascota]:
        ...


class CitaRepository(ABC):
    @abstractmethod
    def listar_todas(self) -> List[Cita]:
        ...

    @abstractmethod
    def agendar(
        self,
        mascota_id: int,
        veterinario_id: int,
        fecha_hora: str,
        motivo: str,
    ) -> int:
        ...

    @abstractmethod
    def listar_por_mascota(self, mascota_id: int) -> List[Cita]:
        ...


class VacunaRepository(ABC):
    @abstractmethod
    def listar_pendientes(self) -> List[VacunaPendiente]:
        ...

    @abstractmethod
    def aplicar(
        self,
        mascota_id: int,
        vacuna_id: int,
        veterinario_id: int,
        costo_cobrado: float,
    ) -> int:
        ...


class VeterinarioRepository(ABC):
    @abstractmethod
    def listar_activos(self) -> List[Veterinario]:
        ...


class AdminRepository(ABC):
    @abstractmethod
    def listar_inventario(self) -> List[InventarioVacuna]:
        ...

    @abstractmethod
    def actualizar_stock(self, inv_id: int, nuevo_stock: int) -> None:
        ...

    @abstractmethod
    def listar_vet_mascotas(self) -> List[VetMascota]:
        ...

    @abstractmethod
    def asignar(self, vet_id: int, mascota_id: int) -> None:
        ...

    @abstractmethod
    def desasignar(self, vet_id: int, mascota_id: int) -> None:
        ...

    @abstractmethod
    def total_facturado(self, mascota_id: int, anio: int) -> float:
        ...


class CachePort(ABC):
    @abstractmethod
    def get(self, key: str) -> Optional[str]:
        ...

    @abstractmethod
    def set(self, key: str, value: str, ttl: int) -> None:
        ...

    @abstractmethod
    def delete(self, key: str) -> None:
        ...
