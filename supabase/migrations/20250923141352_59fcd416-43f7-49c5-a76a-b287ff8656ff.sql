-- Update RLS policies to allow all authenticated users to access all documents
-- Drop existing user-specific policies
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- Create new policies that allow all authenticated users to access all documents
CREATE POLICY "Authenticated users can view all documents" 
ON public.documents 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update all documents" 
ON public.documents 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete all documents" 
ON public.documents 
FOR DELETE 
USING (auth.role() = 'authenticated');