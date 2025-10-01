-- Create invoice customers table
CREATE TABLE public.invoice_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  vat_number TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice products table
CREATE TABLE public.invoice_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_price DECIMAL(10,2) NOT NULL,
  default_vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice company settings table
CREATE TABLE public.invoice_company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  address TEXT NOT NULL,
  vat_number TEXT,
  iban TEXT,
  bic TEXT,
  logo_url TEXT,
  payment_terms TEXT DEFAULT 'Payment due within 30 days',
  legal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.invoice_customers(id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
  custom_text TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_vat DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, invoice_number)
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.invoice_products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  line_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.invoice_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_customers
CREATE POLICY "Users can view their own customers"
  ON public.invoice_customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own customers"
  ON public.invoice_customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
  ON public.invoice_customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
  ON public.invoice_customers FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all customers"
  ON public.invoice_customers FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for invoice_products
CREATE POLICY "Users can view their own products"
  ON public.invoice_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products"
  ON public.invoice_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON public.invoice_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON public.invoice_products FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all products"
  ON public.invoice_products FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for invoice_company_settings
CREATE POLICY "Users can view their own company settings"
  ON public.invoice_company_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company settings"
  ON public.invoice_company_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings"
  ON public.invoice_company_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all company settings"
  ON public.invoice_company_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for invoices
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices"
  ON public.invoices FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all invoices"
  ON public.invoices FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all invoices"
  ON public.invoices FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for invoice_items
CREATE POLICY "Users can view items for their invoices"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items for their invoices"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items for their invoices"
  ON public.invoice_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items for their invoices"
  ON public.invoice_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all invoice items"
  ON public.invoice_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_invoice_customers_updated_at
  BEFORE UPDATE ON public.invoice_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_products_updated_at
  BEFORE UPDATE ON public.invoice_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_company_settings_updated_at
  BEFORE UPDATE ON public.invoice_company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.invoices
  WHERE user_id = p_user_id
  AND invoice_number LIKE 'INV-' || v_year || '-%';
  
  v_number := 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  
  RETURN v_number;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_invoice_customers_user_id ON public.invoice_customers(user_id);
CREATE INDEX idx_invoice_products_user_id ON public.invoice_products(user_id);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);