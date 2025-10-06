-- Add barcode settings to invoice_company_settings
ALTER TABLE invoice_company_settings
ADD COLUMN IF NOT EXISTS barcode_prefix text DEFAULT '*',
ADD COLUMN IF NOT EXISTS barcode_suffix text DEFAULT '*';