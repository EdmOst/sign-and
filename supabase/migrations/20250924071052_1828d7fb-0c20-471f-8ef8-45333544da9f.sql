-- Add tracking fields to documents table
ALTER TABLE public.documents 
ADD COLUMN signed_by_name TEXT,
ADD COLUMN signed_by_email TEXT,
ADD COLUMN last_previewed_by_name TEXT,
ADD COLUMN last_previewed_by_email TEXT,
ADD COLUMN last_previewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_downloaded_by_name TEXT,
ADD COLUMN last_downloaded_by_email TEXT,
ADD COLUMN last_downloaded_at TIMESTAMP WITH TIME ZONE;