import React, { useState, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileText, Calendar, Search } from "lucide-react";
import { SignaturePad } from "./SignaturePad";
import { DocumentArchive } from "./DocumentArchive";
import { SignatureArea } from "./SignatureArea";
import { toast } from "sonner";
import { PDFDocument, rgb } from "pdf-lib";
import { cn } from "@/lib/utils";

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
  originalFile: ArrayBuffer;
  signedFile?: ArrayBuffer;
  signatures: SignaturePosition[];
}

export const PDFSigner: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [signaturePositions, setSignaturePositions] = useState<SignaturePosition[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
  const [currentSigningArea, setCurrentSigningArea] = useState<string | null>(null);
  const [signedDocuments, setSignedDocuments] = useState<SignedDocument[]>(() => {
    const saved = localStorage.getItem('pdf-signer-documents');
    return saved ? JSON.parse(saved) : [];
  });
  const [showArchive, setShowArchive] = useState<boolean>(false);
  const [isPlacingSignature, setIsPlacingSignature] = useState<boolean>(false);
  const [isMovingSignature, setIsMovingSignature] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

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
      setPdfFile(file);
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

  const handleMoveSignatureArea = (areaId: string) => {
    setIsMovingSignature(areaId);
    setIsPlacingSignature(false);
    toast.info("Click on document to move signature area");
  };

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
  };

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

      // Archive the document
      const signedDoc: SignedDocument = {
        id: `doc-${Date.now()}`,
        name: pdfFile.name,
        signedAt: new Date(),
        originalFile: arrayBuffer,
        signedFile: pdfBytes,
        signatures: signaturePositions.filter(sig => sig.signature),
      };

      const newDocuments = [signedDoc, ...signedDocuments];
      setSignedDocuments(newDocuments);
      localStorage.setItem('pdf-signer-documents', JSON.stringify(newDocuments));
      toast.success("Document signed and downloaded successfully!");
    } catch (error) {
      console.error("Error signing PDF:", error);
      toast.error("Failed to sign PDF. Please try again.");
    }
  };

  const canDownload = signaturePositions.some(pos => pos.signature);

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
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowArchive(!showArchive)}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Document Archive
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
              {pdfFile && (
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
                        <Button
                          onClick={handleDownloadSigned}
                          variant="success"
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Signed PDF
                        </Button>
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
                  {pdfFile ? (
                    <div className="relative">
                      <div 
                        ref={pageRef}
                        className={cn(
                          "relative inline-block",
                          isPlacingSignature || isMovingSignature ? 'cursor-crosshair' : 'cursor-default'
                        )}
                        onClick={handlePageClick}
                      >
                        <Document 
                          file={pdfFile} 
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading={<div>Loading PDF...</div>}
                          error={<div>Error loading PDF. Please try another file.</div>}
                        >
                          <Page
                            pageNumber={currentPage}
                            width={Math.min(800, window.innerWidth - 400)}
                            className="shadow-soft border rounded"
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
                              onMove={!position.signature ? () => handleMoveSignatureArea(position.id) : undefined}
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
    </div>
  );
};