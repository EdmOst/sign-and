import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Document, Page } from "react-pdf";
import { ArrowLeft, Download, Eye, Search, Calendar, FileText, Mail, Share2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copyright } from "@/components/Copyright";
import { DocumentEmailDialog } from "./DocumentEmailDialog";

interface DocumentData {
  id: string;
  name: string;
  original_filename: string;
  signed_at: string;
  created_at: string;
  pdf_data: string;
  signatures: any;
  signed_by_name?: string;
  signed_by_email?: string;
  last_previewed_by_name?: string;
  last_previewed_by_email?: string;
  last_previewed_at?: string;
  last_downloaded_by_name?: string;
  last_downloaded_by_email?: string;
  last_downloaded_at?: string;
  share_token?: string;
  customer_signed?: boolean;
  customer_signed_at?: string;
  customer_name?: string;
  customer_email?: string;
  customer_signatures?: any;
}

interface DocumentArchiveProps {
  onClose: () => void;
}

export const DocumentArchive: React.FC<DocumentArchiveProps> = ({ onClose }) => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [documentToEmail, setDocumentToEmail] = useState<{ data: string; name: string } | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          original_filename,
          signed_at,
          created_at,
          pdf_data,
          signatures,
          signed_by_name,
          signed_by_email,
          last_previewed_by_name,
          last_previewed_by_email,
          last_previewed_at,
          last_downloaded_by_name,
          last_downloaded_by_email,
          last_downloaded_at,
          share_token,
          customer_signed,
          customer_signed_at,
          customer_name,
          customer_email,
          customer_signatures
        `)
        .order('signed_at', { ascending: false });

      if (error) throw error;
      // Convert signatures from JSON to array format
      const processedData = (data || []).map(doc => ({
        ...doc,
        signatures: Array.isArray(doc.signatures) ? doc.signatures : []
      }));
      setDocuments(processedData);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (document: DocumentData) => {
    // Update last previewed tracking
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('user_id', user.id)
          .maybeSingle();

        const { error: updateError } = await supabase
          .from('documents')
          .update({
            last_previewed_by_name: profile?.display_name || user.email || 'Unknown User',
            last_previewed_by_email: profile?.email || user.email || 'unknown@example.com',
            last_previewed_at: new Date().toISOString()
          })
          .eq('id', document.id);

        if (updateError) {
          console.error('Error updating preview tracking:', updateError);
        } else {
          // Log the activity
          await supabase
            .from('user_activity_logs')
            .insert({
              user_id: user.id,
              user_email: profile?.email || user.email,
              user_name: profile?.display_name || user.email,
              action_type: 'DOCUMENT_PREVIEW',
              action_description: `Previewed document: ${document.original_filename}`,
              metadata: { document_id: document.id, document_name: document.original_filename }
            });
        }
      }
    } catch (error) {
      console.error('Error updating preview tracking:', error);
    }

    setSelectedDocument(document);
    // Refresh documents to show updated tracking
    await fetchDocuments();
  };

  const handleDownload = async (document: DocumentData) => {
    try {
      // Update last downloaded tracking
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('user_id', user.id)
          .maybeSingle();

        const { error: updateError } = await supabase
          .from('documents')
          .update({
            last_downloaded_by_name: profile?.display_name || user.email || 'Unknown User',
            last_downloaded_by_email: profile?.email || user.email || 'unknown@example.com',
            last_downloaded_at: new Date().toISOString()
          })
          .eq('id', document.id);

        if (updateError) {
          console.error('Error updating download tracking:', updateError);
        } else {
          // Log the activity
          await supabase
            .from('user_activity_logs')
            .insert({
              user_id: user.id,
              user_email: profile?.email || user.email,
              user_name: profile?.display_name || user.email,
              action_type: 'DOCUMENT_DOWNLOAD',
              action_description: `Downloaded document: ${document.original_filename}`,
              metadata: { document_id: document.id, document_name: document.original_filename, download_method: 'archive' }
            });
        }
      }

      const byteCharacters = atob(document.pdf_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const downloadLink = window.document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = document.original_filename;
      window.document.body.appendChild(downloadLink);
      downloadLink.click();
      window.document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
      
      // Refresh documents to show updated tracking
      await fetchDocuments();
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleEmailDocument = (document: DocumentData) => {
    setDocumentToEmail({
      data: document.pdf_data,
      name: document.original_filename,
    });
    setEmailDialogOpen(true);
  };

  const handleGenerateShareLink = async (document: DocumentData) => {
    try {
      let token = document.share_token;
      
      if (!token) {
        // Generate token using database function
        const { data, error } = await supabase.rpc('generate_share_token');
        
        if (error) throw error;
        token = data;

        // Update document with token
        const { error: updateError } = await supabase
          .from('documents')
          .update({ share_token: token })
          .eq('id', document.id);

        if (updateError) throw updateError;

        await fetchDocuments();
      }

      const shareUrl = `${window.location.origin}/sign/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      console.error('Error generating share link:', error);
      toast.error('Failed to generate share link');
    }
  };

  const handleViewCustomerVersion = (document: DocumentData) => {
    if (!document.share_token) {
      toast.error('No share link generated yet');
      return;
    }
    window.open(`/sign/${document.share_token}`, '_blank');
  };

  const filteredDocuments = documents.filter(doc =>
    doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">Document Archive</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Signed Date & By</TableHead>
                <TableHead>Signatures</TableHead>
                <TableHead>Customer Status</TableHead>
                <TableHead>Last Changes By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-medium">
                    {document.original_filename}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {format(new Date(document.signed_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                      {document.signed_by_email && (
                        <div className="text-xs text-muted-foreground">
                          Signed by: {document.signed_by_name || document.signed_by_email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {document.signatures.length} signature{document.signatures.length !== 1 ? 's' : ''}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {document.customer_signed ? (
                      <div>
                        <Badge variant="default" className="mb-1">Signed</Badge>
                        <div className="text-xs text-muted-foreground">
                          {document.customer_name}
                        </div>
                      </div>
                    ) : document.share_token ? (
                      <Badge variant="outline">Link Shared</Badge>
                    ) : (
                      <Badge variant="secondary">Not Shared</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const actions = [
                        { 
                          date: document.signed_at, 
                          email: document.signed_by_email, 
                          action: 'Signed' 
                        },
                        { 
                          date: document.last_previewed_at, 
                          email: document.last_previewed_by_email, 
                          action: 'Previewed' 
                        },
                        { 
                          date: document.last_downloaded_at, 
                          email: document.last_downloaded_by_email, 
                          action: 'Downloaded' 
                        }
                      ].filter(action => action.date && action.email);

                      if (actions.length === 0) {
                        return <span className="text-muted-foreground">No activity</span>;
                      }

                      const mostRecent = actions.reduce((latest, current) => 
                        new Date(current.date!) > new Date(latest.date!) ? current : latest
                      );

                      return (
                        <div className="text-sm">
                          <div className="font-medium">{mostRecent.email}</div>
                          <div className="text-xs text-muted-foreground">
                            {mostRecent.action} {format(new Date(mostRecent.date!), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(document)}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEmailDocument(document)}
                        title="Email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateShareLink(document)}
                        title="Generate Share Link"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      {document.share_token && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCustomerVersion(document)}
                          title="View Customer Version"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.original_filename}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedDocument && (
              <div className="flex flex-col items-center space-y-4">
                <Document
                  file={`data:application/pdf;base64,${selectedDocument.pdf_data}`}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p>Loading preview...</p>
                      </div>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center text-muted-foreground">
                        <p>Error loading preview</p>
                        <p className="text-sm">The document may be corrupted or invalid</p>
                      </div>
                    </div>
                  }
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={Math.min(600, window.innerWidth - 200)}
                      className="shadow-soft border rounded mb-4"
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  ))}
                </Document>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {filteredDocuments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents found</h3>
            <p className="text-muted-foreground text-center">
              {documents.length === 0
                ? "No signed documents yet. Start by uploading and signing a PDF."
                : "Try adjusting your search criteria."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Email Dialog */}
      {documentToEmail && (
        <DocumentEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          documentData={documentToEmail.data}
          documentName={documentToEmail.name}
        />
      )}
    </div>
  );
};