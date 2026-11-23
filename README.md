# Tarea U2 · Caso 7 Veterinaria · PostgreSQL + MongoDB

**Estudiante:** José Villa · **Caso:** 7 · Veterinaria · [Video de sustentación](https://drive.google.com/file/d/1vN2-40DsPz_SI3ChwxEqr2ErIWJA84wm/view?usp=sharing)

API REST en Express que combina **PostgreSQL (Prisma 7)** y **MongoDB (Mongoose 9)**.
Parte del proyecto de clase [`espe-expressjs`](https://github.com/paulosk8/espe-expressjs) (Express, Prisma y login con JWT).

| Caso 7 | Base | Código |
|---|---|---|
| Consulta (mascota, fecha) | PostgreSQL | `prisma/schema.prisma` → `Consultation` |
| Tratamiento (dosis por especie[]) | MongoDB · catálogo | `src/models/treatment.js` |
| Nota de seguimiento | MongoDB · registro que crece | `src/models/followUpNote.js` |

El modelado (workload, decisión de base, embeber/referenciar, ERD, referencias, dato copiado) está en
[`docs/Tarea_modelo_hibrido.md`](docs/Tarea_modelo_hibrido.md).

## Puesta en marcha

```bash
docker compose up -d          # vet-postgres :5435 · vet-pgadmin :5052 · vet-mongo :27018
cp .env.example .env          # y cambie JWT_SECRET
npm install
npx prisma migrate dev        # crea User, Consultation (+ tablas de la Unidad 1)
npm run seed:vet              # opcional: datos de demostración (demo@vet.test / Demo123*)
npm run dev                   # arranca solo si PostgreSQL y MongoDB conectan
```

Los contenedores usan nombres y puertos propios (`vet-*`) para no chocar con los `espe-*` del proyecto de clase.
Conexión de Compass: `mongodb://espe_user:espe_password@localhost:27018/?authSource=admin`.
pgAdmin: http://localhost:5052 (admin@espe.com / admin_password). El servidor **vet-postgres (Tarea U2)** ya viene
registrado (`docker/pgadmin/servers.json`); al abrirlo pide la contraseña `espe_password`. Desde fuera de Docker
(DBeaver, psql) la conexión es `localhost:5435`, base `vet_db`.

## Estructura (capas)

```
src/
  db/prisma.js  db/mongo.js           una conexión por base
  models/        treatment.js, followUpNote.js       (Mongoose)
  services/      treatmentService, consultationService, followUpNoteService  ← reglas e integración
  controllers/   treatment/consultation/followUpNoteController               ← HTTP
  routes/        treatments.js, consultations.js, notes.js
  utils/         httpError.js (400/404/409…), constants.js
```

## Endpoints

| Método y ruta | Qué demuestra |
|---|---|
| `GET /api/treatments?q=&species=&category=&fields=&sort=` | regex, proyección y orden |
| `GET /api/treatments/:id` | 400 (ObjectId inválido) / 404 |
| `POST /api/treatments` 🔒 | 201 / 400 (mensajes en español) / 409 (código único) |
| `PUT /api/treatments/:id` 🔒 | `findById` + `save()` |
| `DELETE /api/treatments/:id` 🔒 | **409** si una consulta lo usa; si no, borra sus notas en cascada |
| `GET /api/treatments/:id/stats` | `aggregate` (conteo y peso promedio por estado) |
| `POST /api/consultations` 🔒 | crea en PostgreSQL validando MongoDB (`isValidObjectId` + `exists` + dosis de la especie) |
| `GET /api/consultations` 🔒 | consulta unida con `$in` + `Map` (sin N+1) |
| `GET /api/consultations/:id` 🔒 · `PATCH /:id/treatment` 🔒 · `DELETE /:id` 🔒 | dueño o 403 |
| `POST /api/notes` 🔒 | crea en MongoDB validando PostgreSQL (404/403), copia `petName`/`species`, `userId` del JWT, 409 por índice único |
| `GET /api/notes?consultationId=&treatment=&status=&sort=` 🔒 | `populate` + orden |

🔒 = requiere `Authorization: Bearer <token>` de `POST /api/auth/login`.

## Pruebas

Colección: [`postman/TareaU2_Villa.postman_collection.json`](postman/TareaU2_Villa.postman_collection.json)
(35 peticiones, 55 aserciones). Crea sus propios datos con un sufijo aleatorio y los borra al final, así que
se puede correr varias veces seguidas. Desde consola: `npm run test:postman`. Salida de una corrida: `docs/newman_run.txt`.

## Evidencia

- **Video de sustentación:** https://drive.google.com/file/d/1vN2-40DsPz_SI3ChwxEqr2ErIWJA84wm/view?usp=sharing
  (workload y decisión de base · `POST /api/notes` en el código y en Postman · qué pasa si una base falla a la mitad).
- `docs/postman_run.png` y `docs/postman_run_order.png`: Run collection en Postman (55 de 55 aserciones).
- `docs/compass_colecciones.png`, `docs/compass_followupnotes.png` y `docs/compass_indices.png`: colecciones
  `treatments`, `followupnotes` y sus índices (`consultationId_1_noteDay_1` único).
- `docs/pgadmin_treatmentId.png`: tabla `Consultation` con la columna `treatmentId` (el `_id` de MongoDB).
- Versión entregada: etiqueta `u2-tarea`.
