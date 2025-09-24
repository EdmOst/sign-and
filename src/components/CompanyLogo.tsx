import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanySettings {
  id: string;
  logo_url?: string;
  company_name: string;
}

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({ 
  className = '', 
  size = 'md', 
  showName = false 
}) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 max-w-24';
      case 'lg':
        return 'h-16 max-w-48';
      default:
        return 'h-12 max-w-32';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-lg';
      case 'lg':
        return 'text-3xl';
      default:
        return 'text-xl';
    }
  };

  if (settings?.logo_url) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img 
          src={settings.logo_url} 
          alt={settings.company_name || 'Company Logo'} 
          className={`object-contain ${getSizeClasses()}`}
        />
        {showName && (
          <span className={`font-semibold ${getTextSizeClasses()}`}>
            {settings.company_name}
          </span>
        )}
      </div>
    );
  }

  // Fallback to company name or default
  return (
    <div className={`flex items-center ${className}`}>
      <span className={`font-bold ${getTextSizeClasses()}`}>
        {settings?.company_name || 'PDF Signer'}
      </span>
    </div>
  );
};