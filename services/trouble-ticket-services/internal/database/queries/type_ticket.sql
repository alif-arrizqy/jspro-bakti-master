-- name: GetTypeTicket :one
SELECT * FROM type_ticket
WHERE id = $1;

-- name: ListTypeTickets :many
SELECT * FROM type_ticket
ORDER BY id ASC;

-- name: CreateTypeTicket :one
INSERT INTO type_ticket (name)
VALUES ($1)
RETURNING *;

-- name: UpdateTypeTicket :one
UPDATE type_ticket
SET name = $2
WHERE id = $1
RETURNING *;

-- name: DeleteTypeTicket :exec
DELETE FROM type_ticket
WHERE id = $1;
