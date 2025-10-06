import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const InvoiceModuleToggle = () => {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchModuleStatus();
  }, []);

  const fetchModuleStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("id, invoice_module_enabled")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setEnabled(data.invoice_module_enabled ?? true);
      }
    } catch (error) {
      console.error("Error fetching module status:", error);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const updateData = { invoice_module_enabled: checked };

      if (settingsId) {
        const { error } = await supabase
          .from("company_settings")
          .update(updateData)
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("company_settings")
          .insert(updateData)
          .select()
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }

      setEnabled(checked);
      toast.success(`Invoice module ${checked ? "enabled" : "disabled"}`);
    } catch (error: any) {
      console.error("Error toggling module:", error);
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <h3 className="font-medium">Invoicing Module</h3>
        <p className="text-sm text-muted-foreground">Enable invoice creation and management</p>
      </div>
      <Switch
        id="invoice-module"
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
};
