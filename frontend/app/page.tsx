"use client";

import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

type ReportData = {
  name: string;
  report_type: string;
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
  dasha_timeline?: Array<{
    planet: string;
    start: string;
    end: string;
    years: number;
  }>;
  report: string;
};

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    birth_date: "",
    birth_time: "",
    birth_place: "",
    report_type: "free",
  });

  const [loading, setLoading] = useState(false);
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
        "http://127.0.0.1:8000/generate-report",
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
        "http://127.0.0.1:8000/create-payment-order"
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
            "http://127.0.0.1:8000/verify-payment",
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

  const downloadPDF = async () => {
    if (!report) {
      alert("Report not found");
      return;
    }

    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      const bottomLimit = pageHeight - 24;
      let y = 24;

      const purple: [number, number, number] = [91, 33, 182];
      const palePurple: [number, number, number] = [245, 240, 255];
      const gold: [number, number, number] = [146, 100, 21];
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
        pdf.text("Personal Vedic Astrology Report", pageWidth / 2, 31, {
          align: "center",
        });
        y = 60;
      };

      const drawInfoCard = () => {
        ensureSpace(42);
        pdf.setFillColor(palePurple[0], palePurple[1], palePurple[2]);
        pdf.setDrawColor(220, 205, 250);
        pdf.roundedRect(margin, y, contentWidth, 38, 3, 3, "FD");

        keyValue("Name", report.name, margin + 7, y + 11);
        keyValue("Report Type", report.report_type, margin + 70, y + 11);
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
        const cardHeight = 18;

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
          pdf.setFontSize(10);
          setColor(ink);
          pdf.text(planet, x + 4, y + 6);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          setColor(muted);
          pdf.text(`${data.sign} | House ${data.house}`, x + 4, y + 13);

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

        report.report
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
              writeWrapped(line.replace(/^##\s+/, ""), {
                size: 14.5,
                style: "bold",
                color: gold,
                before: 8,
                after: 5,
                lineFactor: 1.28,
              });
            } else if (line.startsWith("### ")) {
              writeWrapped(line.replace(/^###\s+/, ""), {
                size: 12.5,
                style: "bold",
                color: purple,
                before: 5,
                after: 4,
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
      drawDashaTimeline();
      writeReport();
      addFooter();

      pdf.save("shrivinayaka-astrology-report.pdf");
    } catch (error) {
      console.error(error);
      alert("PDF download failed");
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
            type="date"
            name="birth_date"
            value={formData.birth_date}
            className="w-full p-3 rounded-xl bg-zinc-800"
            onChange={handleChange}
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
                          <p className="text-sm text-gray-400">
                            House {data.house}
                          </p>
                        </div>
                      )
                    )}
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
                    {report.report}
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
                  className="bg-purple-600 hover:bg-purple-700 px-5 py-3 rounded-xl font-bold"
                >
                  Download PDF
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
