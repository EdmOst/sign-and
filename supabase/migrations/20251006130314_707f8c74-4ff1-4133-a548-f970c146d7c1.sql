-- Add invoice module and license settings to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS invoice_module_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS license_key text,
ADD COLUMN IF NOT EXISTS license_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS license_status text DEFAULT 'active';

-- Create a function to check license validity
CREATE OR REPLACE FUNCTION public.check_license_valid()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at timestamp with time zone;
  v_status text;
BEGIN
  SELECT license_expires_at, license_status
  INTO v_expires_at, v_status
  FROM public.company_settings
  LIMIT 1;
  
  -- If no license info exists, return true (grace period)
  IF v_expires_at IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if license is active and not expired
  RETURN v_status = 'active' AND v_expires_at > now();
END;
$$;