-- name: GetToolsAlker :one
SELECT 
    tai.id, tai.location_id, tai.tools_id, tai.quantity, tai.documentation, tai.notes, tai.created_at, tai.updated_at,
    l.id as location_id_2, l.region, l.regency, l.cluster, l.created_at as location_created_at, l.updated_at as location_updated_at,
    ls.id as tools_id_2, ls.name as tools_name, ls.item_type, ls.created_at as tools_created_at, ls.updated_at as tools_updated_at
FROM tools_alker_item tai
JOIN location l ON l.id = tai.location_id
JOIN list_sparepart ls ON ls.id = tai.tools_id
WHERE tai.id = $1 LIMIT 1;

-- name: ListToolsAlkers :many
SELECT 
    tai.id, tai.location_id, tai.tools_id, tai.quantity, tai.documentation, tai.notes, tai.created_at, tai.updated_at,
    l.id as location_id_2, l.region, l.regency, l.cluster, l.created_at as location_created_at, l.updated_at as location_updated_at,
    ls.id as tools_id_2, ls.name as tools_name, ls.item_type, ls.created_at as tools_created_at, ls.updated_at as tools_updated_at
FROM tools_alker_item tai
JOIN location l ON l.id = tai.location_id
JOIN list_sparepart ls ON ls.id = tai.tools_id
WHERE 
    ($1::text IS NULL OR $1 = '' OR UPPER(l.region::text) = UPPER($1::text))
    AND ($2::text IS NULL OR $2 = '' OR l.regency ILIKE '%' || $2 || '%')
    AND ($3::text IS NULL OR $3 = '' OR l.cluster ILIKE '%' || $3 || '%')
    AND (
        $4::text IS NULL OR $4 = '' OR 
        tai.tools_id IN (
            SELECT id FROM list_sparepart 
            WHERE name ILIKE '%' || $4 || '%'
        )
    )
ORDER BY tai.id
LIMIT $5
OFFSET $6;

-- name: CountToolsAlkers :one
SELECT COUNT(DISTINCT tai.location_id)
FROM tools_alker_item tai
JOIN location l ON l.id = tai.location_id
JOIN list_sparepart ls ON ls.id = tai.tools_id
WHERE 
    ($1::text IS NULL OR $1 = '' OR UPPER(l.region::text) = UPPER($1::text))
    AND ($2::text IS NULL OR $2 = '' OR l.regency ILIKE '%' || $2 || '%')
    AND ($3::text IS NULL OR $3 = '' OR l.cluster ILIKE '%' || $3 || '%')
    AND (
        $4::text IS NULL OR $4 = '' OR 
        tai.tools_id IN (
            SELECT id FROM list_sparepart 
            WHERE name ILIKE '%' || $4 || '%'
        )
    );

-- name: CreateToolsAlker :one
INSERT INTO tools_alker_item (location_id, tools_id, quantity, documentation, notes)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateToolsAlker :one
UPDATE tools_alker_item
SET quantity = $2, notes = $3
WHERE id = $1
RETURNING *;

-- name: UpdateToolsAlkerDocumentation :one
UPDATE tools_alker_item
SET documentation = $2
WHERE id = $1
RETURNING *;

-- name: DeleteToolsAlker :exec
DELETE FROM tools_alker_item
WHERE id = $1;

-- name: ListToolsAlkersForExport :many
SELECT 
    tai.*,
    l.id as location_id, l.region, l.regency, l.cluster,
    ls.id as tools_id, ls.name as tools_name, ls.item_type
FROM tools_alker_item tai
JOIN location l ON l.id = tai.location_id
JOIN list_sparepart ls ON ls.id = tai.tools_id
WHERE 
    ($1::text IS NULL OR $1 = '' OR UPPER(l.region::text) = UPPER($1::text))
    AND ($2::text IS NULL OR $2 = '' OR l.regency ILIKE '%' || $2 || '%')
    AND ($3::text IS NULL OR $3 = '' OR l.cluster ILIKE '%' || $3 || '%')
    AND (
        $4::text IS NULL OR $4 = '' OR 
        tai.tools_id IN (
            SELECT id FROM list_sparepart 
            WHERE name ILIKE '%' || $4 || '%'
        )
    )
ORDER BY l.region, l.regency, ls.name;
