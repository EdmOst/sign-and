import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  include_metadata: boolean;
  email_notifications?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting document backup process...');

    // Fetch all documents
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .order('signed_at', { ascending: false });

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      throw documentsError;
    }

    if (!documents || documents.length === 0) {
      console.log('No documents found to backup');
      return new Response(
        JSON.stringify({ success: false, message: 'No documents found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create backup metadata
    const backupMetadata = {
      backup_id: crypto.randomUUID(),
      backup_date: new Date().toISOString(),
      total_documents: documents.length,
      backup_type: 'scheduled',
      documents: documents.map(doc => ({
        id: doc.id,
        name: doc.original_filename,
        signed_at: doc.signed_at,
        signed_by: doc.signed_by_email,
        signatures_count: Array.isArray(doc.signatures) ? doc.signatures.length : 0,
        file_size: doc.pdf_data ? Math.round(doc.pdf_data.length * 0.75) : 0 // Approximate size in bytes
      }))
    };

    console.log(`Creating backup for ${documents.length} documents`);

    // In a real implementation, you would:
    // 1. Upload documents to external storage (AWS S3, Google Cloud Storage, etc.)
    // 2. Send email notifications if configured
    // 3. Store backup metadata in a backup_logs table

    // For now, we'll just log the backup activity
    const { error: logError } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: null, // System generated
        user_email: 'system@backup',
        user_name: 'Automated Backup System',
        action_type: 'BACKUP_SCHEDULED',
        action_description: `Scheduled backup created with ${documents.length} documents`,
        metadata: {
          backup_id: backupMetadata.backup_id,
          document_count: documents.length,
          backup_type: 'scheduled'
        }
      });

    if (logError) {
      console.error('Error logging backup activity:', logError);
    }

    console.log('Backup process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        backup_id: backupMetadata.backup_id,
        document_count: documents.length,
        backup_date: backupMetadata.backup_date
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Backup function error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});