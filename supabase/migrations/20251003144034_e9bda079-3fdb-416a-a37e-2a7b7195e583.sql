-- Add customer_number and customer_group to invoice_customers
ALTER TABLE public.invoice_customers 
ADD COLUMN customer_number TEXT UNIQUE,
ADD COLUMN customer_group TEXT CHECK (customer_group IN ('private', 'company')) DEFAULT 'private';

-- Create a sequence for customer numbers
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1;

-- Function to generate customer number
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_number TEXT;
BEGIN
  v_number := 'CUST-' || LPAD(nextval('customer_number_seq')::TEXT, 6, '0');
  RETURN v_number;
END;
$$;

-- Add discount fields to invoices
ALTER TABLE public.invoices
ADD COLUMN discount_percentage NUMERIC DEFAULT 0,
ADD COLUMN discount_amount NUMERIC DEFAULT 0,
ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;

-- Add SMTP settings to invoice_company_settings
ALTER TABLE public.invoice_company_settings
ADD COLUMN smtp_host TEXT,
ADD COLUMN smtp_port INTEGER,
ADD COLUMN smtp_username TEXT,
ADD COLUMN smtp_password TEXT,
ADD COLUMN smtp_from_email TEXT,
ADD COLUMN smtp_from_name TEXT,
ADD COLUMN issuer_first_name TEXT,
ADD COLUMN issuer_last_name TEXT,
ADD COLUMN issuer_role TEXT,
ADD COLUMN issuer_email TEXT,
ADD COLUMN issuer_phone TEXT;

-- Update existing customers to have customer numbers
DO $$
DECLARE
  customer_rec RECORD;
BEGIN
  FOR customer_rec IN 
    SELECT id FROM public.invoice_customers WHERE customer_number IS NULL
  LOOP
    UPDATE public.invoice_customers 
    SET customer_number = generate_customer_number()
    WHERE id = customer_rec.id;
  END LOOP;
END $$;