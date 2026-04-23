"""
Adaptadores PostgreSQL que implementan los puertos del dominio.
TODA query usa %s de psycopg2 — nunca concatenación de strings.
Esta es la defensa principal contra SQL injection.
"""
import logging
from typing import List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor

from ...domain.entities import Cita, InventarioVacuna, Mascota, VacunaAplicada, VacunaPendiente, VetMascota, Veterinario
from ...domain.ports import AdminRepository, CitaRepository, MascotaRepository, VacunaRepository, VeterinarioRepository

logger = logging.getLogger(__name__)


class PostgresMascotaRepository(MascotaRepository):
    def __init__(self, conn):
        self._conn = conn

    def buscar(self, termino: str) -> List[Mascota]:
        """
        DEFENSA SQL INJECTION — línea crítica:
        El parámetro termino se pasa como %s, nunca interpolado en el string.
        psycopg2 escapa caracteres especiales: ', --, ;, UNION, etc.
        Archivo: api/src/infrastructure/db/repositories.py — este método.
        """
        sql = """
            SELECT m.id, m.nombre, m.especie, m.fecha_nacimiento, m.dueno_id,
                   d.nombre AS nombre_dueno, d.telefono
            FROM mascotas m
            JOIN duenos d ON d.id = m.dueno_id
            WHERE m.nombre ILIKE %s
            ORDER BY m.nombre
            LIMIT 50
        """
        with self._conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (f"%{termino}%",))
            rows = cur.fetchall()

        return [
            Mascota(
                id=r["id"],
                nombre=r["nombre"],
                especie=r["especie"],
                fecha_nacimiento=r["fecha_nacimiento"],
                dueno_id=r["dueno_id"],
                nombre_dueno=r["nombre_dueno"],
                telefono_dueno=r["telefono"],
            )
            for r in rows
        ]

    def obtener_por_id(self, mascota_id: int) -> Optional[Mascota]:
        sql = """
            SELECT m.id, m.nombre, m.especie, m.fecha_nacimiento, m.dueno_id,
                   d.nombre AS nombre_dueno, d.telefono
            FROM mascotas m
            JOIN duenos d ON d.id = m.dueno_id
            WHERE m.id = %s
        """
        with self._conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (mascota_id,))
            row = cur.fetchone()

        if not row:
            return None
        return Mascota(
            id=row["id"],
            nombre=row["nombre"],
            especie=row["especie"],
            fecha_nacimiento=row["fecha_nacimiento"],
            dueno_id=row["dueno_id"],
            nombre_dueno=row["nombre_dueno"],
            telefono_dueno=row["telefono"],
        )


class PostgresCitaRepository(CitaRepository):
    def __init__(self, conn):
        self._conn = conn

    def agendar(
        self,
        mascota_id: int,
        veterinario_id: int,
        fecha_hora: str,
        motivo: str,
    ) -> int:
        """
        Llama al stored procedure sp_agendar_cita.
        Todos los valores se pasan como parámetros %s.
        El procedure valida reglas de negocio y lanza excepciones descriptivas.
        """
        sql = "CALL sp_agendar_cita(%s, %s, %s, %s, NULL)"
        with self._conn.cursor() as cur:
            cur.execute(sql, (mascota_id, veterinario_id, fecha_hora, motivo))
            row = cur.fetchone()
            return row[0]  # OUT p_cita_id

    def listar_todas(self) -> List[Cita]:
        sql = """
            SELECT c.id, c.mascota_id, c.veterinario_id, c.fecha_hora,
                   c.motivo, c.costo, c.estado,
                   m.nombre AS nombre_mascota,
                   v.nombre AS nombre_veterinario
            FROM citas c
            JOIN mascotas m ON m.id = c.mascota_id
            JOIN veterinarios v ON v.id = c.veterinario_id
            ORDER BY c.fecha_hora DESC
            LIMIT 100
        """
        with self._conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall()
        return [
            Cita(
                id=r["id"],
                mascota_id=r["mascota_id"],
                veterinario_id=r["veterinario_id"],
                fecha_hora=r["fecha_hora"],
                motivo=r["motivo"],
                costo=float(r["costo"]) if r["costo"] else None,
                estado=r["estado"],
                nombre_mascota=r["nombre_mascota"],
                nombre_veterinario=r["nombre_veterinario"],
            )
            for r in rows
        ]

    def listar_por_mascota(self, mascota_id: int) -> List[Cita]:
        sql = """
            SELECT c.id, c.mascota_id, c.veterinario_id, c.fecha_hora,
                   c.motivo, c.costo, c.estado,
                   m.nombre AS nombre_mascota,
                   v.nombre AS nombre_veterinario
            FROM citas c
            JOIN mascotas m ON m.id = c.mascota_id
            JOIN veterinarios v ON v.id = c.veterinario_id
            WHERE c.mascota_id = %s
            ORDER BY c.fecha_hora DESC
        """
        with self._conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (mascota_id,))
            rows = cur.fetchall()

        return [
            Cita(
                id=r["id"],
                mascota_id=r["mascota_id"],
                veterinario_id=r["veterinario_id"],
                fecha_hora=r["fecha_hora"],
                motivo=r["motivo"],
                costo=float(r["costo"]) if r["costo"] else None,
                estado=r["estado"],
                nombre_mascota=r["nombre_mascota"],
                nombre_veterinario=r["nombre_veterinario"],
            )
            for r in rows
        ]


class PostgresVacunaRepository(VacunaRepository):
    def __init__(self, conn):
        self._conn = conn

    def listar_pendientes(self) -> List[VacunaPendiente]:
        sql = "SELECT * FROM v_mascotas_vacunacion_pendiente ORDER BY prioridad, dias_desde_ultima_vacuna DESC NULLS FIRST"
        with self._conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall()

        return [
            VacunaPendiente(
                mascota_id=r["mascota_id"],
                nombre_mascota=r["nombre_mascota"],
                especie=r["especie"],
                nombre_dueno=r["nombre_dueno"],
                telefono=r["telefono"],
                fecha_ultima_vacuna=r["fecha_ultima_vacuna"],
                dias_desde_ultima_vacuna=r["dias_desde_ultima_vacuna"],
                prioridad=r["prioridad"],
            )
            for r in rows
        ]

    def aplicar(
        self,
        mascota_id: int,
        vacuna_id: int,
        veterinario_id: int,
        costo_cobrado: float,
    ) -> int:
        sql = """
            INSERT INTO vacunas_aplicadas (mascota_id, vacuna_id, veterinario_id, costo_cobrado)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        with self._conn.cursor() as cur:
            cur.execute(sql, (mascota_id, vacuna_id, veterinario_id, costo_cobrado))
            return cur.fetchone()[0]


class PostgresVeterinarioRepository(VeterinarioRepository):
    def __init__(self, conn):
        self._conn = conn

    def listar_activos(self) -> List[Veterinario]:
        sql = "SELECT id, nombre, cedula, dias_descanso, activo FROM veterinarios WHERE activo = TRUE ORDER BY nombre"
        with self._conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall()
        return [
            Veterinario(
                id=r["id"],
                nombre=r["nombre"],
                cedula=r["cedula"],
                dias_descanso=r["dias_descanso"] or "",
                activo=r["activo"],
            )
            for r in rows
        ]


class PostgresAdminRepository(AdminRepository):
    def __init__(self, conn):
        self._conn = conn

    def listar_inventario(self) -> List[InventarioVacuna]:
        sql = "SELECT id, nombre, stock_actual, stock_minimo, costo_unitario FROM inventario_vacunas ORDER BY nombre"
        with self._conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall()
        return [
            InventarioVacuna(
                id=r["id"],
                nombre_vacuna=r["nombre"],
                stock_actual=r["stock_actual"],
                stock_minimo=r["stock_minimo"],
                precio_unitario=float(r["costo_unitario"]) if r["costo_unitario"] else None,
            )
            for r in rows
        ]

    def actualizar_stock(self, inv_id: int, nuevo_stock: int) -> None:
        sql = "UPDATE inventario_vacunas SET stock_actual = %s WHERE id = %s"
        with self._conn.cursor() as cur:
            cur.execute(sql, (nuevo_stock, inv_id))

    def listar_vet_mascotas(self) -> List[VetMascota]:
        sql = """
            SELECT vm.vet_id, v.nombre AS nombre_vet,
                   vm.mascota_id, m.nombre AS nombre_mascota, m.especie
            FROM vet_atiende_mascota vm
            JOIN veterinarios v ON v.id = vm.vet_id
            JOIN mascotas m ON m.id = vm.mascota_id
            ORDER BY v.nombre, m.nombre
        """
        with self._conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall()
        return [
            VetMascota(
                vet_id=r["vet_id"],
                nombre_vet=r["nombre_vet"],
                mascota_id=r["mascota_id"],
                nombre_mascota=r["nombre_mascota"],
                especie=r["especie"],
            )
            for r in rows
        ]

    def asignar(self, vet_id: int, mascota_id: int) -> None:
        sql = "INSERT INTO vet_atiende_mascota (vet_id, mascota_id) VALUES (%s, %s) ON CONFLICT DO NOTHING"
        with self._conn.cursor() as cur:
            cur.execute(sql, (vet_id, mascota_id))

    def desasignar(self, vet_id: int, mascota_id: int) -> None:
        sql = "DELETE FROM vet_atiende_mascota WHERE vet_id = %s AND mascota_id = %s"
        with self._conn.cursor() as cur:
            cur.execute(sql, (vet_id, mascota_id))

    def total_facturado(self, mascota_id: int, anio: int) -> float:
        sql = "SELECT fn_total_facturado(%s, %s) AS total"
        with self._conn.cursor() as cur:
            cur.execute(sql, (mascota_id, anio))
            return float(cur.fetchone()[0])
