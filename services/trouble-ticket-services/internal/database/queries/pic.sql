-- name: GetPic :one
SELECT * FROM pic
WHERE id = $1;

-- name: ListPics :many
SELECT * FROM pic
ORDER BY id ASC;

-- name: CreatePic :one
INSERT INTO pic (name)
VALUES ($1)
RETURNING *;

-- name: UpdatePic :one
UPDATE pic
SET name = $2
WHERE id = $1
RETURNING *;

-- name: DeletePic :exec
DELETE FROM pic
WHERE id = $1;
