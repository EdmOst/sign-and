import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface DocumentEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentData: string; // base64 PDF data
  documentName: string;
}

export const DocumentEmailDialog = ({ open, onOpenChange, documentData, documentName }: DocumentEmailDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [formData, setFormData] = useState({
    to: "",
    subject: "Signed Document",
    body: "Please find attached the signed document.",
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_email_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        subject: template.subject,
        body: template.body,
      });
    }
  };

  const handleSend = async () => {
    if (!formData.to) {
      toast.error("Please enter recipient email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          to: formData.to,
          subject: formData.subject,
          body: formData.body,
          pdfBase64: documentData,
          fileName: documentName,
        },
      });

      if (error) throw error;

      toast.success("Document sent successfully");
      onOpenChange(false);
      setFormData({
        to: "",
        subject: "Signed Document",
        body: "Please find attached the signed document.",
      });
      setSelectedTemplateId("");
    } catch (error) {
      console.error("Error sending document:", error);
      toast.error("Failed to send document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Document via Email
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {templates.length > 0 && (
            <div>
              <Label htmlFor="template">Email Template (Optional)</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="to">Recipient Email *</Label>
            <Input
              id="to"
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder="customer@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={6}
              required
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Document to send: <span className="font-medium">{documentName}</span>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
