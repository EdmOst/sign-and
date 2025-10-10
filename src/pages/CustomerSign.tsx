import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Document, Page } from "react-pdf";
import { SignaturePad } from "@/components/SignaturePad";
import { SignatureArea } from "@/components/SignatureArea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, CheckCircle2 } from "lucide-react";

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

export default function CustomerSign() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  const [customerSignatures, setCustomerSignatures] = useState<SignaturePosition[]>([]);
  const [alreadySigned, setAlreadySigned] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDocument();
    }
  }, [token]);

  const fetchDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('share_token', token)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Document not found');
        navigate('/');
        return;
      }

      if (data.customer_signed) {
        setAlreadySigned(true);
      }

      setDocument(data);
      
      // Parse existing signatures to create customer signature areas
      const signatures = Array.isArray(data.signatures) ? data.signatures : [];
      const customerSigs = Array.isArray(data.customer_signatures) ? data.customer_signatures : [];
      
      // If customer already signed, show their signatures
      if (customerSigs.length > 0) {
        const parsedSigs: SignaturePosition[] = customerSigs.map((sig: any) => ({
          id: String(sig.id || ''),
          x: Number(sig.x || 0),
          y: Number(sig.y || 0),
          page: Number(sig.page || 0),
          width: Number(sig.width || 150),
          height: Number(sig.height || 60),
          signature: sig.signature,
          timestamp: sig.timestamp
        }));
        setCustomerSignatures(parsedSigs);
        setCustomerName(data.customer_name || '');
        setCustomerEmail(data.customer_email || '');
      } else {
        // Create signature areas based on original signatures for customer to fill
        setCustomerSignatures(signatures.map((sig: any) => ({
          id: sig.id,
          x: sig.x,
          y: sig.y,
          page: sig.page,
          width: sig.width,
          height: sig.height,
          signature: undefined,
          timestamp: undefined
        })));
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to load document');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureAreaClick = (id: string) => {
    if (alreadySigned) {
      toast.info('This document has already been signed');
      return;
    }
    setActiveSignatureId(id);
    setShowSignaturePad(true);
  };

  const handleSignatureComplete = (signatureDataUrl: string) => {
    if (!activeSignatureId) return;

    setCustomerSignatures(prev =>
      prev.map(sig =>
        sig.id === activeSignatureId
          ? {
              ...sig,
              signature: signatureDataUrl,
              timestamp: new Date().toISOString()
            }
          : sig
      )
    );

    setShowSignaturePad(false);
    setActiveSignatureId(null);
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    const unsignedAreas = customerSignatures.filter(sig => !sig.signature);
    if (unsignedAreas.length > 0) {
      toast.error(`Please sign all ${customerSignatures.length} required areas`);
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          customer_signed: true,
          customer_signed_at: new Date().toISOString(),
          customer_name: customerName,
          customer_email: customerEmail,
          customer_signatures: JSON.parse(JSON.stringify(customerSignatures))
        })
        .eq('share_token', token);

      if (error) throw error;

      toast.success('Document signed successfully!');
      setAlreadySigned(true);
    } catch (error) {
      console.error('Error signing document:', error);
      toast.error('Failed to sign document');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Document not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {alreadySigned ? 'Signed Document' : 'Document Signing Request'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alreadySigned ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">This document has been signed by {document.customer_name}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Your Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please sign all required areas on the document below
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <Document
                file={`data:application/pdf;base64,${document.pdf_data}`}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                }
              >
                <div className="relative">
                  <Page
                    pageNumber={currentPage}
                    width={Math.min(800, window.innerWidth - 100)}
                    className="shadow-soft border rounded"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                  {customerSignatures
                    .filter(sig => sig.page === currentPage - 1)
                    .map(sig => (
                      <SignatureArea
                        key={sig.id}
                        position={sig}
                        onClick={() => handleSignatureAreaClick(sig.id)}
                        onDelete={undefined}
                        onMove={undefined}
                        onDrag={undefined}
                      />
                    ))}
                </div>
              </Document>

              {numPages > 1 && (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                    disabled={currentPage === numPages}
                  >
                    Next
                  </Button>
                </div>
              )}

              {!alreadySigned && (
                <Button onClick={handleSubmit} size="lg" className="w-full md:w-auto">
                  Submit Signed Document
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {showSignaturePad && (
        <SignaturePad
          onComplete={handleSignatureComplete}
          onCancel={() => {
            setShowSignaturePad(false);
            setActiveSignatureId(null);
          }}
        />
      )}
    </div>
  );
}
