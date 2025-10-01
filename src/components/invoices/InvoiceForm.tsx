import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface InvoiceItem {
  id?: string;
  product_id?: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  subtotal: number;
  vat_amount: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  default_price: number;
  default_vat_rate: number;
}

export const InvoiceForm = ({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [customText, setCustomText] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("invoice_customers")
      .select("id, name")
      .order("name");
    setCustomers(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("invoice_products")
      .select("*")
      .order("name");
    setProducts(data || []);
  };

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      setCustomerId(invoice.customer_id);
      setIssueDate(invoice.issue_date);
      setDueDate(invoice.due_date);
      setCustomText(invoice.custom_text || "");

      const { data: invoiceItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("line_order");

      if (itemsError) throw itemsError;
      setItems(invoiceItems || []);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error("Failed to load invoice");
    }
  };

  const addItem = () => {
    setItems([...items, {
      name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      vat_rate: 20,
      subtotal: 0,
      vat_amount: 0,
      total: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "product_id" && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].name = product.name;
        newItems[index].description = product.description || "";
        newItems[index].unit_price = Number(product.default_price);
        newItems[index].vat_rate = Number(product.default_vat_rate);
      }
    }

    if (["quantity", "unit_price", "vat_rate"].includes(field)) {
      const item = newItems[index];
      item.subtotal = item.quantity * item.unit_price;
      item.vat_amount = (item.subtotal * item.vat_rate) / 100;
      item.total = item.subtotal + item.vat_amount;
    }

    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalVat = items.reduce((sum, item) => sum + item.vat_amount, 0);
    const total = items.reduce((sum, item) => sum + item.total, 0);
    return { subtotal, totalVat, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setLoading(true);
    try {
      const { subtotal, totalVat, total } = calculateTotals();

      let invoiceNumber = "";
      if (!invoiceId) {
        const { data: numberData, error: numberError } = await supabase
          .rpc("generate_invoice_number", { p_user_id: user.id });
        
        if (numberError) throw numberError;
        invoiceNumber = numberData;
      }

      const invoiceData = {
        user_id: user.id,
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate,
        custom_text: customText,
        subtotal,
        total_vat: totalVat,
        total,
        status: "draft",
      };

      let finalInvoiceId = invoiceId;

      if (invoiceId) {
        const { error } = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", invoiceId);
        if (error) throw error;

        await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", invoiceId);
      } else {
        const { data, error } = await supabase
          .from("invoices")
          .insert({ ...invoiceData, invoice_number: invoiceNumber })
          .select()
          .single();
        if (error) throw error;
        finalInvoiceId = data.id;
      }

      const itemsToInsert = items.map((item, index) => ({
        invoice_id: finalInvoiceId,
        product_id: item.product_id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        subtotal: item.subtotal,
        vat_amount: item.vat_amount,
        total: item.total,
        line_order: index,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success(invoiceId ? "Invoice updated successfully" : "Invoice created successfully");
      onClose();
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, totalVat, total } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer">Customer *</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="issueDate">Issue Date</Label>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="customText">Custom Text / Notes</Label>
        <Textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Add any custom notes or terms..."
          rows={3}
        />
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Items</h3>
          <Button type="button" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border rounded p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Product (optional)</Label>
                    <Select
                      value={item.product_id || ""}
                      onValueChange={(value) => updateItem(index, "product_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product or enter manually" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Unit Price (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <Label>VAT Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.vat_rate}
                      onChange={(e) => updateItem(index, "vat_rate", parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <Input
                      value={`€${item.total.toFixed(2)}`}
                      disabled
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total VAT:</span>
            <span>€{totalVat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>€{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : invoiceId ? "Update Invoice" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
};
