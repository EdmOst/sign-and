import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Upload, Download, FileText, Calendar, Search, Home, LogOut, Archive, Settings } from "lucide-react";
import { SignaturePad } from "./SignaturePad";
import { DocumentArchive } from "./DocumentArchive";
import { SignatureArea } from "./SignatureArea";
import { toast } from "sonner";
import { PDFDocument, rgb } from "pdf-lib";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminSettings } from "@/components/AdminSettings";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

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
  signedBlobUrl?: string;
  signatures: SignaturePosition[];
}

export const PDFSigner: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { role, loading: roleLoading } = useUserRole();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [signaturePositions, setSignaturePositions] = useState<SignaturePosition[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
  const [currentSigningArea, setCurrentSigningArea] = useState<string | null>(null);
  const [signedDocuments, setSignedDocuments] = useState<SignedDocument[]>([]);
  const [showArchive, setShowArchive] = useState<boolean>(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState<boolean>(false);
  const [isPlacingSignature, setIsPlacingSignature] = useState<boolean>(false);
  const [isMovingSignature, setIsMovingSignature] = useState<string | null>(null);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Memoize PDF options to prevent unnecessary reloads
  const pdfOptions = useMemo(() => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
  }), []);

  // Load documents from database on component mount
  useEffect(() => {
    const loadDocuments = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('signed_at', { ascending: false });
      
      if (error) {
        console.error('Error loading documents:', error);
        toast.error('Failed to load documents');
        return;
      }
      
      if (data) {
        const documentsWithDates = data.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          signedAt: new Date(doc.signed_at),
          originalFileName: doc.original_filename,
          signedBlobUrl: `data:application/pdf;base64,${doc.pdf_data}`,
          signatures: doc.signatures || []
        }));
        setSignedDocuments(documentsWithDates);
      }
    };
    
    loadDocuments();
  }, [user]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setSignaturePositions([]);
    toast.success("PDF loaded successfully!");
  };

  const onDocumentLoadError = (error: any) => {
    console.error("PDF load error:", error);
    toast.error("Failed to load PDF. Please try another file.");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      // Clean up previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      // Create a blob URL immediately to avoid detached ArrayBuffer issues
      const url = URL.createObjectURL(file);
      setPdfFile(file);
      setPdfUrl(url);
    } else {
      toast.error("Please select a valid PDF file");
    }
  };

  const handlePageClick = useCallback((event: React.MouseEvent) => {
    if (!pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (isPlacingSignature) {
      const newSignatureArea: SignaturePosition = {
        id: `sig-${Date.now()}`,
        x,
        y,
        page: currentPage,
        width: 20,
        height: 8,
      };

      setSignaturePositions(prev => [...prev, newSignatureArea]);
      setIsPlacingSignature(false);
      toast.success("Signature area placed! Click to sign.");
    } else if (isMovingSignature) {
      setSignaturePositions(prev =>
        prev.map(area =>
          area.id === isMovingSignature
            ? { ...area, x, y, page: currentPage }
            : area
        )
      );
      setIsMovingSignature(null);
      toast.success("Signature area moved!");
    }
  }, [isPlacingSignature, isMovingSignature, currentPage]);

  const handleSignatureAreaClick = (areaId: string) => {
    if (isMovingSignature) {
      setIsMovingSignature(null);
      return;
    }
    setCurrentSigningArea(areaId);
    setShowSignaturePad(true);
  };

  const handleDeleteSignatureArea = (areaId: string) => {
    setSignaturePositions(prev => prev.filter(area => area.id !== areaId));
    toast.success("Signature area removed!");
  };

  const handleDragSignatureArea = useCallback((areaId: string, deltaX: number, deltaY: number) => {
    if (!pageRef.current) return;
    
    const rect = pageRef.current.getBoundingClientRect();
    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;
    
    setSignaturePositions(prev =>
      prev.map(area =>
        area.id === areaId
          ? { 
              ...area, 
              x: Math.max(0, Math.min(100 - area.width, area.x + deltaXPercent)),
              y: Math.max(0, Math.min(100 - area.height, area.y + deltaYPercent))
            }
          : area
      )
    );
  }, []);

  const handleSignatureComplete = (signatureDataUrl: string) => {
    if (!currentSigningArea) return;

    const timestamp = new Date().toISOString();
    setSignaturePositions(prev =>
      prev.map(area =>
        area.id === currentSigningArea
          ? { ...area, signature: signatureDataUrl, timestamp }
          : area
      )
    );
    setShowSignaturePad(false);
    setCurrentSigningArea(null);
    toast.success("Signature added successfully!");
    
    // Show archive confirmation dialog
    setShowArchiveDialog(true);
  };

  // Archive document with signed PDF and database storage
  const archiveDocument = useCallback(async () => {
    if (!pdfFile || !user) return;

    try {
      // Create signed PDF with all signatures
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Add signatures to PDF
      for (const sigPos of signaturePositions) {
        if (sigPos.signature && sigPos.page <= pages.length) {
          const page = pages[sigPos.page - 1];
          const { width, height } = page.getSize();
          
          // Convert signature image to PDF
          const signatureBytes = await fetch(sigPos.signature).then(res => res.arrayBuffer());
          const signatureImage = await pdfDoc.embedPng(signatureBytes);
          
          const sigWidth = (sigPos.width / 100) * width;
          const sigHeight = (sigPos.height / 100) * height;
          const x = (sigPos.x / 100) * width;
          const y = height - (sigPos.y / 100) * height - sigHeight;

          page.drawImage(signatureImage, {
            x,
            y,
            width: sigWidth,
            height: sigHeight,
          });

          // Add timestamp
          if (sigPos.timestamp) {
            page.drawText(`Signed: ${new Date(sigPos.timestamp).toLocaleString()}`, {
              x,
              y: y - 15,
              size: 8,
              color: rgb(0.5, 0.5, 0.5),
            });
          }
        }
      }

      // Generate signed PDF bytes
      const signedPdfBytes = await pdfDoc.save();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(signedPdfBytes)));
      
      const signedDoc: SignedDocument = {
        id: `doc-${Date.now()}`,
        name: pdfFile.name,
        signedAt: new Date(),
        originalFileName: pdfFile.name,
        signedBlobUrl: `data:application/pdf;base64,${base64}`,
        signatures: signaturePositions.filter(sig => sig.signature),
      };

      // Save to database
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: signedDoc.name,
          original_filename: signedDoc.originalFileName,
          pdf_data: base64,
          signatures: JSON.parse(JSON.stringify(signedDoc.signatures))
        });
      
      if (insertError) {
        console.error('Error saving document to database:', insertError);
        toast.error('Failed to save document to database');
        return;
      }
      
      // Update local state
      setSignedDocuments(prev => [signedDoc, ...prev]);
      
      // Reset the signing session
      resetEverything();
      
      toast.success("Signed document archived successfully!");
    } catch (error) {
      console.error("Error archiving document:", error);
      toast.error("Failed to archive document.");
    }
  }, [pdfFile, signaturePositions, user]);

  const handleDownloadSigned = async () => {
    if (!pdfFile) return;

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Add signatures to PDF
      for (const sigPos of signaturePositions) {
        if (sigPos.signature && sigPos.page <= pages.length) {
          const page = pages[sigPos.page - 1];
          const { width, height } = page.getSize();
          
          // Convert signature image to PDF
          const signatureBytes = await fetch(sigPos.signature).then(res => res.arrayBuffer());
          const signatureImage = await pdfDoc.embedPng(signatureBytes);
          
          const sigWidth = (sigPos.width / 100) * width;
          const sigHeight = (sigPos.height / 100) * height;
          const x = (sigPos.x / 100) * width;
          const y = height - (sigPos.y / 100) * height - sigHeight;

          page.drawImage(signatureImage, {
            x,
            y,
            width: sigWidth,
            height: sigHeight,
          });

          // Add timestamp
          if (sigPos.timestamp) {
            page.drawText(`Signed: ${new Date(sigPos.timestamp).toLocaleString()}`, {
              x,
              y: y - 15,
              size: 8,
              color: rgb(0.5, 0.5, 0.5),
            });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `signed-${pdfFile.name}`;
      link.click();
      
      URL.revokeObjectURL(url);

      // Create a blob URL for the signed document that persists
      const signedBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const signedBlobUrl = URL.createObjectURL(signedBlob);
      
      const updatedDocuments = signedDocuments.map(doc => {
        if (doc.name === pdfFile.name && !doc.signedFileName) {
          return { ...doc, signedFileName: `signed-${pdfFile.name}`, signedBlobUrl: signedBlobUrl };
        }
        return doc;
      });
      
      setSignedDocuments(updatedDocuments);
      
      // Store updated metadata
      const documentsToStore = updatedDocuments.map(doc => ({
        ...doc,
        // Don't store blob URLs in localStorage as they expire
        signedBlobUrl: undefined,
      }));
      localStorage.setItem('pdf-signer-documents', JSON.stringify(documentsToStore));
      toast.success("Document downloaded successfully!");
    } catch (error) {
      console.error("Error signing PDF:", error);
      toast.error("Failed to sign PDF. Please try again.");
    }
  };

  const resetEverything = () => {
    setPdfFile(null);
    setPdfUrl(null);
    setNumPages(0);
    setCurrentPage(1);
    setSignaturePositions([]);
    setCurrentSigningArea(null);
    setShowSignaturePad(false);
    setIsPlacingSignature(false);
    setIsMovingSignature(null);
    setShowArchive(false); // Close archive view
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast.error('Error signing out');
      } else {
        toast.success('Signed out successfully');
        // Navigation will be handled by the auth state listener in App.tsx
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  const canDownload = signaturePositions.some(pos => pos.signature);

  if (!user || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showAdminSettings && role === "admin") {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAdminSettings(false)}
                >
                  ← Back to PDF Signer
                </Button>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {user.email} (Admin)
                </span>
                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminSettings />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">PDF SIGNER</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.email} {role === "admin" && "(Admin)"}
              </span>
              {role === "admin" && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAdminSettings(true)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowArchive(!showArchive)}
                className="flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                Archive ({signedDocuments.length})
              </Button>
              <Button
                variant="outline"
                onClick={resetEverything}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Start Over
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/settings'}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {showArchive ? (
          <DocumentArchive 
            documents={signedDocuments}
            onClose={() => setShowArchive(false)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Controls Panel */}
            <div className="lg:col-span-1 space-y-6">
              {/* Upload Section */}
              <Card className="shadow-medium">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Upload Document</h3>
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                      variant="professional"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose PDF File
                    </Button>
                    {pdfFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {pdfFile.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Signature Tools */}
              {pdfUrl && (
                <Card className="shadow-medium">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Signature Tools</h3>
                    <div className="space-y-4">
                      <Button
                        onClick={() => {
                          setIsPlacingSignature(true);
                          setIsMovingSignature(null);
                        }}
                        variant={isPlacingSignature ? "destructive" : "default"}
                        className="w-full"
                      >
                        {isPlacingSignature ? "Click on Document" : "Place Signature Area"}
                      </Button>
                      
                      {signaturePositions.length > 0 && (
                        <div className="space-y-2">
                          <Label>Signature Areas ({signaturePositions.length})</Label>
                          <div className="text-sm text-muted-foreground">
                            Signed: {signaturePositions.filter(pos => pos.signature).length}
                          </div>
                        </div>
                      )}

                       {canDownload && (
                         <>
                           <Button
                             onClick={handleDownloadSigned}
                             variant="success"
                             className="w-full"
                           >
                             <Download className="h-4 w-4 mr-2" />
                             Download Signed PDF
                           </Button>
                           {!isPlacingSignature && !isMovingSignature && (
                             <Button
                               onClick={archiveDocument}
                               variant="secondary"
                               className="w-full"
                             >
                               <Archive className="h-4 w-4 mr-2" />
                               Archive Document
                             </Button>
                           )}
                         </>
                       )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Page Navigation */}
              {numPages > 0 && (
                <Card className="shadow-medium">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Navigation</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
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
                      <Input
                        type="number"
                        min={1}
                        max={numPages}
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Math.max(1, Math.min(numPages, parseInt(e.target.value) || 1)))}
                        placeholder="Go to page..."
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Document Viewer */}
            <div className="lg:col-span-3">
              <Card className="shadow-large">
                <CardContent className="p-6">
                  {pdfUrl ? (
                    <div className="relative">
                      <div 
                        ref={pageRef}
                         className={cn(
                           "relative inline-block",
                           isPlacingSignature || isMovingSignature ? 'cursor-default' : 'cursor-default'
                         )}
                        onClick={handlePageClick}
                      >
                          <Document 
                            file={pdfUrl} 
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={<div>Loading PDF...</div>}
                            error={<div>Error loading PDF. Please try another file.</div>}
                            options={pdfOptions}
                          >
                            <Page
                              pageNumber={currentPage}
                              width={Math.min(800, window.innerWidth - 400)}
                              className="shadow-soft border rounded"
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          </Document>
                        
                        {/* Signature Areas */}
                        {signaturePositions
                          .filter(pos => pos.page === currentPage)
                          .map(position => (
                            <SignatureArea
                              key={position.id}
                              position={position}
                              onClick={() => handleSignatureAreaClick(position.id)}
                              onDelete={!position.signature ? () => handleDeleteSignatureArea(position.id) : undefined}
                              onDrag={!position.signature ? (deltaX, deltaY) => handleDragSignatureArea(position.id, deltaX, deltaY) : undefined}
                            />
                          ))}
                      </div>
                      
                      {(isPlacingSignature || isMovingSignature) && (
                        <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-2 rounded shadow-medium">
                          {isPlacingSignature ? "Click on the document to place a signature area" : "Click on the document to move the signature area"}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-96 text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No document loaded</h3>
                      <p className="text-muted-foreground">
                        Upload a PDF file to start signing
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePad
          onComplete={handleSignatureComplete}
          onCancel={() => {
            setShowSignaturePad(false);
            setCurrentSigningArea(null);
          }}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Signed Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to archive this document with the current signatures? 
              You can continue adding more signatures if you choose "Continue Signing".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowArchiveDialog(false)}>
              Continue Signing
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowArchiveDialog(false);
              archiveDocument();
            }}>
              Archive Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};