-- Add code and barcode fields to products
ALTER TABLE public.invoice_products
ADD COLUMN product_code TEXT,
ADD COLUMN barcode TEXT;

-- Create email templates table
CREATE TABLE public.invoice_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoice_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email templates"
ON public.invoice_email_templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email templates"
ON public.invoice_email_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email templates"
ON public.invoice_email_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email templates"
ON public.invoice_email_templates
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all email templates"
ON public.invoice_email_templates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update invoice_company_settings to add email template preferences
ALTER TABLE public.invoice_company_settings
ADD COLUMN show_product_codes BOOLEAN DEFAULT false,
ADD COLUMN show_barcodes BOOLEAN DEFAULT false;

-- Update documents table RLS policies to allow all authenticated users to see all documents
-- First drop the existing user-specific policies
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- Create new policies allowing all authenticated users to access documents
CREATE POLICY "Authenticated users can view all documents"
ON public.documents
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create documents"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update documents"
ON public.documents
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete documents"
ON public.documents
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Keep admin policies
-- Admins already have full access through existing policies

-- Create trigger for email_templates updated_at
CREATE TRIGGER update_invoice_email_templates_updated_at
BEFORE UPDATE ON public.invoice_email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();