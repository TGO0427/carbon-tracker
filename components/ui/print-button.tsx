"use client";

import { Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function printChartToPdf(element: HTMLElement | null, title: string) {
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height / canvas.width) * imgWidth;
  pdf.setFontSize(16);
  pdf.text(title, 10, 15);
  pdf.setFontSize(9);
  pdf.setTextColor(150);
  pdf.text(`Generated ${new Date().toLocaleDateString()}`, 10, 21);
  const yOffset = 28;
  const finalHeight = Math.min(imgHeight, pageHeight - yOffset - 10);
  pdf.addImage(imgData, "PNG", 10, yOffset, imgWidth, finalHeight);
  pdf.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

export function PrintButton({ chartRef, title }: { chartRef: React.RefObject<HTMLElement | null>; title: string }) {
  return (
    <button
      onClick={() => printChartToPdf(chartRef.current, title)}
      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors print:hidden"
      title={`Export ${title} to PDF`}
    >
      <Printer className="h-4 w-4" />
    </button>
  );
}
