-- Create backup configuration table
CREATE TABLE public.backup_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  include_metadata BOOLEAN NOT NULL DEFAULT true,
  email_notifications TEXT[],
  last_backup_at TIMESTAMP WITH TIME ZONE,
  next_backup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.backup_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage backup configs" 
ON public.backup_configs 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create backup logs table
CREATE TABLE public.backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_id TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'manual' CHECK (backup_type IN ('manual', 'scheduled')),
  document_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'in_progress')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for backup logs
CREATE POLICY "Admins can view backup logs" 
ON public.backup_logs 
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert backup logs" 
ON public.backup_logs 
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_backup_configs_updated_at
BEFORE UPDATE ON public.backup_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default backup configuration
INSERT INTO public.backup_configs (enabled, frequency, include_metadata, email_notifications)
VALUES (false, 'weekly', true, ARRAY[]::TEXT[]);