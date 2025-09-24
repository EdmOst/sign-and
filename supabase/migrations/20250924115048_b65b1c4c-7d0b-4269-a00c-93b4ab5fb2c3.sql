-- Ensure the admin user has the correct role
INSERT INTO user_roles (user_id, role) 
VALUES ('8f597011-a7dd-459c-8c6c-0d68e0d882d1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;