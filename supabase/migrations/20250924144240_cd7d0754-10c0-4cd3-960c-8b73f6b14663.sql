-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can update all documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can delete all documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can create documents" ON public.documents;

-- Create secure user-specific policies
CREATE POLICY "Users can view their own documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON public.documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add admin policies for administrative access
CREATE POLICY "Admins can view all documents" 
ON public.documents 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all documents" 
ON public.documents 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all documents" 
ON public.documents 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));