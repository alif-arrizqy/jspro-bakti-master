-- name: GetSparepartMaster :one
SELECT * FROM list_sparepart
WHERE id = $1 LIMIT 1;

-- name: ListSparepartMasters :many
SELECT * FROM list_sparepart
WHERE 
    ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR $2 = '' OR item_type::text = $2)
ORDER BY name ASC
LIMIT $3
OFFSET $4;

-- name: CountSparepartMasters :one
SELECT COUNT(*) FROM list_sparepart
WHERE 
    ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR $2 = '' OR item_type::text = $2);

-- name: CreateSparepartMaster :one
INSERT INTO list_sparepart (name, item_type)
VALUES ($1, $2)
RETURNING *;

-- name: UpdateSparepartMaster :one
UPDATE list_sparepart
SET name = $2, item_type = $3
WHERE id = $1
RETURNING *;

-- name: DeleteSparepartMaster :exec
DELETE FROM list_sparepart
WHERE id = $1;
