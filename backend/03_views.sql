-- =============================================================
-- CORTE 3 · Vista
-- v_mascotas_vacunacion_pendiente
--
-- CTE ultima_vacuna: calcula la fecha más reciente de vacuna por mascota.
-- Separar este cálculo en un CTE lo hace reutilizable y legible.
-- El LEFT JOIN incluye mascotas que nunca fueron vacunadas (uv.ultima_fecha IS NULL).
-- =============================================================

CREATE OR REPLACE VIEW v_mascotas_vacunacion_pendiente AS
WITH ultima_vacuna AS (
    -- CTE: una fila por mascota con su fecha de vacuna más reciente
    SELECT
        mascota_id,
        MAX(fecha_aplicacion) AS ultima_fecha
    FROM vacunas_aplicadas
    GROUP BY mascota_id
)
SELECT
    m.id                                            AS mascota_id,
    m.nombre                                        AS nombre_mascota,
    m.especie,
    d.nombre                                        AS nombre_dueno,
    d.telefono,
    uv.ultima_fecha                                 AS fecha_ultima_vacuna,
    -- CURRENT_DATE - DATE devuelve INTEGER en PostgreSQL (días)
    CASE
        WHEN uv.ultima_fecha IS NULL THEN NULL
        ELSE (CURRENT_DATE - uv.ultima_fecha)
    END                                             AS dias_desde_ultima_vacuna,
    CASE
        WHEN uv.ultima_fecha IS NULL THEN 'NUNCA_VACUNADA'
        ELSE 'VENCIDA'
    END                                             AS prioridad
FROM mascotas m
JOIN duenos d ON d.id = m.dueno_id
LEFT JOIN ultima_vacuna uv ON uv.mascota_id = m.id
WHERE
    uv.ultima_fecha IS NULL                        -- nunca vacunada
    OR (CURRENT_DATE - uv.ultima_fecha) > 365;    -- vacuna vencida (más de 1 año)
