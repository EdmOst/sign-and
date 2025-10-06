-- Add person_id field for private customers
ALTER TABLE public.invoice_customers 
ADD COLUMN IF NOT EXISTS person_id text;

-- Add discount fields to invoice_items for line-item discounts
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- Add template customization fields to invoice_company_settings
ALTER TABLE public.invoice_company_settings
ADD COLUMN IF NOT EXISTS template_header_height numeric DEFAULT 120,
ADD COLUMN IF NOT EXISTS template_footer_height numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS template_margin_left numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS template_margin_right numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS template_margin_top numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS template_margin_bottom numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS template_show_logo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS template_logo_width numeric DEFAULT 150,
ADD COLUMN IF NOT EXISTS template_primary_color text DEFAULT '220, 26%, 14%',
ADD COLUMN IF NOT EXISTS template_secondary_color text DEFAULT '214, 31%, 91%';

-- Update generate_customer_number function to use simpler format (C1, C2, etc.)
CREATE OR REPLACE FUNCTION public.generate_customer_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_number TEXT;
BEGIN
  v_number := 'C' || nextval('customer_number_seq')::TEXT;
  RETURN v_number;
END;
$function$;

-- Add deleted_at field to track soft deletes
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;