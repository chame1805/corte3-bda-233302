-- =============================================================
-- CORTE 3 · Trigger
-- trg_historial_cita: registra en historial_movimientos cada nueva cita
-- AFTER INSERT: necesitamos NEW.id (generado por SERIAL) que solo existe
-- después del INSERT. Con BEFORE, la cita aún no tiene ID asignado.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_registrar_historial_cita()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_nombre_mascota    TEXT;
    v_nombre_vet        TEXT;
BEGIN
    SELECT nombre INTO v_nombre_mascota
    FROM mascotas
    WHERE id = NEW.mascota_id;

    SELECT nombre INTO v_nombre_vet
    FROM veterinarios
    WHERE id = NEW.veterinario_id;

    INSERT INTO historial_movimientos (tipo, referencia_id, descripcion)
    VALUES (
        'CITA_AGENDADA',
        NEW.id,
        format(
            'Cita para %s con %s el %s',
            v_nombre_mascota,
            v_nombre_vet,
            TO_CHAR(NEW.fecha_hora, 'DD/MM/YYYY')
        )
    );

    RETURN NEW;
END;
$$;

-- DROP para evitar duplicados si se re-ejecuta el script
DROP TRIGGER IF EXISTS trg_historial_cita ON citas;

CREATE TRIGGER trg_historial_cita
    AFTER INSERT ON citas
    FOR EACH ROW
    EXECUTE FUNCTION fn_registrar_historial_cita();


-- =============================================================
-- Trigger secundario: alerta de stock bajo al aplicar vacuna
-- Si después de aplicar una vacuna el stock cae por debajo del mínimo,
-- inserta una alerta automática.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_alerta_stock_vacuna()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_vacuna    inventario_vacunas%ROWTYPE;
BEGIN
    SELECT * INTO v_vacuna
    FROM inventario_vacunas
    WHERE id = NEW.vacuna_id;

    -- Descontar stock
    UPDATE inventario_vacunas
    SET stock_actual = stock_actual - 1
    WHERE id = NEW.vacuna_id;

    -- Verificar si quedó por debajo del mínimo
    IF (v_vacuna.stock_actual - 1) < v_vacuna.stock_minimo THEN
        INSERT INTO alertas (tipo, descripcion)
        VALUES (
            'STOCK_BAJO',
            format('Stock bajo de vacuna "%s": %s unidades (mínimo: %s)',
                   v_vacuna.nombre,
                   v_vacuna.stock_actual - 1,
                   v_vacuna.stock_minimo)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_vacuna ON vacunas_aplicadas;

CREATE TRIGGER trg_stock_vacuna
    AFTER INSERT ON vacunas_aplicadas
    FOR EACH ROW
    EXECUTE FUNCTION fn_alerta_stock_vacuna();
