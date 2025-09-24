import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanySettings {
  id: string;
  logo_url?: string;
  company_name: string;
}

interface LogoUploadProps {
  settings: CompanySettings | null;
  onSettingsUpdate: (settings: CompanySettings) => void;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({ settings, onSettingsUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [companyName, setCompanyName] = useState(settings?.company_name || 'PDF Signer');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Set maximum dimensions
        const maxWidth = 200;
        const maxHeight = 80;
        
        let { width, height } = img;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and resize image
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png', 0.9);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Resize image
      const resizedBlob = await resizeImage(file);
      
      // Generate unique filename
      const fileExt = 'png';
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, resizedBlob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      const logoUrl = urlData.publicUrl;

      // Update company settings in database
      if (settings) {
        const { data, error } = await supabase
          .from('company_settings')
          .update({ 
            logo_url: logoUrl,
            updated_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        onSettingsUpdate(data);
      } else {
        // Create new settings record
        const { data, error } = await supabase
          .from('company_settings')
          .insert({ 
            logo_url: logoUrl,
            company_name: companyName,
            updated_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();

        if (error) throw error;
        onSettingsUpdate(data);
      }

      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings?.logo_url) return;

    setUploading(true);
    try {
      // Extract filename from URL
      const url = new URL(settings.logo_url);
      const fileName = url.pathname.split('/').pop();
      
      if (fileName) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('logos')
          .remove([fileName]);

        if (deleteError) {
          console.error('Error deleting file from storage:', deleteError);
          // Continue even if file deletion fails
        }
      }

      // Update database to remove logo URL
      const { data, error } = await supabase
        .from('company_settings')
        .update({ 
          logo_url: null,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      onSettingsUpdate(data);

      toast.success('Logo removed successfully');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateCompanyName = async () => {
    if (!settings) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .update({ 
          company_name: companyName,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      onSettingsUpdate(data);

      toast.success('Company name updated successfully');
    } catch (error) {
      console.error('Error updating company name:', error);
      toast.error('Failed to update company name');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Company Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <div className="flex gap-2">
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
            />
            <Button 
              onClick={handleUpdateCompanyName} 
              disabled={updating || companyName === settings?.company_name}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
            </Button>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>Company Logo</Label>
          <p className="text-sm text-muted-foreground">
            Upload a logo image (PNG, JPG). Will be automatically resized to fit (max 200x80px).
          </p>
          
          {settings?.logo_url && (
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <img 
                src={settings.logo_url} 
                alt="Company Logo" 
                className="max-h-16 max-w-32 object-contain"
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Replace
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          )}

          {!settings?.logo_url && (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">No logo uploaded</p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Logo
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
};