import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  async exportElementAsPdf(element: HTMLElement, filename: string) {
    if (!element) {
      console.warn('PdfExportService: element is null');
      return;
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 0;
    let remainingHeight = imgHeight;

    // Simple multipage support if the result is tall
    while (remainingHeight > 0) {
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      remainingHeight -= pageHeight;

      if (remainingHeight > 0) {
        pdf.addPage();
        position = 0;
      }
    }

    const safeName = (filename || 'experiment-results').replace(/\s+/g, '_');
    pdf.save(safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);
  }
}
