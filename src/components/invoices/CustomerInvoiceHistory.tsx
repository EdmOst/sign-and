import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileText, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/lib/invoicePdfGenerator";

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total: number;
  sent_at?: string;
  deleted_at?: string;
}

interface CustomerInvoiceHistoryProps {
  customerId: string;
  customerName: string;
}

export const CustomerInvoiceHistory = ({ customerId, customerName }: CustomerInvoiceHistoryProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerInvoices();
  }, [customerId]);

  const fetchCustomerInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", customerId)
        .order("issue_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching customer invoices:", error);
      toast.error("Failed to load invoice history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (invoice: Invoice) => {
    if (invoice.deleted_at) return "bg-muted/50 text-muted-foreground";
    switch (invoice.status) {
      case "paid":
        return "bg-success text-success-foreground";
      case "draft":
        return "bg-warning text-warning-foreground";
      case "credited":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          invoice_customers (*),
          invoice_items (*)
        `)
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: companySettings, error: settingsError } = await supabase
        .from("invoice_company_settings")
        .select("*")
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (!companySettings) {
        toast.error("Company settings not configured");
        return;
      }

      const pdfBytes = await generateInvoicePDF(invoice, companySettings);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoice_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to download invoice");
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading invoice history...</div>;
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice History - {customerName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No invoices found for this customer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice History - {customerName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                invoice.deleted_at
                  ? "opacity-50 bg-muted/20"
                  : "bg-card hover:shadow-soft transition-shadow"
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{invoice.invoice_number}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(invoice.issue_date), "dd/MM/yyyy")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">€{Number(invoice.total).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    Due: {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge className={getStatusColor(invoice)}>
                    {invoice.deleted_at ? "Deleted" : invoice.status}
                  </Badge>
                  {invoice.sent_at && !invoice.deleted_at && (
                    <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                      Sent
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadPDF(invoice.id)}
                  disabled={!!invoice.deleted_at}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
