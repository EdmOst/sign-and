-- Drop the old function
DROP FUNCTION IF EXISTS public.generate_invoice_number(UUID);

-- Create improved function to generate invoice numbers that avoids duplicates
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_number TEXT;
  v_count INTEGER;
  v_max_attempts INTEGER := 100;
  v_attempt INTEGER := 0;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Find the highest existing invoice number for this user and year
  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(invoice_number, 'INV-' || v_year || '-', '')
        AS INTEGER
      )
    ),
    0
  ) + 1
  INTO v_count
  FROM public.invoices
  WHERE user_id = p_user_id
  AND invoice_number ~ ('^INV-' || v_year || '-[0-9]+$');
  
  -- Try to generate a unique invoice number
  WHILE v_attempt < v_max_attempts LOOP
    v_number := 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
    
    -- Check if this number already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE user_id = p_user_id 
      AND invoice_number = v_number
    ) THEN
      RETURN v_number;
    END IF;
    
    -- Increment and try again
    v_count := v_count + 1;
    v_attempt := v_attempt + 1;
  END LOOP;
  
  -- If we couldn't find a unique number after max attempts, raise an error
  RAISE EXCEPTION 'Could not generate unique invoice number after % attempts', v_max_attempts;
END;
$$;