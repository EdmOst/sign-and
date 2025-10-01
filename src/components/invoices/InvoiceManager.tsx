import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, FileText, Users, Package, Settings, Download, Trash2, CheckCircle, Mail } from "lucide-react";
import { InvoiceForm } from "./InvoiceForm";
import { CustomerManagement } from "./CustomerManagement";
import { ProductManagement } from "./ProductManagement";
import { InvoiceCompanySettings } from "./InvoiceCompanySettings";
import { InvoiceEmailTemplates } from "./InvoiceEmailTemplates";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { generateInvoicePDF } from "@/lib/invoicePdfGenerator";

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total: number;
  invoice_customers: {
    name: string;
  };
}

export const InvoiceManager = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("invoices");

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
          *,
          invoice_customers (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Invoice marked as paid");
      fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update invoice");
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
        toast.error("Please configure company settings first");
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

      toast.success("Invoice PDF downloaded");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleSendEmail = async (invoiceId: string) => {
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

      if (!invoice.invoice_customers.email) {
        toast.error("Customer does not have an email address");
        return;
      }

      const { data: templates } = await supabase
        .from("invoice_email_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (!templates) {
        toast.error("Please create a default email template first");
        setActiveTab("emails");
        return;
      }

      const { data: companySettings, error: settingsError } = await supabase
        .from("invoice_company_settings")
        .select("*")
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (!companySettings) {
        toast.error("Please configure company settings first");
        return;
      }

      // Generate PDF
      const pdfBytes = await generateInvoicePDF(invoice, companySettings);
      const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

      // Replace placeholders in template
      let subject = templates.subject
        .replace(/{invoice_number}/g, invoice.invoice_number)
        .replace(/{company_name}/g, companySettings.company_name)
        .replace(/{customer_name}/g, invoice.invoice_customers.name);

      let body = templates.body
        .replace(/{invoice_number}/g, invoice.invoice_number)
        .replace(/{company_name}/g, companySettings.company_name)
        .replace(/{customer_name}/g, invoice.invoice_customers.name)
        .replace(/{total}/g, `€${Number(invoice.total).toFixed(2)}`)
        .replace(/{due_date}/g, format(new Date(invoice.due_date), "PP"));

      // Call edge function to send email
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          to: invoice.invoice_customers.email,
          subject,
          body,
          pdfBase64: base64Pdf,
          fileName: `${invoice.invoice_number}.pdf`,
        },
      });

      if (error) {
        if (error.message.includes("RESEND_API_KEY")) {
          toast.error("Email service not configured. Please add RESEND_API_KEY to your Supabase secrets.");
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Email sent to ${invoice.invoice_customers.email}`);
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      issued: "default",
      paid: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invoice Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="invoices">
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="w-4 h-4 mr-2" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Company Settings
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="w-4 h-4 mr-2" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Invoices</h2>
            <Button onClick={() => setShowInvoiceForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No invoices yet. Create your first invoice to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-medium">
                      {invoice.invoice_number}
                    </CardTitle>
                    {getStatusBadge(invoice.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Customer</p>
                        <p className="font-medium">{invoice.invoice_customers.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Issue Date</p>
                        <p className="font-medium">{format(new Date(invoice.issue_date), "PP")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p className="font-medium">{format(new Date(invoice.due_date), "PP")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-medium">€{Number(invoice.total).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingInvoice(invoice.id);
                          setShowInvoiceForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(invoice.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      {invoice.status !== "paid" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsPaid(invoice.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Paid
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendEmail(invoice.id)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteInvoice(invoice.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers">
          <CustomerManagement />
        </TabsContent>

        <TabsContent value="products">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="settings">
          <InvoiceCompanySettings />
        </TabsContent>

        <TabsContent value="emails">
          <InvoiceEmailTemplates />
        </TabsContent>
      </Tabs>

      <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
            </DialogTitle>
          </DialogHeader>
          <InvoiceForm
            invoiceId={editingInvoice}
            onClose={() => {
              setShowInvoiceForm(false);
              setEditingInvoice(null);
              fetchInvoices();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
