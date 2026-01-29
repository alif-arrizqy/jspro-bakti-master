-- name: GetSparepartStock :one
SELECT 
    ssi.id, ssi.location_id, ssi.sparepart_id, ssi.stock_type, ssi.quantity, ssi.documentation, ssi.notes, ssi.created_at, ssi.updated_at,
    l.id as location_id_2, l.region, l.regency, l.cluster, l.created_at as location_created_at, l.updated_at as location_updated_at,
    ls.id as sparepart_id_2, ls.name as sparepart_name, ls.item_type, ls.created_at as sparepart_created_at, ls.updated_at as sparepart_updated_at
FROM sparepart_stock_item ssi
JOIN location l ON l.id = ssi.location_id
JOIN list_sparepart ls ON ls.id = ssi.sparepart_id
WHERE ssi.id = $1 LIMIT 1;

-- name: ListSparepartStocks :many
SELECT 
    ssi.id, ssi.location_id, ssi.sparepart_id, ssi.stock_type, ssi.quantity, ssi.documentation, ssi.notes, ssi.created_at, ssi.updated_at,
    l.id as location_id_2, l.region, l.regency, l.cluster, l.created_at as location_created_at, l.updated_at as location_updated_at,
    ls.id as sparepart_id_2, ls.name as sparepart_name, ls.item_type, ls.created_at as sparepart_created_at, ls.updated_at as sparepart_updated_at
FROM sparepart_stock_item ssi
JOIN location l ON l.id = ssi.location_id
JOIN list_sparepart ls ON ls.id = ssi.sparepart_id
WHERE 
    ($1::text IS NULL OR $1 = '' OR UPPER(l.region::text) = UPPER($1::text))
    AND ($2::text IS NULL OR $2 = '' OR l.regency ILIKE '%' || $2 || '%')
    AND ($3::text IS NULL OR $3 = '' OR l.cluster ILIKE '%' || $3 || '%')
    AND ($4::text IS NULL OR $4 = '' OR ssi.stock_type::text = $4)
    AND (
        $5::text IS NULL OR $5 = '' OR 
        ssi.sparepart_id IN (
            SELECT id FROM list_sparepart 
            WHERE name ILIKE '%' || $5 || '%'
        )
    )
ORDER BY ssi.id
LIMIT $6
OFFSET $7;

-- name: CountSparepartStocks :one
SELECT COUNT(DISTINCT ssi.location_id)
FROM sparepart_stock_item ssi
JOIN location l ON l.id = ssi.location_id
JOIN list_sparepart ls ON ls.id = ssi.sparepart_id
WHERE 
    ($1::text IS NULL OR $1 = '' OR UPPER(l.region::text) = UPPER($1::text))
    AND ($2::text IS NULL OR $2 = '' OR l.regency ILIKE '%' || $2 || '%')
    AND ($3::text IS NULL OR $3 = '' OR l.cluster ILIKE '%' || $3 || '%')
    AND ($4::text IS NULL OR $4 = '' OR ssi.stock_type::text = $4)
    AND (
        $5::text IS NULL OR $5 = '' OR 
        ssi.sparepart_id IN (
            SELECT id FROM list_sparepart 
            WHERE name ILIKE '%' || $5 || '%'
        )
    );

-- name: CreateSparepartStock :one
INSERT INTO sparepart_stock_item (location_id, sparepart_id, stock_type, quantity, documentation, notes)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateSparepartStock :one
UPDATE sparepart_stock_item
SET quantity = $2, notes = $3
WHERE id = $1
RETURNING *;

-- name: UpdateSparepartStockDocumentation :one
UPDATE sparepart_stock_item
SET documentation = $2
WHERE id = $1
RETURNING *;

-- name: DeleteSparepartStock :exec
DELETE FROM sparepart_stock_item
WHERE id = $1;

-- name: ListSparepartStocksForExport :many
SELECT 
    ssi.*,
    l.id as location_id, l.region, l.regency, l.cluster,
    ls.id as sparepart_id, ls.name as sparepart_name, ls.item_type
FROM sparepart_stock_item ssi
JOIN location l ON l.id = ssi.location_id
JOIN list_sparepart ls ON ls.id = ssi.sparepart_id
WHERE 
    ($1::text IS NULL OR $1 = '' OR UPPER(l.region::text) = UPPER($1::text))
    AND ($2::text IS NULL OR $2 = '' OR l.regency ILIKE '%' || $2 || '%')
    AND ($3::text IS NULL OR $3 = '' OR l.cluster ILIKE '%' || $3 || '%')
    AND ($4::text IS NULL OR $4 = '' OR ssi.stock_type::text = $4)
    AND (
        $5::text IS NULL OR $5 = '' OR 
        ssi.sparepart_id IN (
            SELECT id FROM list_sparepart 
            WHERE name ILIKE '%' || $5 || '%'
        )
    )
ORDER BY l.region, l.regency, ls.name;
