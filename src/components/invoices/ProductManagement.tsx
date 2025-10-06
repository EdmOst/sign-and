import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/activityLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  default_vat_rate: number;
  product_code: string | null;
  barcode: string | null;
}

export const ProductManagement = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    default_price: "",
    default_vat_rate: "20",
    product_code: "",
    barcode: "",
  });

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_products")
        .select("*")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
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
        name: formData.name,
        description: formData.description || null,
        default_price: parseFloat(formData.default_price),
        default_vat_rate: parseFloat(formData.default_vat_rate),
        product_code: formData.product_code || null,
        barcode: formData.barcode || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("invoice_products")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
        
        await logActivity({
          userId: user.id,
          userName: user.email || undefined,
          userEmail: user.email || undefined,
          actionType: "product_updated",
          actionDescription: `Updated product ${formData.name}`,
          metadata: { product_id: editingId, product_name: formData.name },
        });
        
        toast.success("Product updated successfully");
      } else {
        const { data: result, error } = await supabase
          .from("invoice_products")
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        
        await logActivity({
          userId: user.id,
          userName: user.email || undefined,
          userEmail: user.email || undefined,
          actionType: "product_created",
          actionDescription: `Created product ${formData.name}`,
          metadata: { product_id: result.id, product_name: formData.name },
        });
        
        toast.success("Product created successfully");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", description: "", default_price: "", default_vat_rate: "20", product_code: "", barcode: "" });
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description || "",
      default_price: product.default_price.toString(),
      default_vat_rate: product.default_vat_rate.toString(),
      product_code: product.product_code || "",
      barcode: product.barcode || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const productToDelete = products.find(p => p.id === id);
      
      const { error } = await supabase
        .from("invoice_products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await logActivity({
        userId: user!.id,
        userName: user!.email || undefined,
        userEmail: user!.email || undefined,
        actionType: "product_deleted",
        actionDescription: `Deleted product ${productToDelete?.name || id}`,
        metadata: { product_id: id, product_name: productToDelete?.name },
      });

      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-xl font-semibold">Products & Services</h2>
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={() => {
            setEditingId(null);
            setFormData({ name: "", description: "", default_price: "", default_vat_rate: "20", product_code: "", barcode: "" });
            setShowForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No products yet. Add your first product or service to get started.
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No products match your search.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>VAT %</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {product.description || "-"}
                  </TableCell>
                  <TableCell>€{Number(product.default_price).toFixed(2)}</TableCell>
                  <TableCell>{Number(product.default_vat_rate)}%</TableCell>
                  <TableCell>{product.product_code || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{product.barcode || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="default_price">Default Price (€) *</Label>
              <Input
                id="default_price"
                type="number"
                step="0.01"
                value={formData.default_price}
                onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="default_vat_rate">Default VAT Rate (%) *</Label>
              <Input
                id="default_vat_rate"
                type="number"
                step="0.01"
                value={formData.default_vat_rate}
                onChange={(e) => setFormData({ ...formData, default_vat_rate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="product_code">Product Code</Label>
              <Input
                id="product_code"
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                placeholder="SKU or product code"
              />
            </div>
            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Barcode number"
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
