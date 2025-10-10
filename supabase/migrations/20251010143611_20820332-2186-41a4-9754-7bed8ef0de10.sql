-- Add columns for customer signing functionality to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
ADD COLUMN IF NOT EXISTS customer_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_signed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_email text,
ADD COLUMN IF NOT EXISTS customer_signatures jsonb DEFAULT '[]'::jsonb;

-- Create index on share_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_share_token ON public.documents(share_token);

-- Function to generate secure random token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
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

-- RLS policy for public access to documents via share token (no auth required)
CREATE POLICY "Anyone can view documents with valid share token"
ON public.documents
FOR SELECT
USING (share_token IS NOT NULL);

-- RLS policy for public update of customer signatures via share token
CREATE POLICY "Anyone can update customer signatures with valid share token"
ON public.documents
FOR UPDATE
USING (share_token IS NOT NULL)
WITH CHECK (share_token IS NOT NULL);