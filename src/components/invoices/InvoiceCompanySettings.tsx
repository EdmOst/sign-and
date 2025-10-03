import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const InvoiceCompanySettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    address: "",
    vat_number: "",
    iban: "",
    bic: "",
    logo_url: "",
    payment_terms: "Payment due within 30 days",
    legal_notes: "",
    show_product_codes: false,
    show_barcodes: false,
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_from_name: "",
    issuer_first_name: "",
    issuer_last_name: "",
    issuer_role: "",
    issuer_email: "",
    issuer_phone: "",
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_company_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettingsId(data.id);
        setFormData({
          company_name: data.company_name,
          address: data.address,
          vat_number: data.vat_number || "",
          iban: data.iban || "",
          bic: data.bic || "",
          logo_url: data.logo_url || "",
          payment_terms: data.payment_terms || "Payment due within 30 days",
          legal_notes: data.legal_notes || "",
          show_product_codes: data.show_product_codes || false,
          show_barcodes: data.show_barcodes || false,
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || 587,
          smtp_username: data.smtp_username || "",
          smtp_password: data.smtp_password || "",
          smtp_from_email: data.smtp_from_email || "",
          smtp_from_name: data.smtp_from_name || "",
          issuer_first_name: data.issuer_first_name || "",
          issuer_last_name: data.issuer_last_name || "",
          issuer_role: data.issuer_role || "",
          issuer_email: data.issuer_email || "",
          issuer_phone: data.issuer_phone || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const data = {
        user_id: user.id,
        ...formData,
        vat_number: formData.vat_number || null,
        iban: formData.iban || null,
        bic: formData.bic || null,
        logo_url: formData.logo_url || null,
        legal_notes: formData.legal_notes || null,
      };

      if (settingsId) {
        const { error } = await supabase
          .from("invoice_company_settings")
          .update(data)
          .eq("id", settingsId);
        if (error) throw error;
      } else {
        const { data: newData, error } = await supabase
          .from("invoice_company_settings")
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        setSettingsId(newData.id);
      }

      toast.success("Company settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-h-[75vh] overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>Company Invoice Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vat_number">VAT Number</Label>
              <Input
                id="vat_number"
                value={formData.vat_number}
                onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bic">BIC/SWIFT</Label>
              <Input
                id="bic"
                value={formData.bic}
                onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Input
              id="payment_terms"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="legal_notes">Legal Notes / Footer Text</Label>
            <Textarea
              id="legal_notes"
              value={formData.legal_notes}
              onChange={(e) => setFormData({ ...formData, legal_notes: e.target.value })}
              rows={3}
              placeholder="Add any legal disclaimers or footer text..."
            />
          </div>
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Invoice Display Options</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="show_product_codes">Show Product Codes on Invoices</Label>
              <Switch
                id="show_product_codes"
                checked={formData.show_product_codes}
                onCheckedChange={(checked) => setFormData({ ...formData, show_product_codes: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show_barcodes">Show Barcodes on Invoices</Label>
              <Switch
                id="show_barcodes"
                checked={formData.show_barcodes}
                onCheckedChange={(checked) => setFormData({ ...formData, show_barcodes: checked })}
              />
            </div>
          </div>
          
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">SMTP Email Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp_host">SMTP Host</Label>
                <Input
                  id="smtp_host"
                  value={formData.smtp_host}
                  onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <Label htmlFor="smtp_port">SMTP Port</Label>
                <Input
                  id="smtp_port"
                  type="number"
                  value={formData.smtp_port}
                  onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp_username">SMTP Username</Label>
                <Input
                  id="smtp_username"
                  value={formData.smtp_username}
                  onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="smtp_password">SMTP Password</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  value={formData.smtp_password}
                  onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp_from_email">From Email</Label>
                <Input
                  id="smtp_from_email"
                  type="email"
                  value={formData.smtp_from_email}
                  onChange={(e) => setFormData({ ...formData, smtp_from_email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="smtp_from_name">From Name</Label>
                <Input
                  id="smtp_from_name"
                  value={formData.smtp_from_name}
                  onChange={(e) => setFormData({ ...formData, smtp_from_name: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Invoice Issuer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issuer_first_name">First Name *</Label>
                <Input
                  id="issuer_first_name"
                  value={formData.issuer_first_name}
                  onChange={(e) => setFormData({ ...formData, issuer_first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="issuer_last_name">Last Name *</Label>
                <Input
                  id="issuer_last_name"
                  value={formData.issuer_last_name}
                  onChange={(e) => setFormData({ ...formData, issuer_last_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="issuer_role">Role</Label>
              <Input
                id="issuer_role"
                value={formData.issuer_role}
                onChange={(e) => setFormData({ ...formData, issuer_role: e.target.value })}
                placeholder="e.g., CEO, Sales Manager"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issuer_email">Email</Label>
                <Input
                  id="issuer_email"
                  type="email"
                  value={formData.issuer_email}
                  onChange={(e) => setFormData({ ...formData, issuer_email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="issuer_phone">Phone</Label>
                <Input
                  id="issuer_phone"
                  value={formData.issuer_phone}
                  onChange={(e) => setFormData({ ...formData, issuer_phone: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  );
};
