-- Fix search path for generate_customer_number function
DROP FUNCTION IF EXISTS generate_customer_number();

CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number TEXT;
BEGIN
  v_number := 'CUST-' || LPAD(nextval('customer_number_seq')::TEXT, 6, '0');
  RETURN v_number;
END;
$$;