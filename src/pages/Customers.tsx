import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CustomerManagement } from "@/components/invoices/CustomerManagement";

const Customers = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
          <h1 className="text-3xl font-bold">Customer Management</h1>
        </div>
        <CustomerManagement />
      </div>
    </div>
  );
};

export default Customers;
