-- Copia los inscritos al evento (presenciales y en linea) de PRODUCCION (glointv2) a STAGING (glointv2_copia).
-- Presenciales y en linea viven en la MISMA tabla: event_attendees (columna attendance_mode: 'in_person' | 'virtual').
--
-- Solo LEE de glointv2 y ESCRIBE en glointv2_copia. Corre cada bloque a mano, en orden, con un usuario que
-- tenga SELECT en glointv2 y escritura en glointv2_copia.
-- Si el paso 3 falla con "Unknown column", esa columna aun no existe en una de las dos bases: quitala de las
-- DOS listas (INSERT y SELECT) y vuelve a correrlo.

-- 0) Revisa cuantos hay en cada lado antes de tocar nada
SELECT 'produccion' AS base, attendance_mode, status, COUNT(*) AS total FROM glointv2.event_attendees GROUP BY attendance_mode, status;
SELECT 'staging'    AS base, attendance_mode, status, COUNT(*) AS total FROM glointv2_copia.event_attendees GROUP BY attendance_mode, status;

-- 1) Respaldo de lo que hay hoy en staging
DROP TABLE IF EXISTS glointv2_copia.event_attendees_respaldo;
CREATE TABLE glointv2_copia.event_attendees_respaldo AS SELECT * FROM glointv2_copia.event_attendees;

-- 2) Vacia los inscritos de staging.
--    OJO: por las llaves foraneas con ON DELETE CASCADE tambien se borran en staging las respuestas de encuestas,
--    los participantes/rondas de la dinamica y la rifa. Es lo esperado para probar con datos reales desde cero.
DELETE FROM glointv2_copia.event_attendees;

-- 3) Copia (el evento se enlaza al evento que ya existe en staging; el usuario solo se conserva si existe en staging)
INSERT INTO glointv2_copia.event_attendees
  (event_id, user_id, attendee_type, full_name, email, phone, document_id, city, is_company, company_name, company_nit,
   job_title, interests, attendance_mode, has_companion, companion_name, seats_reserved, status, access_token,
   attendance_confirmed_at, attendance_email_sent_at, live_invite_sent_at, access_qr_sent_at, checked_in_at,
   checked_in_by, chat_muted, created_at, updated_at)
SELECT
   (SELECT MIN(id) FROM glointv2_copia.events),
   (SELECT u.id FROM glointv2_copia.users u WHERE u.id = a.user_id),
   a.attendee_type, a.full_name, a.email, a.phone, a.document_id, a.city, a.is_company, a.company_name, a.company_nit,
   a.job_title, a.interests, a.attendance_mode, a.has_companion, a.companion_name, a.seats_reserved, a.status, a.access_token,
   a.attendance_confirmed_at, a.attendance_email_sent_at, a.live_invite_sent_at, a.access_qr_sent_at, a.checked_in_at,
   NULL, a.chat_muted, a.created_at, a.updated_at
FROM glointv2.event_attendees a;

-- 4) Verifica: deben coincidir con el paso 0 de produccion
SELECT attendance_mode, status, COUNT(*) AS total FROM glointv2_copia.event_attendees GROUP BY attendance_mode, status;

-- Para deshacer en staging:
--   DELETE FROM glointv2_copia.event_attendees;
--   INSERT INTO glointv2_copia.event_attendees SELECT * FROM glointv2_copia.event_attendees_respaldo;
