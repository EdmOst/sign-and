-- Give admin rights to edmunds@amit.eu
INSERT INTO public.user_roles (user_id, role) 
VALUES ('9291f22c-8501-41a7-85e2-c37ef163516a', 'admin')
ON CONFLICT (user_id, role) 
DO UPDATE SET role = 'admin';