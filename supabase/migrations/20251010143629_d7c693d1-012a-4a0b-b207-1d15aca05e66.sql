-- Fix function search path security warning
DROP FUNCTION IF EXISTS public.generate_share_token();

CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token text;
  exists boolean;
BEGIN
  LOOP
    -- Generate a 32-character random token (hard to guess)
    token := encode(gen_random_bytes(24), 'base64');
    -- Remove URL-unsafe characters
    token := replace(replace(replace(token, '+', ''), '/', ''), '=', '');
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM public.documents WHERE share_token = token) INTO exists;
    
    IF NOT exists THEN
      RETURN token;
    END IF;
  END LOOP;
END;
$$;