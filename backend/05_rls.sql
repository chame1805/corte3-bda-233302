-- =============================================================
-- CORTE 3 · Row-Level Security (RLS)
--
-- Mecanismo para comunicar la identidad del veterinario a PostgreSQL:
-- Se usa current_setting('app.current_vet_id', true)
-- La API lo establece con: SET LOCAL app.current_vet_id = '{id}'
-- dentro de cada transacción. SET LOCAL revierte al terminar la transacción,
-- lo que lo hace seguro en pools de conexiones reutilizadas.
--
-- BYPASSRLS en rol_admin elimina la necesidad de políticas para ese rol.
-- =============================================================

-- Habilitar RLS en las tres tablas sensibles
ALTER TABLE mascotas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacunas_aplicadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas              ENABLE ROW LEVEL SECURITY;

-- FORCE asegura que incluso el owner de la tabla sea filtrado si usa un rol afectado
ALTER TABLE mascotas          FORCE ROW LEVEL SECURITY;
ALTER TABLE vacunas_aplicadas FORCE ROW LEVEL SECURITY;
ALTER TABLE citas              FORCE ROW LEVEL SECURITY;

-- Eliminar políticas previas para poder re-ejecutar el script
DROP POLICY IF EXISTS pol_mascotas_veterinario  ON mascotas;
DROP POLICY IF EXISTS pol_mascotas_recepcion    ON mascotas;
DROP POLICY IF EXISTS pol_vacunas_veterinario   ON vacunas_aplicadas;
DROP POLICY IF EXISTS pol_citas_veterinario     ON citas;
DROP POLICY IF EXISTS pol_citas_recepcion       ON citas;

-- =============================================================
-- TABLA mascotas
-- =============================================================

-- Veterinario: solo ve mascotas que aparecen en vet_atiende_mascota con su vet_id
-- NULLIF convierte string vacío en NULL para evitar error de cast
CREATE POLICY pol_mascotas_veterinario
    ON mascotas
    FOR ALL
    TO rol_veterinario
    USING (
        id IN (
            SELECT mascota_id
            FROM vet_atiende_mascota
            WHERE vet_id = NULLIF(current_setting('app.current_vet_id', true), '')::INT
        )
    );

-- Recepción: ve todas las mascotas sin restricción
CREATE POLICY pol_mascotas_recepcion
    ON mascotas
    FOR ALL
    TO rol_recepcion
    USING (true);

-- Admin: usa BYPASSRLS, no necesita política.

-- =============================================================
-- TABLA vacunas_aplicadas
-- Recepción no tiene GRANT sobre esta tabla, por lo que
-- la política solo necesita cubrir a veterinarios.
-- =============================================================

-- Veterinario: solo ve vacunas de sus mascotas
CREATE POLICY pol_vacunas_veterinario
    ON vacunas_aplicadas
    FOR ALL
    TO rol_veterinario
    USING (
        mascota_id IN (
            SELECT mascota_id
            FROM vet_atiende_mascota
            WHERE vet_id = NULLIF(current_setting('app.current_vet_id', true), '')::INT
        )
    );

-- =============================================================
-- TABLA citas
-- =============================================================

-- Veterinario: solo ve las citas donde él es el veterinario asignado
CREATE POLICY pol_citas_veterinario
    ON citas
    FOR ALL
    TO rol_veterinario
    USING (
        veterinario_id = NULLIF(current_setting('app.current_vet_id', true), '')::INT
    );

-- Recepción: ve todas las citas (necesita saber disponibilidad de veterinarios)
CREATE POLICY pol_citas_recepcion
    ON citas
    FOR ALL
    TO rol_recepcion
    USING (true);

-- =============================================================
-- Verificación rápida
-- =============================================================
DO $$
BEGIN
    RAISE NOTICE 'RLS configurado correctamente.';
    RAISE NOTICE '  mascotas:          RLS activo (vet filtrado, recepcion total, admin bypass)';
    RAISE NOTICE '  vacunas_aplicadas: RLS activo (vet filtrado, recepcion sin acceso por GRANT)';
    RAISE NOTICE '  citas:             RLS activo (vet filtrado, recepcion total, admin bypass)';
    RAISE NOTICE '';
    RAISE NOTICE 'Variable de sesión: SET LOCAL app.current_vet_id = <id>';
    RAISE NOTICE 'Ejemplo: SET LOCAL app.current_vet_id = ''1'';';
END
$$;
