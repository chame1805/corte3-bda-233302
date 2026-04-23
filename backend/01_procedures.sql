-- =============================================================
-- CORTE 3 · Stored Procedure
-- sp_agendar_cita: agenda una cita con todas las validaciones de negocio
-- =============================================================

CREATE OR REPLACE PROCEDURE sp_agendar_cita(
    p_mascota_id        INT,
    p_veterinario_id    INT,
    p_fecha_hora        TIMESTAMP,
    p_motivo            TEXT,
    OUT p_cita_id       INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_mascota       mascotas%ROWTYPE;
    v_vet           veterinarios%ROWTYPE;
    v_dia_semana    TEXT;
    v_colision_id   INT;
BEGIN
    -- 1. Verificar que la mascota existe
    SELECT * INTO v_mascota
    FROM mascotas
    WHERE id = p_mascota_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mascota con ID % no existe', p_mascota_id;
    END IF;

    -- 2. Verificar que el veterinario existe y está activo
    --    Manejo explícito de NULL en el campo activo
    SELECT * INTO v_vet
    FROM veterinarios
    WHERE id = p_veterinario_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Veterinario con ID % no existe', p_veterinario_id;
    END IF;

    IF v_vet.activo IS NULL OR v_vet.activo = FALSE THEN
        RAISE EXCEPTION 'El veterinario % no está activo y no puede recibir citas', v_vet.nombre;
    END IF;

    -- 3. Validar día de descanso
    --    EXTRACT(DOW) devuelve 0=domingo ... 6=sábado
    v_dia_semana := CASE EXTRACT(DOW FROM p_fecha_hora)
        WHEN 0 THEN 'domingo'
        WHEN 1 THEN 'lunes'
        WHEN 2 THEN 'martes'
        WHEN 3 THEN 'miercoles'
        WHEN 4 THEN 'jueves'
        WHEN 5 THEN 'viernes'
        WHEN 6 THEN 'sabado'
    END;

    IF v_vet.dias_descanso IS NOT NULL AND v_vet.dias_descanso != '' THEN
        IF v_dia_semana = ANY(string_to_array(v_vet.dias_descanso, ',')) THEN
            RAISE EXCEPTION 'El veterinario % descansa los %. No se puede agendar cita ese día.',
                v_vet.nombre, v_dia_semana;
        END IF;
    END IF;

    -- 4. Prevenir colisiones de horario usando advisory lock.
    --    FOR UPDATE requeriría privilegio UPDATE sobre citas, violando mínimo privilegio.
    --    pg_advisory_xact_lock() es un lock de transacción keyed por hash(vet_id+fecha_hora):
    --    dos transacciones concurrentes para el mismo slot quedarán serializadas aquí,
    --    y la segunda verá la fila ya insertada por la primera.
    PERFORM pg_advisory_xact_lock(
        hashtext(p_veterinario_id::TEXT || '_' || p_fecha_hora::TEXT)
    );

    SELECT id INTO v_colision_id
    FROM citas
    WHERE veterinario_id = p_veterinario_id
      AND fecha_hora = p_fecha_hora
      AND estado != 'CANCELADA';

    IF FOUND THEN
        RAISE EXCEPTION 'El veterinario % ya tiene una cita agendada para %',
            v_vet.nombre, TO_CHAR(p_fecha_hora, 'DD/MM/YYYY HH24:MI');
    END IF;

    -- 5. Insertar la cita y retornar el ID generado
    INSERT INTO citas (mascota_id, veterinario_id, fecha_hora, motivo, estado)
    VALUES (p_mascota_id, p_veterinario_id, p_fecha_hora, p_motivo, 'AGENDADA')
    RETURNING id INTO p_cita_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Re-lanza la excepción al llamador sin hacer ROLLBACK explícito.
        -- PostgreSQL maneja la transacción: si el CALL falla, el llamador decide el rollback.
        RAISE;
END;
$$;


-- =============================================================
-- Function: fn_total_facturado
-- Suma citas COMPLETADAS + vacunas aplicadas de una mascota en un año.
-- Retorna 0 (no NULL) si no hay registros.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_total_facturado(
    p_mascota_id    INT,
    p_anio          INT
) RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_citas   NUMERIC;
    v_total_vacunas NUMERIC;
BEGIN
    -- COALESCE asegura que SUM() nunca retorne NULL cuando no hay filas
    SELECT COALESCE(SUM(costo), 0) INTO v_total_citas
    FROM citas
    WHERE mascota_id = p_mascota_id
      AND estado = 'COMPLETADA'
      AND EXTRACT(YEAR FROM fecha_hora) = p_anio;

    SELECT COALESCE(SUM(costo_cobrado), 0) INTO v_total_vacunas
    FROM vacunas_aplicadas
    WHERE mascota_id = p_mascota_id
      AND EXTRACT(YEAR FROM fecha_aplicacion) = p_anio;

    RETURN v_total_citas + v_total_vacunas;
END;
$$;
