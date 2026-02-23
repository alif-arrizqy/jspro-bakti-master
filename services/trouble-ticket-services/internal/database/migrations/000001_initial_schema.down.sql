-- Drop triggers
DROP TRIGGER IF EXISTS update_trouble_ticket_updated_at ON trouble_ticket;
DROP TRIGGER IF EXISTS update_pic_updated_at ON pic;
DROP TRIGGER IF EXISTS update_problem_master_updated_at ON problem_master;
DROP TRIGGER IF EXISTS update_type_ticket_updated_at ON type_ticket;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (cascade handles FK dependencies)
DROP TABLE IF EXISTS trouble_ticket_progress CASCADE;
DROP TABLE IF EXISTS trouble_ticket_problem CASCADE;
DROP TABLE IF EXISTS trouble_ticket CASCADE;
DROP TABLE IF EXISTS pic CASCADE;
DROP TABLE IF EXISTS problem_master CASCADE;
DROP TABLE IF EXISTS type_ticket CASCADE;

-- Drop enum
DROP TYPE IF EXISTS ticket_status;
