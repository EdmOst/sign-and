import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  address: string;
  vat_number: string | null;
  email: string | null;
}

export const CustomerManagement = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    vat_number: "",
    email: "",
  });

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_customers")
        .select("*")
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const data = {
        user_id: user.id,
        ...formData,
        vat_number: formData.vat_number || null,
        email: formData.email || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("invoice_customers")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Customer updated successfully");
      } else {
        const { error } = await supabase
          .from("invoice_customers")
          .insert(data);
        if (error) throw error;
        toast.success("Customer created successfully");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", address: "", vat_number: "", email: "" });
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Failed to save customer");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      address: customer.address,
      vat_number: customer.vat_number || "",
      email: customer.email || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const { error } = await supabase
        .from("invoice_customers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Customer deleted successfully");
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Customers</h2>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ name: "", address: "", vat_number: "", email: "" });
          setShowForm(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No customers yet. Add your first customer to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {customers.map((customer) => (
            <Card key={customer.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{customer.name}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-sm whitespace-pre-wrap">{customer.address}</p>
                </div>
                {customer.vat_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">VAT Number</p>
                    <p className="text-sm">{customer.vat_number}</p>
                  </div>
                )}
                {customer.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm">{customer.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <div>
              <Label htmlFor="vat_number">VAT Number</Label>
              <Input
                id="vat_number"
                value={formData.vat_number}
                onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
