-- Create enum for ticket status
CREATE TYPE ticket_status AS ENUM ('progress', 'closed', 'pending');

-- Create type_ticket table
CREATE TABLE type_ticket (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create problem_master table
CREATE TABLE problem_master (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create pic table
CREATE TABLE pic (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create trouble_ticket table
CREATE TABLE trouble_ticket (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(6) NOT NULL UNIQUE,
    ticket_type_id INTEGER NOT NULL REFERENCES type_ticket(id),
    date_down DATE NOT NULL,
    site_id VARCHAR(100) NOT NULL,
    sla_avg DECIMAL(5,2),
    pic_id INTEGER NOT NULL REFERENCES pic(id),
    plan_cm TEXT NOT NULL,
    action TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'progress',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trouble_ticket_status ON trouble_ticket(status);
CREATE INDEX idx_trouble_ticket_ticket_type_id ON trouble_ticket(ticket_type_id);
CREATE INDEX idx_trouble_ticket_site_id ON trouble_ticket(site_id);

-- Create trouble_ticket_problem junction table (many-to-many)
CREATE TABLE trouble_ticket_problem (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(6) NOT NULL REFERENCES trouble_ticket(ticket_number) ON DELETE CASCADE,
    problem_id INTEGER NOT NULL REFERENCES problem_master(id) ON DELETE CASCADE,
    CONSTRAINT unique_ticket_problem UNIQUE (ticket_number, problem_id)
);

CREATE INDEX idx_trouble_ticket_problem_ticket_number ON trouble_ticket_problem(ticket_number);

-- Create trouble_ticket_progress table
CREATE TABLE trouble_ticket_progress (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(6) NOT NULL REFERENCES trouble_ticket(ticket_number) ON DELETE CASCADE,
    date DATE NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trouble_ticket_progress_ticket_number ON trouble_ticket_progress(ticket_number);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_type_ticket_updated_at BEFORE UPDATE ON type_ticket
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problem_master_updated_at BEFORE UPDATE ON problem_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pic_updated_at BEFORE UPDATE ON pic
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trouble_ticket_updated_at BEFORE UPDATE ON trouble_ticket
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
