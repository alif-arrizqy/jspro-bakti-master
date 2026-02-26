-- name: GetTroubleTicketProgress :many
SELECT * FROM trouble_ticket_progress
WHERE ticket_number = $1
ORDER BY date ASC, created_at ASC;

-- name: CreateTroubleTicketProgress :one
INSERT INTO trouble_ticket_progress (ticket_number, date, action)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateTroubleTicketProgress :one
UPDATE trouble_ticket_progress
SET date = $1, action = $2
WHERE id = $3 AND ticket_number = $4
RETURNING *;

-- name: DeleteTroubleTicketProgress :exec
DELETE FROM trouble_ticket_progress
WHERE id = $1 AND ticket_number = $2;
