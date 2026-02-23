-- name: GetProblemMaster :one
SELECT * FROM problem_master
WHERE id = $1;

-- name: ListProblemMasters :many
SELECT * FROM problem_master
ORDER BY id ASC;

-- name: CreateProblemMaster :one
INSERT INTO problem_master (name)
VALUES ($1)
RETURNING *;

-- name: UpdateProblemMaster :one
UPDATE problem_master
SET name = $2
WHERE id = $1
RETURNING *;

-- name: DeleteProblemMaster :exec
DELETE FROM problem_master
WHERE id = $1;
