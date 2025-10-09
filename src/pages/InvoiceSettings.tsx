import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { InvoiceCompanySettings } from "@/components/invoices/InvoiceCompanySettings";

const InvoiceSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-2" />
            Main
          </Button>
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
          <h1 className="text-3xl font-bold">Invoice Company Settings</h1>
        </div>
        <InvoiceCompanySettings />
      </div>
    </div>
  );
};

export default InvoiceSettings;
