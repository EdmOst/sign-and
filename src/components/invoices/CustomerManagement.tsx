import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, Search, FileText } from "lucide-react";
import { CustomerInvoiceHistory } from "./CustomerInvoiceHistory";
import { logActivity } from "@/lib/activityLogger";

interface Customer {
  id: string;
  customer_number: string;
  name: string;
  address: string;
  customer_group: 'private' | 'company';
  vat_number: string | null;
  person_id: string | null;
  email: string | null;
}

export const CustomerManagement = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    customer_group: "private" as 'private' | 'company',
    vat_number: "",
    person_id: "",
    email: "",
  });

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.customer_number.toLowerCase().includes(query) ||
        customer.address.toLowerCase().includes(query) ||
        customer.customer_group.toLowerCase().includes(query) ||
        (customer.vat_number && customer.vat_number.toLowerCase().includes(query)) ||
        (customer.person_id && customer.person_id.toLowerCase().includes(query)) ||
        (customer.email && customer.email.toLowerCase().includes(query))
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_customers")
        .select("*")
        .order("customer_number");

      if (error) throw error;
      const typedData = (data || []) as Customer[];
      setCustomers(typedData);
      setFilteredCustomers(typedData);
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
        person_id: formData.person_id || null,
        email: formData.email || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("invoice_customers")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
        
        await logActivity({
          userId: user.id,
          userName: user.email || undefined,
          userEmail: user.email || undefined,
          actionType: "customer_updated",
          actionDescription: `Updated customer ${formData.name}`,
          metadata: { customer_id: editingId, customer_name: formData.name },
        });
        
        toast.success("Customer updated successfully");
      } else {
        const { data: result, error } = await supabase
          .from("invoice_customers")
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        
        const { data: numberData, error: numberError } = await supabase
          .rpc('generate_customer_number');
        if (!numberError && numberData) {
          await supabase
            .from("invoice_customers")
            .update({ customer_number: numberData })
            .eq("id", result.id);
        }
        
        await logActivity({
          userId: user.id,
          userName: user.email || undefined,
          userEmail: user.email || undefined,
          actionType: "customer_created",
          actionDescription: `Created customer ${formData.name}`,
          metadata: { customer_id: result.id, customer_name: formData.name },
        });
        
        toast.success("Customer created successfully");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", address: "", customer_group: "private", vat_number: "", person_id: "", email: "" });
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
      customer_group: customer.customer_group,
      vat_number: customer.vat_number || "",
      person_id: customer.person_id || "",
      email: customer.email || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const customerToDelete = customers.find(c => c.id === id);
      
      const { error } = await supabase
        .from("invoice_customers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await logActivity({
        userId: user!.id,
        userName: user!.email || undefined,
        userEmail: user!.email || undefined,
        actionType: "customer_deleted",
        actionDescription: `Deleted customer ${customerToDelete?.name || id}`,
        metadata: { customer_id: id, customer_name: customerToDelete?.name },
      });

      toast.success("Customer deleted successfully");
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({ name: "", address: "", customer_group: "private", vat_number: "", person_id: "", email: "" });
          setShowForm(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchQuery ? "No customers found matching your search." : "No customers yet. Add your first customer to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer) => (
            <Collapsible
              key={customer.id}
              open={expandedId === customer.id}
              onOpenChange={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
            >
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-left">
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === customer.id ? 'transform rotate-180' : ''}`} />
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.customer_number} • {customer.customer_group}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => setShowInvoiceHistory(customer.id)}>
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-2 pt-0">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Address</p>
                      <p className="text-sm whitespace-pre-wrap">{customer.address}</p>
                    </div>
                    {customer.customer_group === 'company' && customer.vat_number && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">VAT Number</p>
                        <p className="text-sm">{customer.vat_number}</p>
                      </div>
                    )}
                    {customer.customer_group === 'private' && customer.person_id && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Person ID</p>
                        <p className="text-sm">{customer.person_id}</p>
                      </div>
                    )}
                    {customer.email && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-sm">{customer.email}</p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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
              <Label htmlFor="customer_group">Customer Group *</Label>
              <Select
                value={formData.customer_group}
                onValueChange={(value: 'private' | 'company') => setFormData({ ...formData, customer_group: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
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
            {formData.customer_group === 'company' && (
              <div>
                <Label htmlFor="vat_number">VAT Number</Label>
                <Input
                  id="vat_number"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                />
              </div>
            )}
            {formData.customer_group === 'private' && (
              <div>
                <Label htmlFor="person_id">Person ID</Label>
                <Input
                  id="person_id"
                  value={formData.person_id}
                  onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                />
              </div>
            )}
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

      <Dialog open={!!showInvoiceHistory} onOpenChange={() => setShowInvoiceHistory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Invoice History</DialogTitle>
          </DialogHeader>
          {showInvoiceHistory && (
            <CustomerInvoiceHistory
              customerId={showInvoiceHistory}
              customerName={customers.find(c => c.id === showInvoiceHistory)?.name || ""}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
