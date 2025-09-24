-- Create user_activity_logs table for comprehensive user tracking
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all logs
CREATE POLICY "Admins can view all user activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for admins to insert logs
CREATE POLICY "Admins can insert user activity logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for system to insert logs (for automated tracking)
CREATE POLICY "System can insert user activity logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance on queries
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_logs_action_type ON public.user_activity_logs(action_type);

-- Insert some sample data for testing
INSERT INTO public.user_activity_logs (user_id, user_email, user_name, action_type, action_description, metadata) VALUES
(gen_random_uuid(), 'user1@example.com', 'John Doe', 'LOGIN', 'User logged into the system', '{"browser": "Chrome", "location": "Dashboard"}'),
(gen_random_uuid(), 'user2@example.com', 'Jane Smith', 'DOCUMENT_UPLOAD', 'User uploaded a new document', '{"filename": "contract.pdf", "size": "2.5MB"}'),
(gen_random_uuid(), 'admin@example.com', 'Admin User', 'USER_ROLE_CHANGE', 'Changed user role from user to admin', '{"target_user": "user1@example.com", "old_role": "user", "new_role": "admin"}'),
(gen_random_uuid(), 'user1@example.com', 'John Doe', 'DOCUMENT_SIGN', 'User signed a document', '{"document_name": "Terms of Service", "signatures_count": 2}'),
(gen_random_uuid(), 'user2@example.com', 'Jane Smith', 'DOCUMENT_DOWNLOAD', 'User downloaded a document', '{"document_name": "contract.pdf", "download_method": "direct"}');