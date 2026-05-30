"use client";

import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

type ReportData = {
  name: string;
  report_type: string;
  cover_title?: string;
  report_type_label?: string;
  report_style?: string;
  language?: string;
  input: {
    birth_date: string;
    birth_time: string;
    birth_place: string;
  };
  current_mahadasha?: {
    planet: string;
    start: string;
    end: string;
    years: number;
  };
  chart?: Record<string, any>;
  transits?: {
    date: string;
    ayanamsa: string;
    transits: Record<string, any>;
  };
  dasha_timeline?: Array<{
    planet: string;
    start: string;
    end: string;
    years: number;
  }>;
  report: string;
};

const getReportStyleLabel = (style: string) => {
  if (style === "consultation") return "Personal Consultation";
  if (style === "full_plus_consultation") return "Complete + Consultation";
  return "Complete Astrology";
};

const getCoverTitle = (style: string) => {
  if (style === "consultation") return "Personal Consultation Report";
  if (style === "full_plus_consultation") {
    return "Complete Astrology Report + Personal Consultation";
  }

  return "Complete Astrology Report";
};

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    birth_date: "",
    birth_time: "",
    birth_place: "",
    report_type: "premium",
    report_style: "full",
    language: "english",
    current_concern: "general",
    employment_status: "not_selected",
    relationship_status: "not_selected",
    main_question: "",
  });

  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBirthDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value.replace(/\D/g, "");

    if (value.length > 2) {
      value = value.slice(0, 2) + "/" + value.slice(2);
    }

    if (value.length > 5) {
      value = value.slice(0, 5) + "/" + value.slice(5);
    }

    setFormData({
      ...formData,
      birth_date: value,
    });
  };

  const sendReport = async (
    reportType = formData.report_type,
    paymentToken: string | null = null
  ) => {
    const payload = {
      ...formData,
      report_type: reportType,
      payment_token: paymentToken,
    };

    try {
      setLoading(true);
      setErrorMessage("");
      setReport(null);
      console.log("REQUEST PAYLOAD:", payload);

      const response = await axios.post(
        `${API_BASE_URL}/generate-report`,
        payload,
        { timeout: 180000 }
      );

      console.log("REPORT RESPONSE:", response.data);
      setReport(response.data);
    } catch (error) {
      console.error(error);
      setErrorMessage("Error generating report. Check backend and browser console.");
      alert("Error generating report. Check backend and console.");
      console.log("FULL ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    console.log("Generate Report clicked", formData);

    const dateRegex =
      /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(19|20)\d\d$/;

    if (!dateRegex.test(formData.birth_date)) {
      alert("Please enter Date of Birth as DD/MM/YYYY");
      return;
    }

    if (formData.report_type.toLowerCase().trim() === "premium") {
      await generatePremiumReport();
      return;
    }

    await sendReport();
  };

  const generatePremiumReport = async () => {
    try {
      setLoading(true);

      const orderResponse = await axios.post(
        `${API_BASE_URL}/create-payment-order`,
        {
          report_style: formData.report_style,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const { order_id, amount, currency, key } = orderResponse.data;

      if (!(window as any).Razorpay) {
        alert("Razorpay script not loaded");
        return;
      }

      const options = {
        key,
        amount,
        currency,
        name: "Shrivinayaka AI Astrology",
        description: "Premium Astrology Report",
        order_id,
        handler: async function (response: any) {

          const verifyResponse = await axios.post(
            `${API_BASE_URL}/verify-payment`,
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }
          );

          if (verifyResponse.data.success) {
            await sendReport("premium", verifyResponse.data.payment_token);
          } else {
            alert("Payment verification failed");
          }
        },
        theme: {
          color: "#7c3aed",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error(error);
      alert("Payment initialization failed");
    } finally {
      setLoading(false);
    }
  };

  const formatReportMarkdown = (text: string) =>
    text
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return line;
        }

        if (
          trimmed.startsWith("#") ||
          trimmed.startsWith("- ") ||
          trimmed.startsWith("• ") ||
          /^\d+\./.test(trimmed)
        ) {
          return line;
        }

        if (
          trimmed.endsWith(":") &&
          trimmed.length <= 60
        ) {
          return `### ${trimmed.replace(/:$/, "")}`;
        }

        return line;
      })
      .join("\n");

  const downloadPDF = async () => {
    if (!report) {
      alert("Report not found");
      return;
    }

    setPdfLoading(true);

    const hasDevanagari = /[\u0900-\u097F]/.test(report.report);

    try {
      if (report.language?.toLowerCase() === "hindi" || hasDevanagari) {
      const escapeHtml = (value: string) =>
        value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const formatLabel = (value?: string) => {
        if (!value) {
          return "-";
        }

        if (value.toLowerCase() === "hindi") {
          return "Hindi";
        }

        if (value.toLowerCase() === "hinglish") {
          return "Hinglish";
        }

        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      };

      const markdownToHtml = (markdown: string) =>
        markdown
          .split("\n")
          .map((line) => {
            const trimmed = line.trim();

            if (!trimmed) {
              return "<div class=\"gap\"></div>";
            }

            if (trimmed.startsWith("# ")) {
              return `<h1>${escapeHtml(trimmed.replace(/^#\s+/, ""))}</h1>`;
            }

            if (trimmed.startsWith("## ")) {
              const heading = escapeHtml(trimmed.replace(/^##\s+/, ""));
              const className = heading.includes("PART 2")
                ? " class=\"part-heading\""
                : "";

              return `<h2${className}>${heading}</h2>`;
            }

            if (trimmed.startsWith("### ")) {
              return `<h3>${escapeHtml(trimmed.replace(/^###\s+/, ""))}</h3>`;
            }

            if (trimmed.startsWith("#### ")) {
              return `<h4>${escapeHtml(trimmed.replace(/^####\s+/, ""))}</h4>`;
            }

            if (trimmed.startsWith("- ")) {
              return `<p class="bullet">&#8226; ${escapeHtml(trimmed.replace(/^-\s+/, ""))}</p>`;
            }

            return `<p>${escapeHtml(trimmed)}</p>`;
          })
          .join("");

      const chartHtml = report.chart
        ? `
          <section class="pdf-section">
            <h2>Planetary Positions</h2>
            <div class="pdf-grid">
              ${Object.entries(report.chart)
                .map(
                  ([planet, data]: any) => `
                    <div class="pdf-card">
                      <strong>${escapeHtml(planet)}</strong>
                      <span>${escapeHtml(data.sign ?? "-")}</span>
                      <small>${escapeHtml(data.degree ?? "")} | House ${escapeHtml(String(data.house ?? "-"))}</small>
                    </div>
                  `
                )
                .join("")}
            </div>
          </section>
        `
        : "";

      const transitsHtml = report.transits?.transits
        ? `
          <section class="pdf-section">
            <h2>Current Transits</h2>
            <div class="pdf-grid">
              ${Object.entries(report.transits.transits)
                .map(
                  ([planet, data]: any) => `
                    <div class="pdf-card">
                      <strong>${escapeHtml(planet)}</strong>
                      <span>${escapeHtml(data.sign ?? "-")}</span>
                      <small>${escapeHtml(planet)} in ${escapeHtml(String(data.house_from_ascendant ?? "-"))}th House</small>
                      <small>${escapeHtml(String(data.house_from_moon ?? "-"))}th House from Moon</small>
                    </div>
                  `
                )
                .join("")}
            </div>
          </section>
        `
        : "";

      const dashaTimelineHtml = report.dasha_timeline
        ? `
          <section class="pdf-section">
            <h2>Mahadasha Timeline</h2>
            <div class="pdf-list">
              ${report.dasha_timeline
                .map(
                  (dasha) => `
                    <p>
                      <strong>${escapeHtml(dasha.planet)}</strong>
                      ${escapeHtml(dasha.start)} to ${escapeHtml(dasha.end)}
                    </p>
                  `
                )
                .join("")}
            </div>
          </section>
        `
        : "";

      const html2canvasModule = await import("html2canvas");
      const jsPDFModule = await import("jspdf");
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      const pdfElement = document.createElement("div");
      pdfElement.style.position = "fixed";
      pdfElement.style.left = "-10000px";
      pdfElement.style.top = "0";
      pdfElement.style.width = "794px";
      pdfElement.style.padding = "0";
      pdfElement.style.backgroundColor = "#ffffff";
      pdfElement.style.color = "#202024";
      pdfElement.style.fontFamily =
        '"Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif';
      pdfElement.style.fontSize = "15px";
      pdfElement.style.lineHeight = "1.72";

      pdfElement.innerHTML = `
        <style>
          .pdf-header {
            text-align: center;
            padding: 56px 0 52px;
            margin: 0 0 64px;
            border-bottom: 14px solid #7c3aed;
            background: #21113d;
            border-radius: 0;
          }

          .pdf-brand {
            margin: 0;
            padding: 0;
            color: #f5f0ff;
            font-size: 38px;
            font-weight: 700;
            line-height: 1.25;
            text-align: center;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .pdf-subtitle {
            margin: 22px 0 0;
            padding: 0;
            color: #ded6f4;
            font-size: 18px;
            font-weight: 400;
            line-height: 1.35;
            text-align: center;
          }

          .pdf-content .pdf-header .pdf-brand {
            margin: 0;
            padding: 0;
            color: #f5f0ff;
            font-size: 38px;
            font-weight: 700;
            line-height: 1.25;
            text-align: center;
          }

          .pdf-content .pdf-header .pdf-subtitle {
            margin: 22px 0 0;
            padding: 0;
            color: #ded6f4;
            font-size: 18px;
            font-weight: 400;
            line-height: 1.35;
            text-align: center;
          }

          .pdf-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px 80px;
            margin: 0 auto 38px;
            max-width: 640px;
            padding: 28px 32px;
            border: 1px solid #ddd6fe;
            background: #f3edff;
            border-radius: 12px;
            box-shadow: none;
          }

          .pdf-info p {
            margin: 0;
            padding: 0;
            border-radius: 0;
            background: transparent;
            border: 0;
          }

          .pdf-info strong {
            display: block;
            margin-bottom: 4px;
            color: #5f5b68;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }

          .pdf-section {
            margin: 26px 0;
          }

          .pdf-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .pdf-card {
            padding: 12px;
                border: 1px solid #e5e0f5;
                border-radius: 8px;
                background: #fbfbfd;
                break-inside: avoid;
              }

          .pdf-card strong,
          .pdf-card span,
          .pdf-card small {
            display: block;
          }

          .pdf-card strong {
            color: #202024;
            font-size: 16px;
            text-transform: uppercase;
          }

          .pdf-card span {
            margin-top: 5px;
            color: #333333;
            font-size: 18px;
            font-weight: 600;
          }

          .pdf-card small {
            margin-top: 5px;
            color: #66606f;
            font-size: 14px;
            line-height: 1.5;
          }

          .pdf-list p {
            margin: 0 0 6px;
            padding-bottom: 6px;
            border-bottom: 1px solid #eeeaf8;
            break-inside: avoid;
          }

          .pdf-content h1 {
            margin: 30px 0 20px;
            padding: 18px 0 8px;
            color: #750606;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.7;
            break-after: avoid;
            box-sizing: border-box;
            overflow: visible;
            text-align: center;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .pdf-content h2 {
            margin: 20px 0 12px;
            padding: 14px 0 6px;
            color: #750606;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.7;
            break-after: avoid;
            box-sizing: border-box;
            overflow: visible;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .pdf-content h2.part-heading {
            margin-bottom: 25px;
          }

          .pdf-content h3 {
            margin: 20px 0 12px;
            padding: 14px 0 6px;
            color: #750606;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.7;
            break-after: avoid;
            box-sizing: border-box;
            overflow: visible;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .pdf-content h4 {
            margin: 16px 0 8px;
            padding: 8px 0 4px;
            color: #750606;
            font-size: 15px;
            font-weight: 800;
            line-height: 1.6;
            break-after: avoid;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .pdf-content p {
            margin: 0 0 14px;
            padding: 4px 0 5px;
            font-size: 16px;
            line-height: 1.8;
            font-weight: 400;
            text-align: left;
            word-break: normal;
            overflow-wrap: anywhere;
            break-inside: avoid;
            box-sizing: border-box;
            overflow: visible;
          }

          .pdf-content .bullet {
            margin-left: 14px;
            font-size: 16px;
            line-height: 1.8;
          }

          .pdf-content .gap {
            height: 8px;
          }
        </style>

        <main class="pdf-content pdf-flow">
          <div class="pdf-header">
            <h1 class="pdf-brand">Shrivinayaka AI Astrology</h1>
            <p class="pdf-subtitle">${escapeHtml(report.cover_title || getCoverTitle(report.report_style || "full"))}</p>
          </div>

          <div class="pdf-info">
            <p><strong>Name:</strong> ${escapeHtml(report.name)}</p>
          <p><strong>Report Type:</strong> ${escapeHtml(report.report_type_label || getReportStyleLabel(report.report_style || "full"))}</p>
          <p><strong>Language:</strong> ${escapeHtml(formatLabel(report.language ?? "hindi"))}</p>
            <p><strong>Mahadasha:</strong> ${escapeHtml(report.current_mahadasha?.planet ?? "-")}</p>
            <p><strong>Period:</strong> ${escapeHtml(report.current_mahadasha?.start ?? "-")} to ${escapeHtml(report.current_mahadasha?.end ?? "-")}</p>
          </div>

          ${chartHtml}
          ${transitsHtml}
          ${dashaTimelineHtml}
          ${markdownToHtml(formatReportMarkdown(report.report))}
        </main>
      `;

      document.body.appendChild(pdfElement);
      await new Promise((resolve) => window.setTimeout(resolve, 250));

      const flow = pdfElement.querySelector(".pdf-flow") as HTMLElement | null;

      if (!flow) {
        throw new Error("PDF content not found");
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const pageMargin = 16;
      const imgWidth = pdfWidth - pageMargin * 2;
      const bottomLimit = pdfHeight - pageMargin;
      const blocks = Array.from(flow.children) as HTMLElement[];
      let y = pageMargin;

      for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
        const block = blocks[blockIndex];
        const tagName = block.tagName.toLowerCase();

        if ((tagName === "h1" || tagName === "h2" || tagName === "h3") && y > pdfHeight - 52) {
          pdf.addPage();
          y = pageMargin;
        }

        const canvas = await html2canvas(block, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });

        const pageImgData = canvas.toDataURL("image/png");
        const imageHeight = (canvas.height * imgWidth) / canvas.width;

        if (y + imageHeight > bottomLimit && y > pageMargin) {
          pdf.addPage();
          y = pageMargin;
        }

        const finalHeight = Math.min(imageHeight, bottomLimit - y);
        pdf.addImage(pageImgData, "PNG", pageMargin, y, imgWidth, finalHeight);
        y += finalHeight + 3.5;
      }

      document.body.removeChild(pdfElement);

      pdf.save("shrivinayaka-astrology-report.pdf");
      return;
    }

      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      const bottomLimit = pageHeight - 24;
      let y = 24;

      const purple: [number, number, number] = [117, 6, 6];
      const palePurple: [number, number, number] = [245, 240, 255];
      const gold: [number, number, number] = [117, 6, 6];
      const ink: [number, number, number] = [32, 32, 36];
      const muted: [number, number, number] = [92, 92, 104];

      const setColor = (color: [number, number, number]) => {
        pdf.setTextColor(color[0], color[1], color[2]);
      };

      const lineHeightMm = (fontSize: number, factor = 1.45) =>
        fontSize * 0.3528 * factor;

      const resetTextStyle = () => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setDrawColor(225, 225, 235);
        pdf.setFillColor(255, 255, 255);
        setColor(ink);
      };

      const addFooter = () => {
        pdf.setDrawColor(225, 225, 235);
        pdf.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        setColor(muted);
        pdf.text("Shrivinayaka AI Astrology", margin, pageHeight - 9);
        pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin, pageHeight - 9, {
          align: "right",
        });
      };

      const newPage = () => {
        addFooter();
        pdf.addPage();
        y = 24;
        resetTextStyle();
      };

      const ensureSpace = (height = 12) => {
        if (y + height > bottomLimit) {
          newPage();
        }
      };

      const writeWrapped = (
        text: string,
        options: {
          size?: number;
          color?: [number, number, number];
          style?: "normal" | "bold";
          indent?: number;
          before?: number;
          after?: number;
          maxWidth?: number;
          lineFactor?: number;
        } = {}
      ) => {
        const cleaned = text.replace(/\*\*/g, "").trim();
        const size = options.size ?? 11;
        const factor = options.lineFactor ?? 1.52;
        const lineHeight = lineHeightMm(size, factor);
        const before = options.before ?? 0;
        const after = options.after ?? 5;
        const indent = options.indent ?? 0;
        const x = margin + indent;
        const maxWidth = options.maxWidth ?? contentWidth - indent;

        if (!cleaned) {
          y += after;
          return;
        }

        pdf.setFont("helvetica", options.style ?? "normal");
        pdf.setFontSize(size);
        setColor(options.color ?? ink);

        const lines = pdf.splitTextToSize(cleaned, maxWidth);
        ensureSpace(before + lines.length * lineHeight + after);

        pdf.setFont("helvetica", options.style ?? "normal");
        pdf.setFontSize(size);
        setColor(options.color ?? ink);
        y += before;
        pdf.text(lines, x, y, { lineHeightFactor: factor });
        y += lines.length * lineHeight + after;
      };

      const sectionHeading = (title: string) => {
        ensureSpace(28);
        y += 4;
        pdf.setFillColor(purple[0], purple[1], purple[2]);
        pdf.roundedRect(margin, y - 5, 3, 11, 1.5, 1.5, "F");
        writeWrapped(title, {
          size: 15,
          style: "bold",
          color: purple,
          indent: 8,
          after: 7,
          lineFactor: 1.25,
        });
      };

      const keyValue = (label: string, value: string, x: number, rowY: number) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.5);
        setColor(muted);
        pdf.text(label.toUpperCase(), x, rowY);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        setColor(ink);
        pdf.text(value || "-", x, rowY + 6);
      };

      const drawHeader = () => {
        pdf.setFillColor(35, 20, 65);
        pdf.rect(0, 0, pageWidth, 46, "F");
        pdf.setFillColor(124, 58, 237);
        pdf.rect(0, 43, pageWidth, 3, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(24);
        pdf.setTextColor(245, 240, 255);
        pdf.text("Shrivinayaka AI Astrology", pageWidth / 2, 20, {
          align: "center",
        });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(224, 213, 255);
        const coverTitle = report.cover_title || getCoverTitle(report.report_style || "full");
        pdf.text(coverTitle, pageWidth / 2, 31, {
          align: "center",
          maxWidth: contentWidth,
        });
        y = 60;
      };

      const drawInfoCard = () => {
        ensureSpace(42);
        pdf.setFillColor(palePurple[0], palePurple[1], palePurple[2]);
        pdf.setDrawColor(220, 205, 250);
        pdf.roundedRect(margin, y, contentWidth, 38, 3, 3, "FD");

        keyValue("Name", report.name, margin + 7, y + 11);
        keyValue(
          "Report Type",
          report.report_type_label || getReportStyleLabel(report.report_style || "full"),
          margin + 70,
          y + 11
        );
        keyValue(
          "Current Mahadasha",
          `${report.current_mahadasha?.planet ?? "-"} Mahadasha`,
          margin + 7,
          y + 27
        );
        keyValue(
          "Period",
          `${report.current_mahadasha?.start ?? "-"} to ${report.current_mahadasha?.end ?? "-"}`,
          margin + 70,
          y + 27
        );
        y += 48;
      };

      const drawChart = () => {
        if (!report.chart) {
          return;
        }

        sectionHeading("Planetary Positions");
        const entries = Object.entries(report.chart);
        const gap = 4;
        const columns = 3;
        const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
        const cardHeight = 28;

        entries.forEach(([planet, data]: any, index) => {
          const col = index % columns;
          const x = margin + col * (cardWidth + gap);

          if (col === 0) {
            ensureSpace(cardHeight + 5);
          }

          pdf.setFillColor(250, 250, 252);
          pdf.setDrawColor(230, 230, 238);
          pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          setColor(ink);
          pdf.text(planet.toUpperCase(), x + 4, y + 7);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(13.5);
          setColor(ink);
          pdf.text(data.sign ?? "-", x + 4, y + 15);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(11.5);
          setColor(muted);
          pdf.text(
            `${data.degree ? `${data.degree} | ` : ""}House ${data.house}`,
            x + 4,
            y + 23
          );

          if (col === columns - 1 || index === entries.length - 1) {
            y += cardHeight + 5;
          }
        });

        y += 3;
      };

      const drawTransits = () => {
        if (!report.transits?.transits) {
          return;
        }

        sectionHeading("Current Transits");
        const entries = Object.entries(report.transits.transits);
        const gap = 4;
        const columns = 2;
        const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
        const cardHeight = 36;

        entries.forEach(([planet, data]: any, index) => {
          const col = index % columns;
          const x = margin + col * (cardWidth + gap);

          if (col === 0) {
            ensureSpace(cardHeight + 5);
          }

          pdf.setFillColor(250, 250, 252);
          pdf.setDrawColor(230, 230, 238);
          pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12.5);
          setColor(ink);
          pdf.text(planet.toUpperCase(), x + 4, y + 7);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          setColor(ink);
          pdf.text(data.sign ?? "-", x + 4, y + 16);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(11.5);
          setColor(muted);
          pdf.text(
            `${planet} in ${data.house_from_ascendant ?? "-"}th House`,
            x + 4,
            y + 25
          );
          pdf.text(
            `${data.house_from_moon ?? "-"}th House from Moon`,
            x + 4,
            y + 32
          );

          if (col === columns - 1 || index === entries.length - 1) {
            y += cardHeight + 5;
          }
        });

        y += 3;
      };

      const drawDashaTimeline = () => {
        if (!report.dasha_timeline) {
          return;
        }

        sectionHeading("Mahadasha Timeline");
        report.dasha_timeline.forEach((dasha) => {
          ensureSpace(8);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10.5);
          setColor(ink);
          pdf.text(dasha.planet, margin, y);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10.5);
          setColor(muted);
          pdf.text(`${dasha.start} to ${dasha.end}`, margin + 38, y);
          y += 7;
        });
        y += 5;
      };

      const writeReport = () => {
        sectionHeading("Astrology Report");

        formatReportMarkdown(report.report)
          .split("\n")
          .map((line) => line.trim())
          .forEach((line) => {
            if (!line) {
              y += 2.5;
              return;
            }

            if (line.startsWith("# ")) {
              writeWrapped(line.replace(/^#\s+/, ""), {
                size: 18,
                style: "bold",
                color: purple,
                before: 4,
                after: 9,
                lineFactor: 1.25,
              });
            } else if (line.startsWith("## ")) {
              const heading = line.replace(/^##\s+/, "");

              writeWrapped(line.replace(/^##\s+/, ""), {
                size: 14.5,
                style: "bold",
                color: gold,
                before: 8,
                after: heading.includes("PART 2") ? 10 : 5,
                lineFactor: 1.28,
              });
            } else if (line.startsWith("### ")) {
              writeWrapped(line.replace(/^###\s+/, ""), {
                size: 14.5,
                style: "bold",
                color: gold,
                before: 8,
                after: 5,
                lineFactor: 1.28,
              });
            } else if (line.startsWith("- ")) {
              writeWrapped(`• ${line.replace(/^-\s+/, "")}`, {
                size: 10.5,
                indent: 5,
                after: 3,
                lineFactor: 1.45,
              });
            } else {
              writeWrapped(line, {
                size: 11,
                after: 5.8,
                lineFactor: 1.62,
              });
            }
          });
      };

      drawHeader();
      drawInfoCard();
      drawChart();
      drawTransits();
      drawDashaTimeline();
      writeReport();
      addFooter();

      pdf.save("shrivinayaka-astrology-report.pdf");
    } catch (error) {
      console.error(error);
      alert("PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-bold text-center mb-3">
          Shrivinayaka AI Astrology
        </h1>

        <p className="text-center text-gray-400 mb-10">
          AI-powered Vedic astrology reports with Mahadasha analysis
        </p>

        <div className="bg-zinc-900 p-6 rounded-2xl shadow-xl space-y-4">

          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={formData.name}
            className="w-full p-3 rounded-xl bg-zinc-800"
            onChange={handleChange}
          />

          <input
            type="text"
            name="birth_date"
            placeholder="DD/MM/YYYY"
            value={formData.birth_date}
            inputMode="numeric"
            maxLength={10}
            className="w-full p-3 rounded-xl bg-zinc-800"
            onChange={handleBirthDateChange}
          />

          <input
            type="time"
            name="birth_time"
            value={formData.birth_time}
            className="w-full p-3 rounded-xl bg-zinc-800"
            onChange={handleChange}
          />

          <input
            type="text"
            name="birth_place"
            placeholder="Birth Place"
            value={formData.birth_place}
            className="w-full p-3 rounded-xl bg-zinc-800"
            onChange={handleChange}
          />

          <select
            name="report_type"
            value={formData.report_type}
            className="w-full p-3 rounded-xl bg-zinc-800"
            onChange={handleChange}
          >
            <option value="free">Free Report</option>
            <option value="premium">Premium Report</option>
          </select>

          {formData.report_type === "premium" && (
            <>
              <select
            name="report_style"
            value={formData.report_style}
            className="w-full p-3 rounded-xl bg-zinc-800"
            onChange={handleChange}
          >
            <option value="consultation">
              Personal Consultation Report - ₹75
            </option>
            <option value="full">
              Complete Astrology Report - ₹125
            </option>
            <option value="full_plus_consultation">
              Complete Astrology + Consultation - ₹199
            </option>
          </select>
            </>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Language
            </label>

            <select
              name="language"
              value={formData.language}
              className="w-full p-3 rounded-xl bg-zinc-800"
              onChange={handleChange}
            >
              <option value="english">English</option>
              <option value="hindi">सरल हिन्दी</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>

          {formData.report_type === "premium" && (
            <>
          {formData.report_style !== "consultation" && (
            <>
              <select
                name="current_concern"
                value={formData.current_concern}
                className="w-full p-3 rounded-xl bg-zinc-800"
                onChange={handleChange}
              >
                <option value="general">General Guidance</option>
                <option value="career">Career</option>
                <option value="money">Money</option>
                <option value="relationship">Relationship</option>
                <option value="marriage">Marriage</option>
                <option value="health">Health</option>
                <option value="family">Family</option>
                <option value="purpose">Purpose</option>
              </select>

              <select
                name="employment_status"
                value={formData.employment_status}
                className="w-full p-3 rounded-xl bg-zinc-800"
                onChange={handleChange}
              >
                <option value="not_selected">Employment Status</option>
                <option value="employed">Employed</option>
                <option value="business">Business</option>
                <option value="freelance">Freelance</option>
                <option value="unemployed">Unemployed</option>
                <option value="retired">Retired</option>
              </select>

              <select
                name="relationship_status"
                value={formData.relationship_status}
                className="w-full p-3 rounded-xl bg-zinc-800"
                onChange={handleChange}
              >
                <option value="not_selected">Relationship Status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="complicated">Complicated</option>
              </select>
            </>
          )}

          {formData.report_style !== "full" && (
            <>
              <textarea
                name="main_question"
                placeholder="Your main question (optional)"
                value={formData.main_question}
                className="w-full p-3 rounded-xl bg-zinc-800"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    main_question: e.target.value,
                  })
                }
              />

              <div className="rounded-xl border border-purple-500/40 bg-purple-950/30 p-4 text-sm text-gray-300">
                <p className="mb-2 font-bold text-white">
                  One Primary Question Only
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>When will my career improve?</li>
                  <li>Will marriage happen?</li>
                  <li>How will health remain?</li>
                </ul>
                <p className="mt-3">
                  Only the first question will be analyzed.
                </p>
              </div>
            </>
          )}
            </>
          )}

          <button
            type="button"
            onClick={generateReport}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all p-3 rounded-xl font-bold"
          >
            {loading ? "Reading your chart..." : "Generate Report"}
          </button>

          {loading && (
            <p className="text-sm text-gray-400 text-center">
              Please wait. This can take a little while while the AI writes your report.
            </p>
          )}

          {errorMessage && (
            <p className="text-sm text-red-400 text-center">
              {errorMessage}
            </p>
          )}
        </div>

        {report && (
          <div id="report-content" className="mt-10 bg-zinc-900 p-6 rounded-2xl">
            <h2 className="text-3xl font-bold mb-6">
              Astrology Report
            </h2>

            <div className="space-y-6">

              <div className="bg-zinc-800 p-4 rounded-xl">
                <h3 className="text-xl font-bold mb-2">
                  Current Mahadasha
                </h3>

                <p>
                  {report.current_mahadasha?.planet} Mahadasha
                </p>

                <p className="text-sm text-gray-400">
                  {`${report.current_mahadasha?.start} \u2192 ${report.current_mahadasha?.end}`}
                </p>
              </div>

              {report.chart && (
                <div className="bg-zinc-800 p-4 rounded-xl">
                  <h3 className="text-xl font-bold mb-4">
                    Planetary Positions
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(report.chart).map(
                      ([planet, data]: any) => (
                        <div
                          key={planet}
                          className="bg-zinc-900 p-3 rounded-lg"
                        >
                          <p className="font-bold">{planet}</p>
                          <p>{data.sign}</p>
                          {data.degree && (
                            <p className="text-sm text-purple-200">
                              {data.degree}
                            </p>
                          )}
                          <p className="text-sm text-gray-400">
                            House {data.house}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {report.transits?.transits && (
                <div className="bg-zinc-800 p-4 rounded-xl">
                  <h3 className="text-xl font-bold mb-4">
                    Current Transits
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(report.transits.transits).map(
                      ([planet, data]: any) => (
                        <div
                          key={planet}
                          className="bg-zinc-900 p-3 rounded-lg"
                        >
                          <p className="font-bold">{planet}</p>
                          <p>{data.sign}</p>
                          <p className="text-sm text-gray-400">
                            {planet} in {data.house_from_ascendant}th House
                          </p>
                          <p className="text-sm text-gray-400">
                            {data.house_from_moon}th House from Moon
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {report.dasha_timeline && (
                <div className="bg-zinc-800 p-4 rounded-xl">
                  <h3 className="text-xl font-bold mb-4">
                    Mahadasha Timeline
                  </h3>

                  <div className="space-y-2">
                    {report.dasha_timeline.map((dasha) => (
                      <div
                        key={`${dasha.planet}-${dasha.start}`}
                        className="flex flex-col gap-1 rounded-lg bg-zinc-900 p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <p className="font-bold">{dasha.planet}</p>
                        <p className="text-sm text-gray-400">
                          {dasha.start} → {dasha.end}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-zinc-800 p-6 rounded-xl">
                <h3 className="text-2xl font-bold mb-4">
                  Astrology Report
                </h3>

                <div className="max-w-none text-gray-200">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-4xl font-bold text-purple-300 mb-8 mt-2 border-b border-purple-500 pb-4">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-bold text-yellow-300 mt-10 mb-4">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-bold text-purple-200 mt-8 mb-3">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-gray-300 leading-8 mb-5 text-lg">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-6 mb-5 space-y-2 text-gray-300">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="leading-7">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-white font-bold">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {formatReportMarkdown(report.report)}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => navigator.clipboard.writeText(report.report)}
                  className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-bold"
                >
                  Copy Report
                </button>

                <button
                  onClick={downloadPDF}
                  disabled={pdfLoading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-bold"
                >
                  {pdfLoading ? "Downloading..." : "Download PDF"}
                </button>
              </div>

              {report?.report_type === "free" && (
                <div className="mt-6 bg-purple-900/40 border border-purple-500 p-5 rounded-xl">
                  <h3 className="text-xl font-bold mb-2">
                    Unlock Premium Report
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Get detailed career timing, relationship analysis, remedies, full chart and Dasha timeline.
                  </p>
                  <button
                    type="button"
                    onClick={generatePremiumReport}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-bold"
                  >
                    {loading ? "Reading your chart..." : "Generate Premium Report"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
