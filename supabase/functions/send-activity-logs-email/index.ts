import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivityLog {
  id: string;
  created_at: string;
  user_name: string;
  user_email: string;
  action_type: string;
  action_description: string;
  metadata: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch activity logs from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: logs, error: logsError } = await supabase
      .from("user_activity_logs")
      .select("*")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (logsError) {
      console.error("Error fetching logs:", logsError);
      throw logsError;
    }

    console.log(`Fetched ${logs?.length || 0} activity logs`);

    // Generate CSV content
    const csvContent = generateCSV(logs || []);

    // Get admin email from company settings
    const { data: settings } = await supabase
      .from("company_settings")
      .select("*")
      .maybeSingle();

    // For now, just log the CSV content
    // In production, you would integrate with Resend or another email service
    console.log("CSV Report Generated:", csvContent);

    return new Response(
      JSON.stringify({
        success: true,
        logCount: logs?.length || 0,
        message: "Activity logs report generated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-activity-logs-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateCSV(logs: ActivityLog[]): string {
  const headers = ["Date/Time", "User", "Email", "Action Type", "Description", "Metadata"];
  const rows = logs.map(log => [
    new Date(log.created_at).toISOString(),
    log.user_name || "",
    log.user_email || "",
    log.action_type,
    log.action_description,
    JSON.stringify(log.metadata || {}),
  ]);

  const csvRows = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );

  return csvRows.join("\n");
}

serve(handler);
