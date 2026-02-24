-- name: GetTroubleTicketProblems :many
SELECT
    ttp.id,
    ttp.ticket_number,
    ttp.problem_id,
    pm.name AS problem_name
FROM trouble_ticket_problem ttp
JOIN problem_master pm ON ttp.problem_id = pm.id
WHERE ttp.ticket_number = $1
ORDER BY ttp.id ASC;

-- name: GetTroubleTicketProblemsByTicketNumbers :many
SELECT
    ttp.id,
    ttp.ticket_number,
    ttp.problem_id,
    pm.name AS problem_name
FROM trouble_ticket_problem ttp
JOIN problem_master pm ON ttp.problem_id = pm.id
WHERE ttp.ticket_number = ANY($1::text[])
ORDER BY ttp.ticket_number, ttp.id ASC;

-- name: CreateTroubleTicketProblem :one
INSERT INTO trouble_ticket_problem (ticket_number, problem_id)
VALUES ($1, $2)
RETURNING *;

-- name: DeleteTroubleTicketProblems :exec
DELETE FROM trouble_ticket_problem
WHERE ticket_number = $1;
