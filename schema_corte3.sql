-- =============================================================
-- ACTIVIDAD DE EVALUACIÓN · CORTE 3
-- Base de Datos Avanzadas · UP Chiapas · Abril 2026
-- Mtro. Ramsés Alejandro Camas Nájera
--
-- Schema: Sistema de Clínica Veterinaria (extendido para Corte 3)
-- =============================================================

DROP TABLE IF EXISTS alertas               CASCADE;
DROP TABLE IF EXISTS historial_movimientos CASCADE;
DROP TABLE IF EXISTS vacunas_aplicadas     CASCADE;
DROP TABLE IF EXISTS inventario_vacunas    CASCADE;
DROP TABLE IF EXISTS citas                 CASCADE;
DROP TABLE IF EXISTS vet_atiende_mascota   CASCADE;
DROP TABLE IF EXISTS mascotas              CASCADE;
DROP TABLE IF EXISTS veterinarios          CASCADE;
DROP TABLE IF EXISTS duenos                CASCADE;

-- =============================================================
-- TABLAS
-- =============================================================

CREATE TABLE duenos (
    id        SERIAL PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL,
    telefono  VARCHAR(20),
    email     VARCHAR(100)
);

CREATE TABLE veterinarios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    cedula          VARCHAR(20) NOT NULL UNIQUE,
    dias_descanso   VARCHAR(50) DEFAULT '',
    activo          BOOLEAN DEFAULT TRUE
);

CREATE TABLE mascotas (
    id                SERIAL PRIMARY KEY,
    nombre            VARCHAR(50) NOT NULL,
    especie           VARCHAR(30) NOT NULL,
    fecha_nacimiento  DATE,
    dueno_id          INT NOT NULL REFERENCES duenos(id)
);

CREATE TABLE vet_atiende_mascota (
    id                      SERIAL PRIMARY KEY,
    vet_id                  INT NOT NULL REFERENCES veterinarios(id),
    mascota_id              INT NOT NULL REFERENCES mascotas(id),
    fecha_inicio_atencion   DATE NOT NULL DEFAULT CURRENT_DATE,
    activa                  BOOLEAN DEFAULT TRUE,
    UNIQUE (vet_id, mascota_id)
);

CREATE INDEX idx_vam_vet      ON vet_atiende_mascota(vet_id);
CREATE INDEX idx_vam_mascota  ON vet_atiende_mascota(mascota_id);

CREATE TABLE citas (
    id              SERIAL PRIMARY KEY,
    mascota_id      INT NOT NULL REFERENCES mascotas(id),
    veterinario_id  INT NOT NULL REFERENCES veterinarios(id),
    fecha_hora      TIMESTAMP NOT NULL,
    motivo          TEXT,
    costo           NUMERIC(10, 2),
    estado          VARCHAR(20) DEFAULT 'AGENDADA'
                    CHECK (estado IN ('AGENDADA', 'COMPLETADA', 'CANCELADA'))
);

CREATE TABLE inventario_vacunas (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(80) NOT NULL,
    stock_actual    INT NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo    INT NOT NULL DEFAULT 5,
    costo_unitario  NUMERIC(10, 2) NOT NULL
);

CREATE TABLE vacunas_aplicadas (
    id                  SERIAL PRIMARY KEY,
    mascota_id          INT NOT NULL REFERENCES mascotas(id),
    vacuna_id           INT NOT NULL REFERENCES inventario_vacunas(id),
    veterinario_id      INT NOT NULL REFERENCES veterinarios(id),
    fecha_aplicacion    DATE NOT NULL DEFAULT CURRENT_DATE,
    costo_cobrado       NUMERIC(10, 2)
);

CREATE TABLE historial_movimientos (
    id              SERIAL PRIMARY KEY,
    tipo            VARCHAR(30) NOT NULL,
    referencia_id   INT,
    descripcion     TEXT,
    fecha           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alertas (
    id              SERIAL PRIMARY KEY,
    tipo            VARCHAR(30) NOT NULL,
    descripcion     TEXT,
    fecha           TIMESTAMP DEFAULT NOW()
);

-- =============================================================
-- DATOS DE PRUEBA
-- =============================================================

INSERT INTO duenos (nombre, telefono, email) VALUES
    ('María González Pérez',     '961-512-3401', 'maria.gonzalez@correo.mx'),
    ('Carlos Hernández Ruiz',    '961-512-3402', 'carlos.hernandez@correo.mx'),
    ('Lucía Martínez López',     '961-512-3403', 'lucia.martinez@correo.mx'),
    ('Diego Ramírez Solís',      '961-512-3404', 'diego.ramirez@correo.mx'),
    ('Ana Patricia Vázquez',     '961-512-3405', NULL),
    ('Roberto Cruz Domínguez',   '961-512-3406', 'roberto.cruz@correo.mx'),
    ('Valentina Ortiz Reyes',    '961-512-3407', 'valentina.ortiz@correo.mx');

INSERT INTO veterinarios (nombre, cedula, dias_descanso, activo) VALUES
    ('Dr. Fernando López Castro',    'VET-2018-001', 'lunes,jueves', TRUE),
    ('Dra. Sofía García Velasco',    'VET-2019-014', 'domingo',      TRUE),
    ('Dr. Andrés Méndez Bravo',      'VET-2021-027', '',             TRUE),
    ('Dra. Mónica Sánchez Aguilar',  'VET-2017-008', 'lunes',        FALSE);

INSERT INTO mascotas (nombre, especie, fecha_nacimiento, dueno_id) VALUES
    ('Firulais',  'perro',  '2019-03-15', 1),
    ('Misifú',    'gato',   '2020-07-22', 2),
    ('Rocky',     'perro',  '2018-11-08', 3),
    ('Luna',      'gato',   '2022-05-30', 4),
    ('Toby',      'perro',  '2017-02-14', 1),
    ('Pelusa',    'conejo', '2023-09-01', 5),
    ('Max',       'perro',  '2021-04-18', 6),
    ('Coco',      'gato',   '2024-08-12', 7),
    ('Dante',     'perro',  '2016-12-03', 2),
    ('Mango',     'gato',   '2023-01-20', 3);

INSERT INTO vet_atiende_mascota (vet_id, mascota_id, fecha_inicio_atencion) VALUES
    (1, 1,  '2024-01-15'),
    (1, 5,  '2024-03-20'),
    (1, 7,  '2025-02-10'),
    (2, 2,  '2024-02-08'),
    (2, 4,  '2024-06-12'),
    (2, 9,  '2024-09-01'),
    (3, 3,  '2024-04-22'),
    (3, 6,  '2024-11-05'),
    (3, 8,  '2025-01-18'),
    (3, 10, '2025-03-30');

INSERT INTO inventario_vacunas (nombre, stock_actual, stock_minimo, costo_unitario) VALUES
    ('Antirrábica canina',          25, 10, 350.00),
    ('Quíntuple felina',            18,  8, 480.00),
    ('Parvovirus canino',           12,  5, 290.00),
    ('Triple felina',                7,  8, 410.00),
    ('Bordetella canina',           20, 10, 270.00),
    ('Leucemia felina',              4,  5, 520.00);

INSERT INTO citas (mascota_id, veterinario_id, fecha_hora, motivo, costo, estado) VALUES
    (1, 1, '2025-09-15 10:00:00', 'Revisión general',         450.00, 'COMPLETADA'),
    (1, 2, '2025-11-20 11:00:00', 'Vacunación anual',         350.00, 'COMPLETADA'),
    (2, 2, '2025-10-05 09:30:00', 'Limpieza dental',          780.00, 'COMPLETADA'),
    (3, 1, '2025-08-10 16:00:00', 'Curación de herida',       620.00, 'COMPLETADA'),
    (4, 3, '2026-01-12 12:00:00', 'Esterilización',          1850.00, 'COMPLETADA'),
    (5, 1, '2025-06-22 10:30:00', 'Revisión cojera',          550.00, 'COMPLETADA'),
    (7, 2, '2026-02-08 14:00:00', 'Vacunación múltiple',      650.00, 'COMPLETADA'),
    (9, 3, '2026-03-01 11:30:00', 'Geriatría',                820.00, 'COMPLETADA'),
    (1, 1, '2026-04-25 10:00:00', 'Revisión seguimiento',     500.00, 'AGENDADA'),
    (4, 2, '2026-04-27 09:00:00', 'Control postoperatorio',   400.00, 'AGENDADA'),
    (3, 1, '2025-12-15 15:00:00', 'Revisión cancelada',       550.00, 'CANCELADA');

INSERT INTO vacunas_aplicadas
    (mascota_id, vacuna_id, veterinario_id, fecha_aplicacion, costo_cobrado) VALUES
    (1, 1, 1, '2024-09-15', 350.00),
    (1, 3, 1, '2025-09-15', 290.00),
    (2, 2, 2, '2024-08-22', 480.00),
    (2, 4, 2, '2025-08-22', 410.00),
    (3, 1, 1, '2024-04-10', 350.00),
    (3, 3, 1, '2024-10-10', 290.00),
    (4, 4, 3, '2026-01-12', 410.00),
    (7, 2, 2, '2026-02-08', 480.00),
    (9, 1, 3, '2024-12-01', 350.00);

DO $$
DECLARE
    v_duenos    INT;
    v_vets      INT;
    v_mascotas  INT;
    v_asign     INT;
    v_citas     INT;
    v_vacunas   INT;
BEGIN
    SELECT COUNT(*) INTO v_duenos   FROM duenos;
    SELECT COUNT(*) INTO v_vets     FROM veterinarios;
    SELECT COUNT(*) INTO v_mascotas FROM mascotas;
    SELECT COUNT(*) INTO v_asign    FROM vet_atiende_mascota;
    SELECT COUNT(*) INTO v_citas    FROM citas;
    SELECT COUNT(*) INTO v_vacunas  FROM vacunas_aplicadas;

    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Schema Corte 3 cargado correctamente.';
    RAISE NOTICE '  Dueños: %    Veterinarios: %', v_duenos, v_vets;
    RAISE NOTICE '  Mascotas: %  Asignaciones vet-mascota: %', v_mascotas, v_asign;
    RAISE NOTICE '  Citas: %     Vacunas aplicadas: %', v_citas, v_vacunas;
    RAISE NOTICE '=================================================';
END $$;
