-- name: GetTroubleTicketProgress :many
SELECT * FROM trouble_ticket_progress
WHERE ticket_number = $1
ORDER BY date ASC, created_at ASC;

-- name: CreateTroubleTicketProgress :one
INSERT INTO trouble_ticket_progress (ticket_number, date, action)
VALUES ($1, $2, $3)
RETURNING *;
