-- Drop triggers
DROP TRIGGER IF EXISTS update_tools_alker_item_updated_at ON tools_alker_item;
DROP TRIGGER IF EXISTS update_sparepart_stock_item_updated_at ON sparepart_stock_item;
DROP TRIGGER IF EXISTS update_contact_person_updated_at ON contact_person;
DROP TRIGGER IF EXISTS update_list_sparepart_updated_at ON list_sparepart;
DROP TRIGGER IF EXISTS update_location_updated_at ON location;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables
DROP TABLE IF EXISTS tools_alker_item;
DROP TABLE IF EXISTS sparepart_stock_item;
DROP TABLE IF EXISTS contact_person;
DROP TABLE IF EXISTS list_sparepart;
DROP TABLE IF EXISTS location;

-- Drop enum types
DROP TYPE IF EXISTS item_type;
DROP TYPE IF EXISTS stock_type;
DROP TYPE IF EXISTS region_type;
