-- name: GetLocation :one
SELECT * FROM location
WHERE id = $1 LIMIT 1;

-- name: ListLocations :many
SELECT * FROM location
WHERE 
    ($1::text IS NULL OR $1 = '' OR UPPER(region::text) = UPPER($1::text))
    AND ($2::text IS NULL OR $2 = '' OR regency ILIKE '%' || $2 || '%')
    AND ($3::text IS NULL OR $3 = '' OR cluster ILIKE '%' || $3 || '%')
ORDER BY id
LIMIT $4
OFFSET $5;

-- name: CountLocations :one
SELECT COUNT(*) FROM location
WHERE 
    ($1::text IS NULL OR $1 = '' OR UPPER(region::text) = UPPER($1::text))
    AND ($2::text IS NULL OR $2 = '' OR regency ILIKE '%' || $2 || '%')
    AND ($3::text IS NULL OR $3 = '' OR cluster ILIKE '%' || $3 || '%');

-- name: CreateLocation :one
INSERT INTO location (region, regency, cluster)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateLocation :one
UPDATE location
SET region = $2, regency = $3, cluster = $4
WHERE id = $1
RETURNING *;

-- name: DeleteLocation :exec
DELETE FROM location
WHERE id = $1;
