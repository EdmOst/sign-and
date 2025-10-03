import { supabase } from "@/integrations/supabase/client";

interface LogActivityParams {
  userId: string;
  userName?: string;
  userEmail?: string;
  actionType: string;
  actionDescription: string;
  metadata?: Record<string, any>;
}

export async function logActivity({
  userId,
  userName,
  userEmail,
  actionType,
  actionDescription,
  metadata = {},
}: LogActivityParams) {
  try {
    const { error } = await supabase
      .from("user_activity_logs")
      .insert({
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        action_type: actionType,
        action_description: actionDescription,
        metadata,
      });

    if (error) {
      console.error("Error logging activity:", error);
    }
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}
