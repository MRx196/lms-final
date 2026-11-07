import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface CertificatePdfData {
  studentName: string;
  courseTitle: string;
  certificateCode: string;
  issuedAt?: string | null;
  brandName?: string;
}

/** Generate and download a PDF certificate with an embedded verification QR code. */
export async function downloadCertificatePdf(data: CertificatePdfData): Promise<void> {
  const brand = data.brandName || 'LMS';
  const verifyUrl = `${window.location.origin}/verify-certificate/${encodeURIComponent(data.certificateCode)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 240, margin: 1, color: { dark: '#047857' } });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Border
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.4);
  doc.rect(13, 13, W - 26, H - 26);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(4, 120, 87);
  doc.text(brand.toUpperCase(), W / 2, 32, { align: 'center' });

  doc.setFontSize(30);
  doc.setTextColor(24, 24, 27);
  doc.text('Certificate of Completion', W / 2, 58, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(113, 113, 122);
  doc.text('This is to certify that', W / 2, 74, { align: 'center' });

  // Recipient
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(9, 9, 11);
  const name = data.studentName || 'Student';
  doc.text(name, W / 2, 92, { align: 'center' });

  // Rule
  doc.setDrawColor(212, 212, 216);
  doc.setLineWidth(0.3);
  doc.line(W / 2 - 45, 98, W / 2 + 45, 98);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(113, 113, 122);
  doc.text('has successfully completed the course', W / 2, 108, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27);
  const course = data.courseTitle || 'Course';
  const courseLines = doc.splitTextToSize(course, W - 140);
  doc.text(courseLines, W / 2, 122, { align: 'center' });

  // Footer details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(113, 113, 122);
  const issued = data.issuedAt ? new Date(data.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  doc.text(`Issued on ${issued}`, W / 2 - 60, H - 30, { align: 'center' });
  doc.setFont('courier', 'normal');
  doc.text(`Code: ${data.certificateCode}`, W / 2 - 60, H - 22, { align: 'center' });
  doc.text(verifyUrl, W / 2 - 60, H - 15, { align: 'center' });

  // QR code
  const qrSize = 34;
  doc.addImage(qrDataUrl, 'PNG', W - 55, H - 62, qrSize, qrSize);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('Scan to verify', W - 38, H - 24, { align: 'center' });

  doc.save(`certificate-${data.certificateCode}.pdf`);
}
