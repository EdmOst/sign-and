import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Document, Page } from "react-pdf";
import { ArrowLeft, Download, Eye, Search, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
          last_downloaded_at
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

        if (profile) {
          await supabase
            .from('documents')
            .update({
              last_previewed_by_name: profile.display_name,
              last_previewed_by_email: profile.email,
              last_previewed_at: new Date().toISOString()
            })
            .eq('id', document.id);
        }
      }
    } catch (error) {
      console.error('Error updating preview tracking:', error);
    }

    setSelectedDocument(document);
    // Refresh documents to show updated tracking
    fetchDocuments();
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

        if (profile) {
          await supabase
            .from('documents')
            .update({
              last_downloaded_by_name: profile.display_name,
              last_downloaded_by_email: profile.email,
              last_downloaded_at: new Date().toISOString()
            })
            .eq('id', document.id);
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
      fetchDocuments();
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
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
                <TableHead>Signed Date</TableHead>
                <TableHead>Signatures</TableHead>
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
                    {format(new Date(document.signed_at), 'PPp')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {document.signatures.length} signature{document.signatures.length !== 1 ? 's' : ''}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {document.last_downloaded_at || document.last_previewed_at ? (
                      <div className="text-sm">
                        {document.last_downloaded_at && document.last_previewed_at ? (
                          document.last_downloaded_at > document.last_previewed_at ? (
                            <>
                              <div className="font-medium">{document.last_downloaded_by_name}</div>
                              <div className="text-xs text-muted-foreground">
                                Downloaded {format(new Date(document.last_downloaded_at), 'PPp')}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium">{document.last_previewed_by_name}</div>
                              <div className="text-xs text-muted-foreground">
                                Previewed {format(new Date(document.last_previewed_at), 'PPp')}
                              </div>
                            </>
                          )
                        ) : document.last_downloaded_at ? (
                          <>
                            <div className="font-medium">{document.last_downloaded_by_name}</div>
                            <div className="text-xs text-muted-foreground">
                              Downloaded {format(new Date(document.last_downloaded_at), 'PPp')}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium">{document.last_previewed_by_name}</div>
                            <div className="text-xs text-muted-foreground">
                              Previewed {format(new Date(document.last_previewed_at), 'PPp')}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No activity</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(document)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(document)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
    </div>
  );
};