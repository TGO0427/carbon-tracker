"use client";

import { Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas-pro";

const BRAND_GREEN = "#064e3b";
const LIGHT_GREEN = "#ecfdf5";
const GRAY = "#6b7280";
const DARK = "#111827";

interface ReportData {
  rows?: string[][];
  headers?: string[];
  summary?: string;
}

function drawHeader(pdf: jsPDF, title: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Green header bar
  pdf.setFillColor(6, 78, 59); // #064e3b
  pdf.rect(0, 0, pageWidth, 28, "F");

  // Company name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("Carbon Tracker", 14, 13);

  // Subtitle
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Synercore Holdings (Pty) Ltd", 14, 20);

  // Report title badge
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  const titleWidth = pdf.getTextWidth(title) + 12;
  pdf.setFillColor(16, 185, 129); // emerald-500
  pdf.roundedRect(pageWidth - titleWidth - 14, 8, titleWidth, 12, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, pageWidth - titleWidth - 8, 16);
}

function drawMetadata(pdf: jsPDF, yPos: number): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

  // Light background strip
  pdf.setFillColor(248, 250, 252); // gray-50
  pdf.rect(0, yPos, pageWidth, 10, "F");
  pdf.setDrawColor(229, 231, 235); // gray-200
  pdf.line(0, yPos + 10, pageWidth, yPos + 10);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(107, 114, 128); // gray-500
  pdf.text(`Report generated: ${dateStr} at ${timeStr}`, 14, yPos + 6.5);
  pdf.text("GHG Protocol Compliant", pageWidth - 14, yPos + 6.5, { align: "right" });

  return yPos + 14;
}

function drawFooter(pdf: jsPDF) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const y = pageHeight - 10;

  pdf.setDrawColor(229, 231, 235);
  pdf.line(14, y - 3, pageWidth - 14, y - 3);

  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(156, 163, 175); // gray-400
  pdf.text("Synercore Holdings (Pty) Ltd  |  Carbon Emissions Report  |  Confidential", 14, y);
  pdf.text(`Page ${pdf.getCurrentPageInfo().pageNumber}`, pageWidth - 14, y, { align: "right" });
}

export async function printChartToPdf(
  element: HTMLElement | null,
  title: string,
  data?: ReportData
) {
  if (!element) return;

  // Capture the chart
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    logging: false,
    useCORS: true,
    ignoreElements: (el) => el.classList.contains("print:hidden") || el.tagName === "BUTTON",
  });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Header
  drawHeader(pdf, title);

  // Metadata strip
  let y = drawMetadata(pdf, 28);

  // Summary text
  if (data?.summary) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(55, 65, 81); // gray-700
    pdf.text(data.summary, 14, y + 4);
    y += 10;
  }

  // Chart image — centered with proper aspect ratio
  const maxImgWidth = pageWidth - 28;
  const maxImgHeight = data?.rows ? pageHeight - y - 70 : pageHeight - y - 24;
  const imgAspect = canvas.width / canvas.height;
  let imgW = maxImgWidth;
  let imgH = imgW / imgAspect;
  if (imgH > maxImgHeight) {
    imgH = maxImgHeight;
    imgW = imgH * imgAspect;
  }
  const imgX = (pageWidth - imgW) / 2;

  // Subtle border around chart
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(imgX - 2, y, imgW + 4, imgH + 4, 2, 2, "S");
  pdf.addImage(imgData, "PNG", imgX, y + 2, imgW, imgH);
  y += imgH + 10;

  // Data table (if provided)
  if (data?.rows && data.headers && y < pageHeight - 30) {
    autoTable(pdf, {
      startY: y,
      head: [data.headers],
      body: data.rows,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [17, 24, 39], // gray-900
      },
      headStyles: {
        fillColor: [6, 78, 59], // brand green
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [236, 253, 245], // emerald-50
      },
      tableLineColor: [229, 231, 235],
      tableLineWidth: 0.2,
    });
  }

  // Footer
  drawFooter(pdf);

  pdf.save(`${title.toLowerCase().replace(/\s+/g, "-")}-report.pdf`);
}

export function PrintButton({
  chartRef,
  title,
  getData,
}: {
  chartRef: React.RefObject<HTMLElement | null>;
  title: string;
  getData?: () => ReportData;
}) {
  return (
    <button
      onClick={() => printChartToPdf(chartRef.current, title, getData?.())}
      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors print:hidden"
      title={`Export ${title} to PDF`}
    >
      <Printer className="h-4 w-4" />
    </button>
  );
}
