import React from "react";

interface CopyrightProps {
  className?: string;
}

export const Copyright: React.FC<CopyrightProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();
  const startYear = 2024;
  const yearText = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;

  return (
    <div className={`text-center text-sm text-muted-foreground ${className}`}>
      © {yearText} All rights reserved Webprojekti.lv
    </div>
  );
};