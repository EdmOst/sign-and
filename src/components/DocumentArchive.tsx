import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Document, Page } from "react-pdf";
import { ArrowLeft, Search, Download, Calendar, FileText, Filter, Eye } from "lucide-react";
import { format } from "date-fns";

interface SignaturePosition {
  id: string;
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
  signature?: string;
  timestamp?: string;
}

interface SignedDocument {
  id: string;
  name: string;
  signedAt: Date;
  originalFileName: string;
  signedFileName?: string;
  signatures: SignaturePosition[];
}

interface DocumentArchiveProps {
  documents: SignedDocument[];
  onClose: () => void;
}

const PreviewModal: React.FC<{ document: SignedDocument | null; isOpen: boolean; onClose: () => void }> = ({ document, isOpen, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Memoize PDF options to prevent unnecessary reloads - MUST be before any early returns
  const pdfOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
  }), []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  if (!document) return null;

  // Use the blob URL directly for react-pdf
  const pdfUrl = document.signedFileName || document.originalFileName;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {document.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {numPages}
              </span>
              <Button
                onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage >= numPages}
                size="sm"
              >
                Next
              </Button>
            </div>
          <Document 
            file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div>Loading preview...</div>}
              error={<div>Error loading preview</div>}
              options={pdfOptions}
            >
              <Page
                pageNumber={currentPage}
                width={Math.min(600, window.innerWidth - 200)}
                className="shadow-soft border rounded"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const DocumentArchive: React.FC<DocumentArchiveProps> = ({ documents, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [previewDocument, setPreviewDocument] = useState<SignedDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter(doc =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.signedAt.toDateString());
        const compareDate = new Date(filterDate.toDateString());
        return docDate.getTime() === compareDate.getTime();
      });
    }

    return filtered.sort((a, b) => {
      if (sortBy === "date") {
        return b.signedAt.getTime() - a.signedAt.getTime();
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [documents, searchTerm, dateFilter, sortBy]);

  const handleDownload = (document: SignedDocument) => {
    if (document.signedFileName) {
      const link = window.document.createElement("a");
      link.href = document.signedFileName;
      link.download = `signed-${document.name}`;
      link.click();
    }
  };

  const handlePreview = (document: SignedDocument) => {
    setPreviewDocument(document);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Filters */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Documents</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="date">Filter by Date</Label>
              <Input
                id="date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="sort">Sort By</Label>
              <select
                id="sort"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "name")}
              >
                <option value="date">Date (Newest First)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
          
          {(searchTerm || dateFilter) && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setDateFilter("");
                }}
              >
                Clear Filters
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {filteredDocuments.length} of {documents.length} documents
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <Card className="shadow-medium">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground text-center">
                {documents.length === 0
                  ? "No signed documents yet. Start by uploading and signing a PDF."
                  : "Try adjusting your search or filter criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((document) => (
            <Card key={document.id} className="shadow-medium">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">{document.name}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Signed: {format(document.signedAt, "PPP 'at' p")}</span>
                      </div>
                      
                      <div>
                        <span>Signatures: {document.signatures.length}</span>
                      </div>
                      
                      <div>
                        <span>Status: Complete</span>
                      </div>
                    </div>

                    {document.signatures.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm text-muted-foreground mb-2">Signature Details:</div>
                        <div className="space-y-1">
                          {document.signatures.map((sig, index) => (
                            <div key={sig.id} className="text-xs text-muted-foreground">
                              Signature {index + 1}: Page {sig.page}
                              {sig.timestamp && (
                                <span className="ml-2">
                                  at {format(new Date(sig.timestamp), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(document)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="professional"
                      size="sm"
                      onClick={() => handleDownload(document)}
                      disabled={!document.signedFileName}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <PreviewModal 
        document={previewDocument}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewDocument(null);
        }}
      />
    </div>
  );
};