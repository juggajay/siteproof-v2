import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ITPFormType, FORM_TYPE_LABELS } from '../types/form.types';
import { format } from 'date-fns';

export class PDFGenerator {
  async generateFormPDF(form: ITPFormType): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let yPosition = height - 50;
    
    // Header
    page.drawText('ITP COMPLIANCE DOCUMENT', {
      x: 50,
      y: yPosition,
      size: 20,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= 30;
    
    // Form Type
    page.drawText(FORM_TYPE_LABELS[form.formType] || form.formType, {
      x: 50,
      y: yPosition,
      size: 16,
      font: helveticaFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    yPosition -= 40;
    
    // Basic Information
    this.addField(page, 'Project ID:', form.projectId, 50, yPosition, timesRomanFont);
    yPosition -= 25;
    
    this.addField(page, 'Inspector:', form.inspectorName, 50, yPosition, timesRomanFont);
    yPosition -= 25;
    
    this.addField(
      page, 
      'Inspection Date:', 
      format(form.inspectionDate, 'PPP'), 
      50, 
      yPosition, 
      timesRomanFont
    );
    yPosition -= 25;
    
    this.addField(
      page, 
      'Status:', 
      form.inspectionStatus.toUpperCase(), 
      50, 
      yPosition, 
      timesRomanFont,
      this.getStatusColor(form.inspectionStatus)
    );
    yPosition -= 40;
    
    // Form-specific fields
    yPosition = await this.addFormSpecificFields(page, form, yPosition, timesRomanFont);
    
    // Comments
    if (form.comments) {
      page.drawText('Comments:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      const lines = this.wrapText(form.comments, 80);
      for (const line of lines) {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      }
    }
    
    // Footer
    const footerY = 50;
    page.drawText(
      `Generated on ${format(new Date(), 'PPP')}`,
      {
        x: 50,
        y: footerY,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      }
    );
    
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }
  
  private addField(
    page: any,
    label: string,
    value: string,
    x: number,
    y: number,
    font: any,
    valueColor = rgb(0, 0, 0)
  ) {
    page.drawText(label, {
      x,
      y,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(value, {
      x: x + 120,
      y,
      size: 12,
      font,
      color: valueColor,
    });
  }
  
  private getStatusColor(status: string) {
    switch (status) {
      case 'approved':
        return rgb(0, 0.5, 0);
      case 'rejected':
        return rgb(0.8, 0, 0);
      default:
        return rgb(0.5, 0.5, 0);
    }
  }
  
  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length > maxCharsPerLine) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    
    return lines;
  }
  
  private async addFormSpecificFields(
    page: any,
    form: ITPFormType,
    yPosition: number,
    font: any
  ): Promise<number> {
    switch (form.formType) {
      case 'earthworks_preconstruction':
        this.addField(
          page,
          'Approved Plans:',
          form.approvedPlansAvailable ? 'Yes' : 'No',
          50,
          yPosition,
          font
        );
        yPosition -= 25;
        
        if (form.startDateAdvised) {
          this.addField(
            page,
            'Start Date Advised:',
            format(form.startDateAdvised, 'PP'),
            50,
            yPosition,
            font
          );
          yPosition -= 25;
        }
        
        this.addField(
          page,
          'Erosion Control:',
          form.erosionControlImplemented ? 'Implemented' : 'Not Implemented',
          50,
          yPosition,
          font
        );
        yPosition -= 25;
        
        if (form.holdPointSignature) {
          page.drawText('Hold Point: Signed', {
            x: 50,
            y: yPosition,
            size: 12,
            font,
            color: rgb(0, 0.5, 0),
          });
          yPosition -= 25;
        }
        break;
        
      case 'earthworks_subgrade':
        this.addField(
          page,
          'Erosion Controls:',
          form.erosionControlsInPlace ? 'In Place' : 'Not In Place',
          50,
          yPosition,
          font
        );
        yPosition -= 25;
        
        if (form.compactionPercentage) {
          this.addField(
            page,
            'Compaction:',
            `${form.compactionPercentage}%`,
            50,
            yPosition,
            font,
            form.compactionPercentage >= 95 ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0)
          );
          yPosition -= 25;
        }
        break;
        
      // Add other form types as needed...
    }
    
    return yPosition - 20;
  }
  
  async downloadPDF(form: ITPFormType, filename?: string) {
    const pdfBytes = await this.generateFormPDF(form);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `ITP_${form.formType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
}

export const pdfGenerator = new PDFGenerator();