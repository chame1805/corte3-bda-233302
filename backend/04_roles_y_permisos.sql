-- =============================================================
-- CORTE 3 · Roles, Usuarios y Permisos
--
-- Principio de mínimo privilegio: cada rol recibe exactamente
-- lo que necesita para cumplir su función, nada más.
--
-- ROLES (grupos de permisos):
--   rol_veterinario  → solo sus mascotas, citas y vacunas (filtrado por RLS)
--   rol_recepcion    → todas las mascotas y dueños, agendar citas; SIN info médica
--   rol_admin        → acceso total + BYPASSRLS
--
-- USUARIOS DE BD (uno por rol, para connection pools separados en la API):
--   app_veterinario  → miembro de rol_veterinario
--   app_recepcion    → miembro de rol_recepcion
--   app_admin        → miembro de rol_admin
-- =============================================================

-- Crear roles (grupos) de manera idempotente
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_veterinario') THEN
        CREATE ROLE rol_veterinario;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_recepcion') THEN
        CREATE ROLE rol_recepcion;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_admin') THEN
        CREATE ROLE rol_admin;
    END IF;
END
$$;

-- Crear usuarios de aplicación (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_veterinario') THEN
        CREATE USER app_veterinario WITH PASSWORD 'VetPass2024!';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_recepcion') THEN
        CREATE USER app_recepcion WITH PASSWORD 'RecPass2024!';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
        CREATE USER app_admin WITH PASSWORD 'AdmPass2024!';
    END IF;
END
$$;

-- Asignar roles a usuarios
GRANT rol_veterinario TO app_veterinario;
GRANT rol_recepcion   TO app_recepcion;
GRANT rol_admin       TO app_admin;

-- Acceso al schema público
GRANT CONNECT ON DATABASE clinica_vet TO rol_veterinario, rol_recepcion, rol_admin;
GRANT USAGE ON SCHEMA public TO rol_veterinario, rol_recepcion, rol_admin;

-- =============================================================
-- ROL VETERINARIO
-- Puede ver sus mascotas (filtrado por RLS), sus citas, aplicar vacunas.
-- No puede modificar mascotas, dueños, ni inventario.
-- =============================================================
GRANT SELECT                    ON mascotas             TO rol_veterinario;
GRANT SELECT                    ON duenos               TO rol_veterinario;
GRANT SELECT                    ON veterinarios         TO rol_veterinario;
GRANT SELECT                    ON vet_atiende_mascota  TO rol_veterinario;
GRANT SELECT, INSERT            ON citas                TO rol_veterinario;
GRANT SELECT, INSERT            ON vacunas_aplicadas    TO rol_veterinario;
GRANT SELECT                    ON inventario_vacunas   TO rol_veterinario;
-- INSERT en historial_movimientos porque los triggers (trg_historial_cita,
-- trg_stock_vacuna) se ejecutan con los permisos del usuario que dispara el INSERT,
-- no con los del dueño de la tabla. Sin este permiso, el trigger fallaría.
GRANT SELECT, INSERT                ON historial_movimientos TO rol_veterinario;
GRANT SELECT, INSERT                ON alertas              TO rol_veterinario;
-- El trigger trg_stock_vacuna necesita UPDATE en inventario para decrementar stock
GRANT UPDATE (stock_actual)         ON inventario_vacunas   TO rol_veterinario;
-- Sequences necesarias para INSERT
GRANT USAGE ON SEQUENCE citas_id_seq                    TO rol_veterinario;
GRANT USAGE ON SEQUENCE vacunas_aplicadas_id_seq        TO rol_veterinario;
GRANT USAGE ON SEQUENCE historial_movimientos_id_seq    TO rol_veterinario;
GRANT USAGE ON SEQUENCE alertas_id_seq                  TO rol_veterinario;

-- =============================================================
-- ROL RECEPCION
-- Ve todos los pacientes y dueños, agenda citas.
-- NUNCA ve vacunas_aplicadas (información médica confidencial).
-- =============================================================
GRANT SELECT                    ON mascotas             TO rol_recepcion;
GRANT SELECT                    ON duenos               TO rol_recepcion;
GRANT SELECT                    ON veterinarios         TO rol_recepcion;
GRANT SELECT                    ON vet_atiende_mascota  TO rol_recepcion;
GRANT SELECT, INSERT            ON citas                TO rol_recepcion;
-- Igual que veterinarios, recepcion dispara trg_historial_cita al insertar citas
GRANT SELECT, INSERT            ON historial_movimientos TO rol_recepcion;
-- Sequence necesaria para INSERT en citas
GRANT USAGE ON SEQUENCE citas_id_seq                    TO rol_recepcion;
GRANT USAGE ON SEQUENCE historial_movimientos_id_seq    TO rol_recepcion;
-- Denegación explícita de información médica (aunque nunca fue otorgada, lo documentamos)
REVOKE ALL ON vacunas_aplicadas  FROM rol_recepcion;
REVOKE ALL ON inventario_vacunas FROM rol_recepcion;

-- =============================================================
-- ROL ADMIN
-- Acceso total. BYPASSRLS porque necesita ver todos los datos
-- para gestión del sistema, incluso los filtrados por RLS.
-- =============================================================
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO rol_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rol_admin;
-- BYPASSRLS NO se hereda por membresía de rol en PostgreSQL.
-- Debe asignarse directamente al usuario de conexión (app_admin).
ALTER ROLE app_admin BYPASSRLS;

-- También permite al admin ejecutar las funciones/procedures
GRANT EXECUTE ON ALL FUNCTIONS  IN SCHEMA public TO rol_admin;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO rol_admin;

-- Veterinarios y recepcion pueden llamar al procedure de citas
GRANT EXECUTE ON PROCEDURE sp_agendar_cita(INT, INT, TIMESTAMP, TEXT, INT) TO rol_veterinario;
GRANT EXECUTE ON PROCEDURE sp_agendar_cita(INT, INT, TIMESTAMP, TEXT, INT) TO rol_recepcion;
GRANT EXECUTE ON FUNCTION fn_total_facturado(INT, INT)                       TO rol_veterinario;
GRANT EXECUTE ON FUNCTION fn_total_facturado(INT, INT)                       TO rol_recepcion;

-- Asegurar permisos futuros con DEFAULT PRIVILEGES
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO rol_veterinario, rol_recepcion;
