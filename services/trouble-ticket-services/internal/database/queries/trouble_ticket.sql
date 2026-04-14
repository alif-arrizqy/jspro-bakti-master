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

-- name: CountTroubleTickets :one
SELECT COUNT(*) FROM trouble_ticket tt
WHERE
    ($1::text = '' OR tt.status::text = $1)
    AND ($2::integer = 0 OR tt.ticket_type_id = $2)
    AND (
        ($3::text = '' AND cardinality($4::text[]) = 0)
        OR ($3::text != '' AND (
            tt.site_id ILIKE '%' || $3 || '%'
            OR tt.ticket_number ILIKE '%' || $3 || '%'
        ))
        OR tt.site_id = ANY($4::text[])
    )
    AND ($5::integer = 0 OR tt.pic_id = $5);

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
    AND (
        ($3::text = '' AND cardinality($6::text[]) = 0)
        OR ($3::text != '' AND (
            tt.site_id ILIKE '%' || $3 || '%'
            OR tt.ticket_number ILIKE '%' || $3 || '%'
        ))
        OR tt.site_id = ANY($6::text[])
    )
    AND ($7::integer = 0 OR tt.pic_id = $7)
ORDER BY tt.created_at DESC
LIMIT $4 OFFSET $5;

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
