-- name: GetContactPerson :one
SELECT 
    cp.id, cp.location_id, cp.pic, cp.phone, cp.created_at, cp.updated_at,
    l.id as location_id_2, l.region, l.regency, l.cluster, l.created_at as location_created_at, l.updated_at as location_updated_at
FROM contact_person cp
JOIN location l ON l.id = cp.location_id
WHERE cp.id = $1 LIMIT 1;

-- name: ListContactPersons :many
SELECT 
    cp.id, cp.location_id, cp.pic, cp.phone, cp.created_at, cp.updated_at,
    l.id as location_id_2, l.region, l.regency, l.cluster, l.created_at as location_created_at, l.updated_at as location_updated_at
FROM contact_person cp
JOIN location l ON l.id = cp.location_id
WHERE ($1::int IS NULL OR $1 = 0 OR cp.location_id = $1)
ORDER BY cp.id
LIMIT $2
OFFSET $3;

-- name: CountContactPersons :one
SELECT COUNT(*) FROM contact_person
WHERE ($1::int IS NULL OR $1 = 0 OR location_id = $1);

-- name: CreateContactPerson :one
INSERT INTO contact_person (location_id, pic, phone)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateContactPerson :one
UPDATE contact_person
SET location_id = $2, pic = $3, phone = $4
WHERE id = $1
RETURNING *;

-- name: DeleteContactPerson :exec
DELETE FROM contact_person
WHERE id = $1;
