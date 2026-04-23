# Clínica Veterinaria — Corte 3

Sistema full-stack con seguridad de base de datos como eje central.
Stack: PostgreSQL 16 · Redis 7 · FastAPI (Python) · React 18 + TypeScript.

---

## 1. ¿Qué política RLS aplicaste a la tabla `mascotas`?

```sql
CREATE POLICY pol_mascotas_veterinario
    ON mascotas FOR ALL TO rol_veterinario
    USING (
        id IN (
            SELECT mascota_id FROM vet_atiende_mascota
            WHERE vet_id = NULLIF(current_setting('app.current_vet_id', true), '')::INT
        )
    );
```

**En mis palabras:** cuando una conexión con rol `rol_veterinario` ejecuta cualquier operación sobre `mascotas`, PostgreSQL evalúa este filtro antes de retornar filas. Solo pasan las mascotas cuyo `id` aparece en `vet_atiende_mascota` con el `vet_id` igual al que la API guardó en la variable de sesión `app.current_vet_id`. Si esa variable no está configurada, `NULLIF(..., '')::INT` devuelve NULL y el IN nunca es verdadero, es decir el veterinario no ve nada, que es el comportamiento seguro por defecto.

La recepción tiene su propia política `USING (true)` que no filtra nada. El admin usa `BYPASSRLS` y no necesita política.

---

## 2. Vector de ataque en la estrategia de identificación del veterinario

El mecanismo `SET LOCAL app.current_vet_id = '1'` puede ser manipulado si alguien tiene acceso directo a la base de datos con el usuario `app_veterinario`. Podría ejecutar `SET app.current_vet_id = '2'` y ver las mascotas del veterinario 2 sin ser él.

**Cómo lo prevengo:**
1. El usuario `app_veterinario` no tiene acceso desde fuera del contenedor Docker (puerto 5432 no expuesto en producción).
2. El valor de `vet_id` viene firmado dentro del JWT — el token no se puede falsificar sin la clave secreta del servidor.
3. En la API uso `SET LOCAL` (no `SET`), que limita la variable a la transacción activa. Cuando la transacción termina, el valor se pierde. Así no puede "filtrarse" entre requests en el pool.

---

## 3. SECURITY DEFINER

No utilizo `SECURITY DEFINER` en ningún procedure. No fue necesario porque:
- El acceso a las tablas está controlado por GRANT/REVOKE por rol.
- RLS filtra lo que cada rol puede ver sin necesidad de elevar privilegios temporalmente.
- Usar `SECURITY DEFINER` agregaría el vector de `search_path` manipulation (un atacante podría crear funciones con el mismo nombre en un schema diferente y que el procedure las llamara en su lugar). Al evitarlo, eliminamos esa superficie de ataque.

---

## 4. TTL del caché Redis

Elegí **300 segundos (5 minutos)**.

**Por qué ese valor:** la consulta `v_mascotas_vacunacion_pendiente` tarda aproximadamente 100–300ms en esta base. En una clínica activa podría llamarse unas 50 veces por hora. Con TTL=300s, la BD solo recibe 12 consultas por hora en lugar de 50 — una reducción del 76% de carga. El dato de "vacunación pendiente" no cambia segundo a segundo, así que 5 minutos de stale data es clínicamente aceptable.

**Si fuera demasiado bajo (ej. 5s):** el caché casi no ayudaría. La mayoría de requests iría directo a PostgreSQL, negando el beneficio.

**Si fuera demasiado alto (ej. 1 hora):** si un veterinario vacuna a Firulais, el listado seguiría mostrándolo como pendiente durante 1 hora, causando confusión operativa.

**Invalidación activa:** cuando se llama al endpoint `POST /vacunas/aplicar`, el use case `AplicarVacuna` borra la key `vacunacion_pendiente` de Redis inmediatamente después del INSERT. La próxima consulta siempre verá datos frescos después de una vacunación.

---

## 5. Endpoint crítico y defensa contra SQL Injection

**Endpoint:** `GET /mascotas?q={termino}` — el campo de búsqueda es la superficie principal.

**Línea exacta que defiende:**
```python
# Archivo: api/src/infrastructure/db/repositories.py — método buscar(), ~línea 40
cur.execute(sql, (f"%{termino}%",))
```

**Qué protege y de qué:** psycopg2 separa el código SQL de los datos. El string `sql` contiene solo la estructura de la consulta con el placeholder `%s`. El valor `f"%{termino}%"` se pasa como segundo argumento en una tupla — psycopg2 lo escapa antes de enviarlo al servidor. Si `termino` contiene `' OR '1'='1`, psycopg2 lo convierte a `\' OR \'1\'=\'1` y PostgreSQL lo trata como un string literal, nunca como código SQL.

---

## 6. Si revoco todos los permisos del veterinario excepto SELECT en mascotas

Tres operaciones que se romperían:

1. **Agendar cita** (`POST /mascotas/citas`): el procedure `sp_agendar_cita` intenta hacer `INSERT INTO citas`. Sin `INSERT` en `citas`, lanza `ERROR: permission denied for table citas`.

2. **Aplicar vacuna** (`POST /vacunas/aplicar`): el INSERT en `vacunas_aplicadas` fallaría con `permission denied`. El trigger `trg_stock_vacuna` también fallaría al intentar `UPDATE inventario_vacunas`.

3. **Ver historial** (`SELECT` en `historial_movimientos`): sin ese GRANT, el veterinario no podría auditar las acciones registradas en el historial, perdiendo visibilidad de su propio historial de citas.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL 16 con RLS, roles, procedures, triggers, views |
| Caché | Redis 7 con TTL 300s e invalidación activa |
| API | FastAPI (Python) — Arquitectura Hexagonal |
| Frontend | React 18 + TypeScript — Patrón MVVM |
| Infraestructura | Docker Compose |

## Arrancar el sistema

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000
- Docs Swagger: http://localhost:8000/docs
