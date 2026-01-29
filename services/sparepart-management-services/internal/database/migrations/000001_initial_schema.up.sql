-- Create enum types
CREATE TYPE region_type AS ENUM ('MALUKU', 'MALUKU_UTARA', 'PAPUA', 'PAPUA_BARAT', 'PAPUA_BARAT_DAYA', 'PAPUA_SELATAN');
CREATE TYPE stock_type AS ENUM ('NEW_STOCK', 'USED_STOCK');
CREATE TYPE item_type AS ENUM ('SPAREPART', 'TOOLS_ALKER');

-- Create location table
CREATE TABLE location (
    id SERIAL PRIMARY KEY,
    region region_type NOT NULL,
    regency VARCHAR(100) NOT NULL,
    cluster VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_location UNIQUE (region, regency, cluster)
);

CREATE INDEX idx_location_region ON location(region);
CREATE INDEX idx_location_regency ON location(regency);

-- Create list_sparepart table
CREATE TABLE list_sparepart (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    item_type item_type NOT NULL DEFAULT 'SPAREPART',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create contact_person table
CREATE TABLE contact_person (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES location(id) ON DELETE CASCADE,
    pic VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contact_person_location_id ON contact_person(location_id);
CREATE INDEX idx_contact_person_pic ON contact_person(pic);

-- Create sparepart_stock_item table
CREATE TABLE sparepart_stock_item (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES location(id) ON DELETE CASCADE,
    sparepart_id INTEGER NOT NULL REFERENCES list_sparepart(id) ON DELETE CASCADE,
    stock_type stock_type NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    documentation JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_sparepart_stock UNIQUE (location_id, sparepart_id, stock_type)
);

CREATE INDEX idx_sparepart_stock_location_id ON sparepart_stock_item(location_id);
CREATE INDEX idx_sparepart_stock_sparepart_id ON sparepart_stock_item(sparepart_id);
CREATE INDEX idx_sparepart_stock_stock_type ON sparepart_stock_item(stock_type);

-- Create tools_alker_item table
CREATE TABLE tools_alker_item (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES location(id) ON DELETE CASCADE,
    tools_id INTEGER NOT NULL REFERENCES list_sparepart(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    documentation JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tools_alker UNIQUE (location_id, tools_id)
);

CREATE INDEX idx_tools_alker_location_id ON tools_alker_item(location_id);
CREATE INDEX idx_tools_alker_tools_id ON tools_alker_item(tools_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_location_updated_at BEFORE UPDATE ON location
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_list_sparepart_updated_at BEFORE UPDATE ON list_sparepart
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_person_updated_at BEFORE UPDATE ON contact_person
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sparepart_stock_item_updated_at BEFORE UPDATE ON sparepart_stock_item
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tools_alker_item_updated_at BEFORE UPDATE ON tools_alker_item
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
