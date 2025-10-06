import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Key, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export const LicenseManager = () => {
  const [licenseKey, setLicenseKey] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchLicenseInfo();
  }, []);

  const fetchLicenseInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("id, license_key, license_expires_at, license_status")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setLicenseKey(data.license_key || "");
        setExpiresAt(data.license_expires_at ? format(new Date(data.license_expires_at), "yyyy-MM-dd") : "");
        setStatus(data.license_status || "active");
      }
    } catch (error) {
      console.error("Error fetching license info:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        license_key: licenseKey,
        license_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        license_status: status,
      };

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

      toast.success("License settings saved successfully");
      fetchLicenseInfo();
    } catch (error: any) {
      console.error("Error saving license:", error);
      toast.error(`Failed to save license: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const daysUntilExpiry = expiresAt 
    ? Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          License Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="license-key">License Key</Label>
          <Input
            id="license-key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="Enter license key"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires-at">Expiration Date</Label>
          <Input
            id="expires-at"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        {expiresAt && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isExpired ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <span className="text-sm font-medium">
                  {isExpired ? "License Expired" : "License Active"}
                </span>
              </div>
              <Badge variant={isExpired ? "destructive" : "default"}>
                {isExpired 
                  ? `Expired ${Math.abs(daysUntilExpiry!)} days ago`
                  : daysUntilExpiry! > 0 
                    ? `${daysUntilExpiry} days remaining`
                    : "Expires today"}
              </Badge>
            </div>
            {!isExpired && daysUntilExpiry! < 30 && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ License will expire soon. Please renew to continue using all features.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Version: 1.0.0</span>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save License Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};
