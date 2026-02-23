-- name: GetTroubleTicket :one
SELECT
    tt.id,
    tt.ticket_number,
    tt.ticket_type_id,
    ttype.name AS ticket_type_name,
    tt.date_down,
    tt.site_id,
    tt.sla_avg,
    tt.pic_id,
    p.name AS pic_name,
    tt.plan_cm,
    tt.action,
    tt.status,
    tt.created_at,
    tt.updated_at
FROM trouble_ticket tt
JOIN type_ticket ttype ON tt.ticket_type_id = ttype.id
JOIN pic p ON tt.pic_id = p.id
WHERE tt.ticket_number = $1;

-- name: ListTroubleTickets :many
SELECT
    tt.id,
    tt.ticket_number,
    tt.ticket_type_id,
    ttype.name AS ticket_type_name,
    tt.date_down,
    tt.site_id,
    tt.sla_avg,
    tt.pic_id,
    p.name AS pic_name,
    tt.plan_cm,
    tt.action,
    tt.status,
    tt.created_at,
    tt.updated_at
FROM trouble_ticket tt
JOIN type_ticket ttype ON tt.ticket_type_id = ttype.id
JOIN pic p ON tt.pic_id = p.id
WHERE
    ($1::text = '' OR tt.status::text = $1)
    AND ($2::integer = 0 OR tt.ticket_type_id = $2)
ORDER BY tt.created_at DESC;

-- name: GetAllTroubleTickets :many
SELECT
    tt.id,
    tt.ticket_number,
    tt.ticket_type_id,
    ttype.name AS ticket_type_name,
    tt.date_down,
    tt.site_id,
    tt.sla_avg,
    tt.pic_id,
    p.name AS pic_name,
    tt.plan_cm,
    tt.action,
    tt.status,
    tt.created_at,
    tt.updated_at
FROM trouble_ticket tt
JOIN type_ticket ttype ON tt.ticket_type_id = ttype.id
JOIN pic p ON tt.pic_id = p.id
ORDER BY tt.created_at DESC;

-- name: CheckTicketNumberExists :one
SELECT EXISTS(SELECT 1 FROM trouble_ticket WHERE ticket_number = $1);

-- name: CreateTroubleTicket :one
INSERT INTO trouble_ticket (ticket_number, ticket_type_id, date_down, site_id, sla_avg, pic_id, plan_cm, action, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'progress')
RETURNING *;

-- name: CloseTroubleTicket :one
UPDATE trouble_ticket
SET status = 'closed', updated_at = NOW()
WHERE ticket_number = $1
RETURNING *;

-- name: UpdateTroubleTicketSlaAvg :exec
UPDATE trouble_ticket
SET sla_avg = $2, updated_at = NOW()
WHERE ticket_number = $1;
