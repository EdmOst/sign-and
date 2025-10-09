import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { generateInvoicePDF } from "@/lib/invoicePdfGenerator";

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  invoice_customers: {
    name: string;
  };
}

interface InvoiceSelectorProps {
  onInvoiceLoad: (file: File) => void;
}

export const InvoiceSelector = ({ onInvoiceLoad }: InvoiceSelectorProps) => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          issue_date,
          invoice_customers (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    }
  };

  const handleLoadInvoice = async () => {
    if (!selectedInvoiceId) {
      toast.error("Please select an invoice");
      return;
    }

    setLoading(true);
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          invoice_customers (*),
          invoice_items (*)
        `)
        .eq("id", selectedInvoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: companySettings, error: settingsError } = await supabase
        .from("invoice_company_settings")
        .select("*")
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (!companySettings) {
        toast.error("Please configure company settings first");
        return;
      }

      const pdfBytes = await generateInvoicePDF(invoice, companySettings);
      
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const file = new File([blob], `${invoice.invoice_number}.pdf`, { type: "application/pdf" });
      
      onInvoiceLoad(file);
      toast.success("Invoice loaded for signing");
    } catch (error) {
      console.error("Error loading invoice:", error);
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  if (invoices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-4 h-4" />
        <Label className="text-sm font-semibold">Load Invoice for Signing</Label>
      </div>
      <div className="flex gap-2">
        <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select an invoice..." />
          </SelectTrigger>
          <SelectContent>
            {invoices.map((invoice) => (
              <SelectItem key={invoice.id} value={invoice.id}>
                {invoice.invoice_number} - {invoice.invoice_customers.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleLoadInvoice} 
          disabled={loading || !selectedInvoiceId}
          size="sm"
        >
          {loading ? "Loading..." : "Load"}
        </Button>
      </div>
    </div>
  );
};
