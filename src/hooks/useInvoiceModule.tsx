import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useInvoiceModule = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModuleStatus();

    // Subscribe to changes
    const channel = supabase
      .channel('company_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_settings'
        },
        (payload) => {
          if (payload.new && 'invoice_module_enabled' in payload.new) {
            setIsEnabled(payload.new.invoice_module_enabled ?? true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchModuleStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("invoice_module_enabled")
        .maybeSingle();

      if (error) throw error;

      setIsEnabled(data?.invoice_module_enabled ?? true);
    } catch (error) {
      console.error("Error fetching module status:", error);
      setIsEnabled(true); // Default to enabled on error
    } finally {
      setLoading(false);
    }
  };

  return { isEnabled, loading };
};
