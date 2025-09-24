-- Add missing profile for the second user
INSERT INTO public.profiles (user_id, email, display_name)
VALUES ('9291f22c-8501-41a7-85e2-c37ef163516a', 'edmunds@amit.eu', 'edmunds@amit.eu')
ON CONFLICT (user_id) DO NOTHING;

-- Ensure both users have admin roles
INSERT INTO public.user_roles (user_id, role)
VALUES ('9291f22c-8501-41a7-85e2-c37ef163516a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;