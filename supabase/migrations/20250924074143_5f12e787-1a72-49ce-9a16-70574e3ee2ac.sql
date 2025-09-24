-- Add some default data for existing documents for testing
UPDATE documents 
SET 
  signed_by_name = 'Test User',
  signed_by_email = 'test@example.com',
  last_previewed_by_name = 'John Doe', 
  last_previewed_by_email = 'john@example.com',
  last_previewed_at = NOW() - INTERVAL '2 hours',
  last_downloaded_by_name = 'Jane Smith',
  last_downloaded_by_email = 'jane@example.com', 
  last_downloaded_at = NOW() - INTERVAL '1 hour'
WHERE signed_by_name IS NULL;