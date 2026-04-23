-- =============================================================
-- CORTE 3 · Tabla de usuarios de aplicación
-- Almacena credenciales demo para el login del frontend.
-- En producción se usaría hashing de contraseñas (bcrypt, etc.).
-- =============================================================

CREATE TABLE IF NOT EXISTS usuarios_app (
    username    VARCHAR(50)  PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    rol         VARCHAR(20)  NOT NULL CHECK (rol IN ('veterinario', 'recepcion', 'admin')),
    vet_id      INT          REFERENCES veterinarios(id),
    password    VARCHAR(100) NOT NULL DEFAULT '1234',
    activo      BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO usuarios_app (username, nombre, rol, vet_id, password) VALUES
    ('lopez',     'Dr. Fernando López Castro',  'veterinario', 1, '1234'),
    ('garcia',    'Dra. Sofía García Velasco',  'veterinario', 2, '1234'),
    ('mendez',    'Dr. Andrés Méndez Bravo',    'veterinario', 3, '1234'),
    ('recepcion', 'Personal de Recepción',       'recepcion',   NULL, '1234'),
    ('admin',     'Administrador del Sistema',   'admin',       NULL, '1234')
ON CONFLICT (username) DO NOTHING;

-- Permisos: solo admin puede leer/escribir esta tabla
GRANT SELECT, INSERT, UPDATE ON usuarios_app TO rol_admin;
