import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import { numberToWords } from './numberToWords';

interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  custom_text?: string;
  subtotal: number;
  discount_percentage?: number;
  discount_amount?: number;
  total_vat: number;
  total: number;
  invoice_customers: {
    name: string;
    address: string;
    vat_number?: string;
    email?: string;
  };
  invoice_items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    subtotal: number;
    vat_amount: number;
    total: number;
    product_code?: string;
    barcode?: string;
  }>;
}

interface CompanySettings {
  company_name: string;
  address: string;
  vat_number?: string;
  iban?: string;
  bic?: string;
  logo_url?: string;
  payment_terms?: string;
  legal_notes?: string;
  show_product_codes?: boolean;
  show_barcodes?: boolean;
  issuer_first_name?: string;
  issuer_last_name?: string;
  issuer_role?: string;
  issuer_email?: string;
  issuer_phone?: string;
}

// Helper function to sanitize text for WinAnsi encoding
function sanitizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\xFF]/g, '');
}

export async function generateInvoicePDF(
  invoiceData: InvoiceData,
  companySettings: CompanySettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50;
  const leftMargin = 50;
  const rightMargin = width - 50;
  
  // Company Header
  page.drawText(sanitizeText(companySettings.company_name), {
    x: leftMargin,
    y: yPosition,
    size: 20,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 25;
  
  const companyLines = companySettings.address.split('\n');
  companyLines.forEach(line => {
    page.drawText(sanitizeText(line), {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 15;
  });
  
  if (companySettings.vat_number) {
    page.drawText(sanitizeText(`VAT: ${companySettings.vat_number}`), {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 20;
  }
  
  // Invoice Number and Date (right side)
  yPosition = height - 50;
  page.drawText('INVOICE', {
    x: rightMargin - 150,
    y: yPosition,
    size: 24,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 30;
  page.drawText(`Invoice #: ${invoiceData.invoice_number}`, {
    x: rightMargin - 200,
    y: yPosition,
    size: 11,
    font: fontBold,
  });
  
  yPosition -= 20;
  page.drawText(`Issue Date: ${format(new Date(invoiceData.issue_date), 'dd/MM/yyyy')}`, {
    x: rightMargin - 200,
    y: yPosition,
    size: 10,
    font,
  });
  
  yPosition -= 15;
  page.drawText(`Due Date: ${format(new Date(invoiceData.due_date), 'dd/MM/yyyy')}`, {
    x: rightMargin - 200,
    y: yPosition,
    size: 10,
    font,
  });
  
  // Customer Information
  yPosition -= 60;
  page.drawText('Bill To:', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: fontBold,
  });
  
  yPosition -= 20;
  page.drawText(invoiceData.invoice_customers.name, {
    x: leftMargin,
    y: yPosition,
    size: 11,
    font: fontBold,
  });
  
  yPosition -= 15;
  const customerAddressLines = invoiceData.invoice_customers.address.split('\n');
  customerAddressLines.forEach(line => {
    page.drawText(line, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font,
    });
    yPosition -= 15;
  });
  
  if (invoiceData.invoice_customers.vat_number) {
    page.drawText(`VAT: ${invoiceData.invoice_customers.vat_number}`, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font,
    });
    yPosition -= 15;
  }
  
  if (invoiceData.invoice_customers.email) {
    page.drawText(`Email: ${invoiceData.invoice_customers.email}`, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font,
    });
    yPosition -= 15;
  }
  
  // Items Table
  yPosition -= 30;
  
  // Table Header
  const tableTop = yPosition;
  let xPosition = leftMargin;
  
  page.drawRectangle({
    x: leftMargin,
    y: yPosition - 20,
    width: rightMargin - leftMargin,
    height: 25,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  const headers = ['Item', 'Qty', 'Unit Price', 'VAT %', 'Total'];
  const columnWidths = [250, 50, 80, 60, 80];
  
  if (companySettings.show_product_codes) {
    headers.unshift('Code');
    columnWidths.unshift(60);
  }
  
  xPosition = leftMargin + 5;
  headers.forEach((header, i) => {
    page.drawText(header, {
      x: xPosition,
      y: yPosition - 13,
      size: 10,
      font: fontBold,
    });
    xPosition += columnWidths[i];
  });
  
  yPosition -= 30;
  
  // Table Rows
  invoiceData.invoice_items.forEach(item => {
    xPosition = leftMargin + 5;
    
    if (companySettings.show_product_codes && item.product_code) {
      page.drawText(sanitizeText(item.product_code.substring(0, 10)), {
        x: xPosition,
        y: yPosition,
        size: 9,
        font,
      });
      xPosition += 60;
    } else if (companySettings.show_product_codes) {
      xPosition += 60;
    }
    
    page.drawText(sanitizeText(item.name.substring(0, 35)), {
      x: xPosition,
      y: yPosition,
      size: 9,
      font,
    });
    xPosition += 250;
    
    page.drawText(item.quantity.toString(), {
      x: xPosition,
      y: yPosition,
      size: 9,
      font,
    });
    xPosition += 50;
    
    page.drawText(`€${Number(item.unit_price).toFixed(2)}`, {
      x: xPosition,
      y: yPosition,
      size: 9,
      font,
    });
    xPosition += 80;
    
    page.drawText(`${Number(item.vat_rate).toFixed(0)}%`, {
      x: xPosition,
      y: yPosition,
      size: 9,
      font,
    });
    xPosition += 60;
    
    page.drawText(`€${Number(item.total).toFixed(2)}`, {
      x: xPosition,
      y: yPosition,
      size: 9,
      font,
    });
    
    yPosition -= 20;
    
    if (item.description) {
      page.drawText(sanitizeText(item.description.substring(0, 70)), {
        x: leftMargin + (companySettings.show_product_codes ? 65 : 5),
        y: yPosition,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 20;
    }
  });
  
  // Totals
  yPosition -= 20;
  const totalsX = rightMargin - 180;
  
  page.drawText('Subtotal:', {
    x: totalsX,
    y: yPosition,
    size: 10,
    font,
  });
  page.drawText(`€${Number(invoiceData.subtotal).toFixed(2)}`, {
    x: totalsX + 100,
    y: yPosition,
    size: 10,
    font,
  });
  
  // Discount if present
  if (invoiceData.discount_amount && invoiceData.discount_amount > 0) {
    yPosition -= 20;
    const discountText = invoiceData.discount_percentage 
      ? `Discount (${invoiceData.discount_percentage}%):` 
      : 'Discount:';
    page.drawText(discountText, {
      x: totalsX,
      y: yPosition,
      size: 10,
      font,
    });
    page.drawText(`-€${Number(invoiceData.discount_amount).toFixed(2)}`, {
      x: totalsX + 100,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.8, 0, 0),
    });
  }
  
  yPosition -= 20;
  page.drawText('Total VAT:', {
    x: totalsX,
    y: yPosition,
    size: 10,
    font,
  });
  page.drawText(`€${Number(invoiceData.total_vat).toFixed(2)}`, {
    x: totalsX + 100,
    y: yPosition,
    size: 10,
    font,
  });
  
  yPosition -= 25;
  page.drawRectangle({
    x: totalsX - 5,
    y: yPosition - 5,
    width: 180,
    height: 25,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  page.drawText('TOTAL:', {
    x: totalsX,
    y: yPosition,
    size: 12,
    font: fontBold,
  });
  page.drawText(`€${Number(invoiceData.total).toFixed(2)}`, {
    x: totalsX + 100,
    y: yPosition,
    size: 12,
    font: fontBold,
  });
  
  // Total in words
  yPosition -= 25;
  const totalInWords = numberToWords(Number(invoiceData.total));
  page.drawText(sanitizeText(totalInWords), {
    x: totalsX,
    y: yPosition,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  // Payment Information
  yPosition -= 50;
  
  if (companySettings.payment_terms) {
    page.drawText('Payment Terms:', {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: fontBold,
    });
    yPosition -= 15;
    page.drawText(sanitizeText(companySettings.payment_terms), {
      x: leftMargin,
      y: yPosition,
      size: 9,
      font,
    });
    yPosition -= 20;
  }
  
  if (companySettings.iban) {
    page.drawText(sanitizeText(`IBAN: ${companySettings.iban}`), {
      x: leftMargin,
      y: yPosition,
      size: 9,
      font,
    });
    yPosition -= 15;
  }
  
  if (companySettings.bic) {
    page.drawText(sanitizeText(`BIC/SWIFT: ${companySettings.bic}`), {
      x: leftMargin,
      y: yPosition,
      size: 9,
      font,
    });
    yPosition -= 20;
  }
  
  // Custom Text
  if (invoiceData.custom_text) {
    yPosition -= 10;
    page.drawText('Notes:', {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: fontBold,
    });
    yPosition -= 15;
    
    const customTextLines = invoiceData.custom_text.split('\n');
    customTextLines.forEach(line => {
      page.drawText(sanitizeText(line.substring(0, 80)), {
        x: leftMargin,
        y: yPosition,
        size: 9,
        font,
      });
      yPosition -= 12;
    });
  }
  
  // Invoice Issuer Info (Footer)
  yPosition = 80;
  if (companySettings.issuer_first_name && companySettings.issuer_last_name) {
    const issuerName = `${companySettings.issuer_first_name} ${companySettings.issuer_last_name}`;
    page.drawText(sanitizeText(issuerName), {
      x: leftMargin,
      y: yPosition,
      size: 9,
      font: fontBold,
    });
    yPosition -= 12;
    
    if (companySettings.issuer_role) {
      page.drawText(sanitizeText(companySettings.issuer_role), {
        x: leftMargin,
        y: yPosition,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 12;
    }
    
    if (companySettings.issuer_email) {
      page.drawText(sanitizeText(companySettings.issuer_email), {
        x: leftMargin,
        y: yPosition,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 12;
    }
    
    if (companySettings.issuer_phone) {
      page.drawText(sanitizeText(companySettings.issuer_phone), {
        x: leftMargin,
        y: yPosition,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 15;
    }
  }
  
  // Legal Notes
  if (companySettings.legal_notes) {
    if (yPosition < 50) yPosition = 50;
    page.drawText(sanitizeText(companySettings.legal_notes.substring(0, 100)), {
      x: leftMargin,
      y: yPosition,
      size: 7,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
