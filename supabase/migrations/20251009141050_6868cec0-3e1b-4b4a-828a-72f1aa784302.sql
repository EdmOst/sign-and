-- Update RLS policies to make data shared across all authenticated users

-- Invoice Customers: Allow all authenticated users to see all customers
DROP POLICY IF EXISTS "Users can view their own customers" ON invoice_customers;
DROP POLICY IF EXISTS "Users can create their own customers" ON invoice_customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON invoice_customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON invoice_customers;

CREATE POLICY "Authenticated users can view all customers"
ON invoice_customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create customers"
ON invoice_customers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update all customers"
ON invoice_customers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all customers"
ON invoice_customers FOR DELETE
TO authenticated
USING (true);

-- Invoice Products: Allow all authenticated users to see all products
DROP POLICY IF EXISTS "Users can view their own products" ON invoice_products;
DROP POLICY IF EXISTS "Users can create their own products" ON invoice_products;
DROP POLICY IF EXISTS "Users can update their own products" ON invoice_products;
DROP POLICY IF EXISTS "Users can delete their own products" ON invoice_products;

CREATE POLICY "Authenticated users can view all products"
ON invoice_products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create products"
ON invoice_products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update all products"
ON invoice_products FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all products"
ON invoice_products FOR DELETE
TO authenticated
USING (true);

-- Invoices: Allow all authenticated users to see all invoices
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;

CREATE POLICY "Authenticated users can view all invoices"
ON invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update all invoices"
ON invoices FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all invoices"
ON invoices FOR DELETE
TO authenticated
USING (true);

-- Invoice Items: Allow all authenticated users to see all invoice items
DROP POLICY IF EXISTS "Users can view items for their invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can create items for their invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can update items for their invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete items for their invoices" ON invoice_items;

CREATE POLICY "Authenticated users can view all invoice items"
ON invoice_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create invoice items"
ON invoice_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update all invoice items"
ON invoice_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all invoice items"
ON invoice_items FOR DELETE
TO authenticated
USING (true);

-- Invoice Company Settings: Allow all authenticated users to see and edit settings
DROP POLICY IF EXISTS "Users can view their own company settings" ON invoice_company_settings;
DROP POLICY IF EXISTS "Users can create their own company settings" ON invoice_company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON invoice_company_settings;

CREATE POLICY "Authenticated users can view company settings"
ON invoice_company_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create company settings"
ON invoice_company_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update company settings"
ON invoice_company_settings FOR UPDATE
TO authenticated
USING (true);

-- Invoice Email Templates: Allow all authenticated users to see all templates
DROP POLICY IF EXISTS "Users can view their own email templates" ON invoice_email_templates;
DROP POLICY IF EXISTS "Users can create their own email templates" ON invoice_email_templates;
DROP POLICY IF EXISTS "Users can update their own email templates" ON invoice_email_templates;
DROP POLICY IF EXISTS "Users can delete their own email templates" ON invoice_email_templates;

CREATE POLICY "Authenticated users can view all email templates"
ON invoice_email_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create email templates"
ON invoice_email_templates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update all email templates"
ON invoice_email_templates FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all email templates"
ON invoice_email_templates FOR DELETE
TO authenticated
USING (true);