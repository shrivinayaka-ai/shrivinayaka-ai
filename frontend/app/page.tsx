"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const PENDING_REPORT_PAYLOAD_KEY = "shrivinayaka_pending_report_payload";

const CURRENT_MAX_YEAR = 2026;

const loadingMessages = [
  "Charting your natal sky...",
  "Aligning Rasi (D1) and Navamsa (D9) charts...",
  "Monitoring planetary positions...",
  "Interpreting your Mahadasha cycle...",
  "Reviewing the current Antardasha...",
  "Mapping present planetary transits...",
  "Generating your personalized report...",
  "Your report is ready.",
];

const sampleReports = [
  {
    title: "Career Report Sample",
    desc: "See how career, Mahadasha and transit timing are explained.",
    file: "/samples/career-sample.pdf",
  },
  {
    title: "Marriage Report Sample",
    desc: "Preview relationship, marriage and compatibility style analysis.",
    file: "/samples/marriage-sample.pdf",
  },
  {
    title: "Health Report Sample",
    desc: "Understand how health tendencies and care suggestions are presented.",
    file: "/samples/health-sample.pdf",
  },
];

type ChartPlanet = {
  sign: string;
  sign_index: number;
  house?: number;
};

type ReportCharts = {
  d1: Record<string, ChartPlanet>;
  d9: Record<string, ChartPlanet>;
};

type LifeAreaScore = {
  house: number;
  title: string;
  meaning: string;
  score: number;
  level: "Strong" | "Moderate" | "Needs Attention";
};

type LifeAreaScores = {
  areas: LifeAreaScore[];
  top_strong: LifeAreaScore[];
  top_attention: LifeAreaScore[];
};

type ReportData = {
  display_report_id?: string;
  generated_on?: string;
  name: string;
  report_type: string;
  cover_title?: string;
  report_type_label?: string;
  report_style?: string;
  language?: string;
  latitude?: number;
  longitude?: number;
  input: {
    birth_date: string;
    birth_time: string;
    birth_place: string;
    employment_status?: string;
    relationship_status?: string;
  };
  current_mahadasha?: {
    planet: string;
    start: string;
    end: string;
    years: number;
  };
  current_dasha_details?: {
    current_mahadasha?: string;
    mahadasha_start?: string;
    mahadasha_end?: string;
    current_antardasha?: {
      antardasha: string;
      start: string;
      end: string;
    };
    next_antardasha?: {
      antardasha: string;
      start: string;
      end: string;
    } | null;
  };
  antardasha_timeline?: Array<{
    period: string;
    start: string;
    end: string;
  }>;
  chart?: Record<string, any>;
  charts?: ReportCharts;
  life_area_scores?: LifeAreaScores;
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
  if (style === "consultation") return "Personal Consultation Report";
  if (style === "full_plus_consultation") return "Complete Astrology + Consultation Report";
  return "Complete Astrology Report";
};

const getCoverTitle = (style: string) => {
  if (style === "consultation") return "Personal Consultation Report";
  if (style === "full_plus_consultation") {
    return "Complete Astrology + Consultation Report";
  }

  return "Complete Astrology Report";
};

const ordinal = (n: number) => {
  const suffix =
    n % 10 === 1 && n % 100 !== 11
      ? "st"
      : n % 10 === 2 && n % 100 !== 12
      ? "nd"
      : n % 10 === 3 && n % 100 !== 13
      ? "rd"
      : "th";

  return `${n}${suffix}`;
};

const ordinalFromValue = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? ordinal(numberValue) : "-";
};

const formatDateForBackend = (date: string) => {
  if (!date) return "";

  return date;
};

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const SIGN_SHORT: Record<string, string> = {
  Aries: "ARIES",
  Taurus: "TAURUS",
  Gemini: "GEMINI",
  Cancer: "CANCER",
  Leo: "LEO",
  Virgo: "VIRGO",
  Libra: "LIBRA",
  Scorpio: "SCORPIO",
  Sagittarius: "SAGITTARIUS",
  Capricorn: "CAPRICORN",
  Aquarius: "AQUARIUS",
  Pisces: "PISCES",
};

const PLANET_SHORT: Record<string, string> = {
  Ascendant: "Asc",
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

function NorthIndianChart({
  title,
  chartData,
}: {
  title: string;
  chartData: Record<string, ChartPlanet>;
}) {
  const signs = Array.from({ length: 12 }, (_, i) => {
    const planets = Object.entries(chartData)
      .filter(([, data]) => data.sign_index === i)
      .map(([name]) => PLANET_SHORT[name] || name);

    return {
      signIndex: i,
      signName: SIGN_SHORT[SIGNS[i]],
      planets,
    };
  });

  return (
    <div className="flex min-h-[430px] flex-col rounded-xl border border-[#ead8b8] bg-white p-4 shadow-sm">
      <h3 className="mb-6 flex h-10 items-center justify-center text-center text-lg font-bold text-[#8b0000]">
        {title}
      </h3>

      <div className="grid h-[300px] flex-1 grid-cols-4 border-4 border-[#d4a017] text-center text-xs">
        {signs.map((box) => (
          <div
            key={box.signIndex}
            className="flex min-h-[100px] flex-col items-center justify-start border-2 border-[#d4a017] bg-[#fffaf2] p-2"
          >
            <div className="text-[10px] font-bold text-[#5c0000]">
              {box.signIndex + 1}
            </div>
            <div className="mt-1 text-[9px] font-semibold text-[#8b0000]">
              {box.signName}
            </div>
            <div className="mt-2 whitespace-pre-line text-sm font-semibold text-[#2b1b12]">
              {box.planets.join("\n")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getScoreColor(level: string) {
  if (level === "Strong") return "text-green-700";
  if (level === "Moderate") return "text-amber-700";
  return "text-red-700";
}

function getScoreBg(level: string) {
  if (level === "Strong") return "border-green-600 bg-green-50";
  if (level === "Moderate") return "border-amber-500 bg-amber-50";
  return "border-red-600 bg-red-50";
}

function LifeAreaScoresSection({
  scores,
}: {
  scores: LifeAreaScores;
}) {
  return (
    <section className="my-8 rounded-xl border border-[#ead8b8] bg-[#fff6e6] p-5">
      <h3 className="text-2xl font-bold text-[#8b0000]">
        Life Area Strengths
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#6b4a35]">
        Scores are calculated out of 100 and show relative strength of
        different life areas. They are guidance indicators, not fixed
        guarantees.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-green-600 bg-white p-5">
          <h4 className="mb-4 text-lg font-bold text-green-700">
            Top Strong Areas
          </h4>

          <div className="space-y-3">
            {scores.top_strong.map((item) => (
              <div
                key={item.house}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-[#2b1b12]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[#6b4a35]">
                    {item.meaning}
                  </p>
                </div>

                <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-full bg-green-700 text-center text-sm font-bold leading-none text-white">
                  {item.score}/100
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-red-600 bg-white p-5">
          <h4 className="mb-4 text-lg font-bold text-red-700">
            Growth Opportunities
          </h4>

          <div className="space-y-3">
            {scores.top_attention.map((item) => (
              <div
                key={item.house}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-[#2b1b12]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[#6b4a35]">
                    {item.meaning}
                  </p>
                </div>

                <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-full bg-red-600 text-center text-sm font-bold leading-none text-white">
                  {item.score}/100
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h4 className="mt-8 text-xl font-bold text-[#8b0000]">
        Every Life Category
      </h4>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {scores.areas.map((item) => (
          <div
            key={item.house}
            className={`rounded-xl border p-4 ${getScoreBg(item.level)}`}
          >
            <p className="text-xs font-bold uppercase text-[#6b4a35]">
              Area {item.house}
            </p>

            <h5 className="mt-2 min-h-[48px] font-bold text-[#2b1b12]">
              {item.title}
            </h5>

            <p className={`mt-3 text-3xl font-extrabold ${getScoreColor(item.level)}`}>
              {item.score}/100
            </p>

            <p className="mt-1 text-sm text-[#4b3528]">
              {item.level}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    birth_date: "",
    birth_day: "",
    birth_month: "",
    birth_year: "",
    birth_time: "",
    birth_place: "",
    latitude: "",
    longitude: "",
    use_manual_coordinates: false,
    report_type: "premium",
    report_style: "full_plus_consultation",
    language: "english",
    current_concern: "general",
    employment_status: "not_selected",
    relationship_status: "not_selected",
    main_question: "",
  });

  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [report, setReport] = useState<ReportData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [paymentDone, setPaymentDone] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const [useManualCoordinates, setUseManualCoordinates] = useState(false);

  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingMessageIndex((prev) =>
        prev < loadingMessages.length - 1 ? prev + 1 : prev
      );
    }, 12000);

    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!report) {
        return;
      }

      event.preventDefault();
      event.returnValue =
        "Your generated report may be lost. Please download your report before leaving or refreshing this page.";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [report]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const cleanNumber = (value: string) => value.replace(/\D/g, "");

  const updateBirthDatePart = (
    field: "birth_day" | "birth_month" | "birth_year",
    value: string
  ) => {
    let cleaned = cleanNumber(value);

    if (field === "birth_day") {
      cleaned = cleaned.slice(0, 2);

      if (Number(cleaned) > 31) cleaned = "31";
    }

    if (field === "birth_month") {
      cleaned = cleaned.slice(0, 2);

      if (Number(cleaned) > 12) cleaned = "12";
    }

    if (field === "birth_year") {
      cleaned = cleaned.slice(0, 4);

      if (cleaned.length === 4 && Number(cleaned) > CURRENT_MAX_YEAR) {
        cleaned = String(CURRENT_MAX_YEAR);
      }
    }

    setFormData((prev) => ({
      ...prev,
      [field]: cleaned,
    }));
  };

  const getBirthDateForBackend = () =>
    `${formData.birth_day}/${formData.birth_month}/${formData.birth_year}`;

  const isValidBirthDate = () => {
    const d = Number(formData.birth_day);
    const m = Number(formData.birth_month);
    const y = Number(formData.birth_year);

    if (!d || !m || !y) return false;
    if (formData.birth_year.length !== 4) return false;

    const date = new Date(y, m - 1, d);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return (
      y >= 1900 &&
      y <= CURRENT_MAX_YEAR &&
      date <= today &&
      date.getDate() === d &&
      date.getMonth() === m - 1 &&
      date.getFullYear() === y
    );
  };

  const searchPlaces = async (query: string) => {
    setPlaceQuery(query);
    setFormData((prev) => ({
      ...prev,
      birth_place: query,
      latitude: "",
      longitude: "",
      use_manual_coordinates: false,
    }));

    if (!query || query.trim().length < 2) {
      setPlaceResults([]);
      return;
    }

    try {
      const url = `/api/search-place?q=${encodeURIComponent(query.trim())}`;
      console.log("Searching place:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Place result:", data);

      setPlaceResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Place search failed:", error);
      setPlaceResults([]);
    }
  };

  const setManualCoordinatesMode = (enabled: boolean) => {
    setUseManualCoordinates(enabled);
    setPlaceResults([]);

    setFormData((prev) => ({
      ...prev,
      use_manual_coordinates: enabled,
      latitude: enabled ? prev.latitude : "",
      longitude: enabled ? prev.longitude : "",
    }));
  };

  const validateRequiredFields = () => {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (!formData.name.trim()) {
      alert("Please enter your name");
      return false;
    }

    if (
      !formData.birth_day.trim() ||
      !formData.birth_month.trim() ||
      !formData.birth_year.trim()
    ) {
      alert("Please enter Date of Birth");
      return false;
    }

    if (!isValidBirthDate()) {
      alert("Please enter a valid Date of Birth.");
      return false;
    }

    if (!formData.birth_time.trim()) {
      alert("Please enter Time of Birth");
      return false;
    }

    if (!timeRegex.test(formData.birth_time)) {
      alert("Please enter Time of Birth as HH:MM");
      return false;
    }

    if (!formData.birth_place.trim()) {
      alert("Please select or enter Birth Place.");
      return false;
    }

    if (useManualCoordinates) {
      const lat = Number(formData.latitude);
      const lon = Number(formData.longitude);

      if (Number.isNaN(lat) || lat < -90 || lat > 90) {
        alert("Please enter a valid latitude between -90 and 90.");
        return false;
      }

      if (Number.isNaN(lon) || lon < -180 || lon > 180) {
        alert("Please enter a valid longitude between -180 and 180.");
        return false;
      }
    }

    if (!formData.employment_status || formData.employment_status === "not_selected") {
      alert("Please select Employment Status");
      return false;
    }

    if (!formData.relationship_status || formData.relationship_status === "not_selected") {
      alert("Please select Relationship Status");
      return false;
    }

    const needsQuestion =
      formData.report_type === "premium" &&
      (formData.report_style === "consultation" ||
        formData.report_style === "full_plus_consultation");

    if (needsQuestion && !formData.main_question.trim()) {
      alert("Please enter your question for the consultation report.");
      return false;
    }

    return true;
  };

  const buildReportPayload = (
    reportType = formData.report_type,
    paymentToken: string | null = null,
    razorpayPaymentId: string | null = null
  ) => ({
      ...formData,
      birth_date: formatDateForBackend(getBirthDateForBackend()),
      report_type: reportType,
      payment_token: paymentToken,
      payment_id: razorpayPaymentId,
      use_manual_coordinates: useManualCoordinates,
    });

  const sendReport = async (
    reportType = formData.report_type,
    paymentToken: string | null = null
  ) => {
    const payload = buildReportPayload(reportType, paymentToken);

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

  const generateReportAfterPayment = async (
    paymentToken: string,
    razorpayPaymentId: string,
    savedPayload?: Record<string, any>
  ) => {
    const payload = savedPayload
      ? {
          ...savedPayload,
          report_type: "premium",
          payment_token: paymentToken,
          payment_id: razorpayPaymentId,
        }
      : buildReportPayload("premium", paymentToken, razorpayPaymentId);

    try {
      setLoading(true);
      setErrorMessage("");
      setReport(null);
      console.log("REPORT AFTER PAYMENT PAYLOAD:", payload);

      const response = await axios.post(
        `${API_BASE_URL}/generate-report`,
        payload,
        { timeout: 180000 }
      );

      console.log("REPORT RESPONSE:", response.data);
      setReport(response.data);
      window.sessionStorage.removeItem(PENDING_REPORT_PAYLOAD_KEY);
    } catch (error) {
      console.error("Report generation failed:", error);
      setErrorMessage(
        "Payment successful, but report generation failed. Please contact support with your payment ID."
      );
      alert(
        `Payment successful, but report generation failed. Please contact support with payment ID: ${razorpayPaymentId}`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("payment_callback") !== "1") {
      return;
    }

    const razorpayPaymentId = params.get("razorpay_payment_id");
    const razorpayOrderId = params.get("razorpay_order_id");
    const razorpaySignature = params.get("razorpay_signature");
    const storedPayload = window.sessionStorage.getItem(
      PENDING_REPORT_PAYLOAD_KEY
    );

    window.history.replaceState(null, "", window.location.pathname);

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      setErrorMessage(
        "Payment was completed, but payment details were not returned. Please contact support."
      );
      return;
    }

    if (!storedPayload) {
      setErrorMessage(
        `Payment successful, but report details were lost. Please contact support with payment ID: ${razorpayPaymentId}`
      );
      return;
    }

    const completePayment = async () => {
      try {
        setLoading(true);
        setPaymentId(razorpayPaymentId);
        setPaymentDone(true);

        const savedPayload = JSON.parse(storedPayload);
        const verifyResponse = await axios.post(`${API_BASE_URL}/verify-payment`, {
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
        });

        if (verifyResponse.data.success) {
          await generateReportAfterPayment(
            verifyResponse.data.payment_token,
            razorpayPaymentId,
            savedPayload
          );
        } else {
          setErrorMessage("Payment verification failed. Please contact support.");
          setLoading(false);
        }
      } catch (error) {
        console.error("Payment callback failed:", error);
        setErrorMessage(
          `Payment successful, but report generation failed. Please contact support with payment ID: ${razorpayPaymentId}`
        );
        setLoading(false);
      }
    };

    completePayment();
  }, []);

  const generateReport = async () => {
    console.log("Generate Report clicked", formData);

    if (!validateRequiredFields()) {
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
      const pendingPayload = buildReportPayload("premium");

      if (!(window as any).Razorpay) {
        alert("Razorpay script not loaded");
        return;
      }

      window.sessionStorage.setItem(
        PENDING_REPORT_PAYLOAD_KEY,
        JSON.stringify(pendingPayload)
      );

      const options: Record<string, any> = {
        key,
        amount,
        currency,
        name: "Shrivinayaka AI Astrology",
        description: "Premium Astrology Report",
        order_id,
        handler: function (response: any) {
          console.log("Payment success:", response);
          setPaymentId(response.razorpay_payment_id);
          setPaymentDone(true);

          window.setTimeout(async () => {
            try {
              const verifyResponse = await axios.post(
                `${API_BASE_URL}/verify-payment`,
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }
              );

              if (verifyResponse.data.success) {
                await generateReportAfterPayment(
                  verifyResponse.data.payment_token,
                  response.razorpay_payment_id
                );
              } else {
                alert("Payment verification failed");
              }
            } catch (error) {
              console.error("Payment verification failed:", error);
              setLoading(false);
              setErrorMessage(
                "Payment successful, but verification failed. Please contact support with your payment ID."
              );
              alert(
                `Payment successful, but verification failed. Please contact support with payment ID: ${response.razorpay_payment_id}`
              );
            }
          }, 300);
        },
        modal: {
          escape: false,
          backdropclose: false,
          handleback: false,
          ondismiss: function () {
            setLoading(false);
          },
        },
        retry: {
          enabled: false,
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
          /^#{0,4}\s*(17\.\s*)?final guidance:?$/i.test(trimmed)
        ) {
          return "## Guidance from Shrivinayaka Astrology";
        }

        if (
          /^(final observation|final observation:|final guidance|final guidance:)$/i.test(
            trimmed
          )
        ) {
          return "## Final Observation";
        }

        if (
          /^(Saturn|Jupiter|Rahu|Ketu)\s+in\s+\d+(st|nd|rd|th)\s+House(\s+from\s+Moon)?$/i.test(
            trimmed
          )
        ) {
          return `### ${trimmed}`;
        }

        if (
          /^(Saturn|Jupiter|Rahu|Ketu) Impact:?$/i.test(trimmed) ||
          /^(Impact from Ascendant|Impact from Ascendent|Impact from Moon|Practical Advice):?$/i.test(
            trimmed
          )
        ) {
          return `#### ${trimmed.replace(/:$/, "")}`;
        }

        if (/^(Period|Prediction|Advice):$/i.test(trimmed)) {
          return `#### ${trimmed.replace(/:$/, "")}`;
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
    const useHtmlPdfRenderer = true;
    const cleanFileName = (value: string) =>
      value
        .trim()
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim();
    const firstName =
      cleanFileName(report.name || formData.name || "User")
        .split("-")[0] || "User";
    const reportTypeName = cleanFileName(
      report.report_type_label ||
        getReportStyleLabel(report.report_style || "full")
    );
    const pdfFileName = `${firstName}-Shrivinayaka-Astrology-${reportTypeName}.pdf`;

    try {
      if (
        useHtmlPdfRenderer ||
        report.language?.toLowerCase() === "hindi" ||
        hasDevanagari
      ) {
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

      const keepOnlyLastFinalObservation = (markdown: string) => {
        const lines = markdown.split("\n");
        const finalHeadingIndexes = lines
          .map((line, index) =>
            /^#{1,4}\s*(final observation|final observation:|final guidance|final guidance:)$/i.test(
              line.trim()
            )
              ? index
              : -1
          )
          .filter((index) => index >= 0);

        if (finalHeadingIndexes.length <= 1) {
          return markdown;
        }

        const keepIndex = finalHeadingIndexes[finalHeadingIndexes.length - 1];
        const removeIndexes = new Set(finalHeadingIndexes.slice(0, -1));
        const filtered: string[] = [];
        let skipping = false;

        lines.forEach((line, index) => {
          const trimmed = line.trim();
          const isHeading = /^#{1,4}\s+/.test(trimmed);

          if (removeIndexes.has(index)) {
            skipping = true;
            return;
          }

          if (index === keepIndex || (skipping && isHeading)) {
            skipping = false;
          }

          if (!skipping) {
            filtered.push(line);
          }
        });

        return filtered.join("\n");
      };

      const buildAntardashaTableHtml = () =>
        report.antardasha_timeline?.length
          ? `
            <table class="dasha-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                </tr>
              </thead>
              <tbody>
                ${report.antardasha_timeline
                  .map(
                    (item) => `
                      <tr>
                        <td><strong>${escapeHtml(item.period)}</strong></td>
                        <td><strong>${escapeHtml(item.start)}</strong></td>
                        <td><strong>${escapeHtml(item.end)}</strong></td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          `
          : "";

      const markdownToHtml = (markdown: string) => {
        let inTransitSection = false;
        let transitAnalysisSectionOpen = false;
        let transitBoxOpen = false;
        let transitSubBoxOpen = false;
        let inRoadmapSection = false;
        let roadmapYearOpen = false;
        let finalObservationOpen = false;
        let dashaEmphasisBoxOpen = false;
        let skipAiAntardashaTimeline = false;

        const closeTransitSubBox = () => {
          if (!transitSubBoxOpen) {
            return "";
          }

          transitSubBoxOpen = false;
          return "</div>";
        };

        const closeTransitBox = () => {
          if (!transitBoxOpen) {
            return "";
          }

          const closing = `${closeTransitSubBox()}</div>`;
          transitBoxOpen = false;
          return closing;
        };

        const closeRoadmapYear = () => {
          if (!roadmapYearOpen) {
            return "";
          }

          roadmapYearOpen = false;
          return "</div>";
        };

        const closeTransitAnalysisSection = () => {
          const closing = closeTransitBox();

          if (!transitAnalysisSectionOpen) {
            return closing;
          }

          transitAnalysisSectionOpen = false;
          inTransitSection = false;
          return `${closing}</section>`;
        };

        const closeFinalObservation = () => {
          if (!finalObservationOpen) {
            return "";
          }

          finalObservationOpen = false;
          return "</section>";
        };

        const closeDashaEmphasisBox = () => {
          if (!dashaEmphasisBoxOpen) {
            return "";
          }

          dashaEmphasisBoxOpen = false;
          return "</div>";
        };

        const closeSpecialBlocks = () =>
          `${closeDashaEmphasisBox()}${closeTransitAnalysisSection()}${closeRoadmapYear()}${closeFinalObservation()}`;

        const isTransitPlanetHeading = (heading: string) =>
          /^(Saturn|Jupiter|Rahu|Ketu)\b/i.test(heading);

        const isFinalObservationHeading = (heading: string) =>
          /^(final observation|final observation:|final guidance|final guidance:)$/i.test(
            heading
          ) ||
          heading === "अंतिम निष्कर्ष" ||
          heading === "अंतिम निष्कर्ष:";

        const isRoadmapHeading = (heading: string) =>
          /next\s+3\s+years\s+roadmap/i.test(heading);

        const isRoadmapYearHeading = (heading: string) =>
          /^Year\s+[123]:?$/i.test(heading);

        const isAntardashaTimelineHeading = (heading: string) =>
          /antardasha\s+timeline/i.test(heading);

        const isDashaEmphasisLine = (value: string) =>
          /^(Current Mahadasha|Current Antardasha|Next Antardasha|Start Date|End Date):/i.test(
            value
          ) || /\b(Mahadasha|Antardasha)\s*\(.+\)/i.test(value);

        const lines = markdown.split("\n");
        const html = lines
          .map((line) => {
            const trimmed = line.trim();

            if (!trimmed) {
              return `${closeDashaEmphasisBox()}<div class="gap"></div>`;
            }

            if (trimmed.startsWith("# ")) {
              inTransitSection = false;
              skipAiAntardashaTimeline = false;
              inRoadmapSection = false;
              return `${closeSpecialBlocks()}<h1>${escapeHtml(
                trimmed.replace(/^#\s+/, "")
              )}</h1>`;
            }

            if (trimmed.startsWith("## ")) {
              const headingText = trimmed.replace(/^##\s+/, "");
              const heading = escapeHtml(headingText);
              const className = heading.includes("PART 2")
                ? " class=\"part-heading\""
                : "";
              const closing = closeSpecialBlocks();

              inTransitSection = /current transit analysis/i.test(headingText);
              skipAiAntardashaTimeline = false;
              inRoadmapSection = isRoadmapHeading(headingText);

              if (isFinalObservationHeading(headingText)) {
                inTransitSection = false;
                inRoadmapSection = false;
                finalObservationOpen = true;
                return `${closing}<section class="final-observation"><h2>Final Observation</h2>`;
              }

              if (inTransitSection) {
                transitAnalysisSectionOpen = true;
                return `${closing}<section class="report-section transit-analysis-section"><h2>${heading}</h2>`;
              }

              if (isAntardashaTimelineHeading(headingText) && report.antardasha_timeline?.length) {
                skipAiAntardashaTimeline = true;
                return `${closing}<section class="report-section dasha-timeline-section"><h2>${heading}</h2>${buildAntardashaTableHtml()}</section>`;
              }

              return `${closing}<h2${className}>${heading}</h2>`;
            }

            if (skipAiAntardashaTimeline) {
              return "";
            }

            if (trimmed.startsWith("### ")) {
              const headingText = trimmed.replace(/^###\s+/, "");

              if (isFinalObservationHeading(headingText)) {
                inTransitSection = false;
                inRoadmapSection = false;
                const closing = closeSpecialBlocks();
                finalObservationOpen = true;
                return `${closing}<section class="final-observation"><h2>Final Observation</h2>`;
              }

              if (inTransitSection && isTransitPlanetHeading(headingText)) {
                const closing = `${closeTransitBox()}${closeRoadmapYear()}`;
                transitBoxOpen = true;
                return `${closing}<div class="transit-box"><h3>${escapeHtml(
                  headingText
                )}</h3>`;
              }

              if (inRoadmapSection && isRoadmapYearHeading(headingText)) {
                const closing = closeRoadmapYear();
                roadmapYearOpen = true;
                return `${closing}<div class="roadmap-year"><h3>${escapeHtml(
                  headingText.replace(/:$/, "")
                )}</h3>`;
              }

              return `${closeSpecialBlocks()}<h3>${escapeHtml(headingText)}</h3>`;
            }

            if (trimmed.startsWith("#### ")) {
              const headingText = trimmed.replace(/^####\s+/, "");

              if (inTransitSection && transitBoxOpen) {
                const closing = closeTransitSubBox();
                transitSubBoxOpen = true;
                return `${closing}<div class="transit-sub-box"><h4>${escapeHtml(
                  headingText
                )}</h4>`;
              }

              if (inRoadmapSection && roadmapYearOpen) {
                return `<h4 class="roadmap-label">${escapeHtml(headingText)}</h4>`;
              }

              return `<h4>${escapeHtml(headingText)}</h4>`;
            }

            if (trimmed.startsWith("- ")) {
              return `<p class="bullet">&#8226; ${escapeHtml(
                trimmed.replace(/^-\s+/, "")
              )}</p>`;
            }

            if (isDashaEmphasisLine(trimmed)) {
              const content = `<p class="dasha-emphasis"><strong>${escapeHtml(trimmed)}</strong></p>`;

              if (dashaEmphasisBoxOpen) {
                return content;
              }

              dashaEmphasisBoxOpen = true;
              return `<div class="summary-card dasha-summary-box dasha-ai-box">${content}`;
            }

            return `${closeDashaEmphasisBox()}<p>${escapeHtml(trimmed)}</p>`;
          })
          .join("");

        return `${html}${closeSpecialBlocks()}`;
      };

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
          <section class="pdf-section transit-block">
            <h2>Current Transits</h2>
            <div class="transit-list">
              ${Object.entries(report.transits.transits)
                .map(
                  ([planet, data]: any) => `
                    <div class="transit-card">
                      <div class="transit-body">
                        <h3>${escapeHtml(planet)} in ${escapeHtml(ordinalFromValue(data.house_from_ascendant))} House</h3>
                        <p>${escapeHtml(planet)} is transiting ${escapeHtml(data.sign ?? "-")}. From Moon, it is in the ${escapeHtml(ordinalFromValue(data.house_from_moon))} House.</p>
                      </div>
                      <div class="transit-status">${escapeHtml(data.sign ?? "-")}</div>
                    </div>
                  `
                )
                .join("")}
            </div>
          </section>
        `
        : "";

      const buildBirthChartHtml = (
        title: string,
        chartData?: Record<string, ChartPlanet>
      ) => {
        if (!chartData) {
          return "";
        }

        const signBoxes = SIGNS.map((signName, signIndex) => {
          const planets = Object.entries(chartData)
            .filter(([, data]) => data.sign_index === signIndex)
            .map(([name]) => PLANET_SHORT[name] || name)
            .join("<br />");

          return `
            <div class="chart-box">
              <div class="chart-sign-number">${signIndex + 1}</div>
              <div class="chart-sign-name">${escapeHtml(SIGN_SHORT[signName])}</div>
              <div class="chart-planets">${planets}</div>
            </div>
          `;
        }).join("");

        return `
          <div class="chart-card">
            <h3>${escapeHtml(title)}</h3>
            <div class="chart-grid">
              ${signBoxes}
            </div>
          </div>
        `;
      };

      const birthChartsHtml = report.charts
        ? `
          <section class="pdf-section charts-section">
            <h2>Birth Charts</h2>
            <p class="chart-note">Rashi D1 and Navamsha D9 Chart</p>
            <div class="charts-grid">
              ${buildBirthChartHtml("Rashi D1", report.charts.d1)}
              ${buildBirthChartHtml("Navamsha D9", report.charts.d9)}
            </div>
          </section>
        `
        : "";

      const getScoreClass = (level: string) => {
        if (level === "Strong") return "score-strong";
        if (level === "Moderate") return "score-moderate";
        return "score-attention";
      };

      const buildScoreRows = (items: LifeAreaScore[]) =>
        items
          .map(
            (item) => `
              <div class="score-row">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <small>${escapeHtml(item.meaning)}</small>
                </div>
                <span class="score-circle">${escapeHtml(String(item.score))}/100</span>
              </div>
            `
          )
          .join("");

      const lifeAreaScoresHtml = report.life_area_scores
        ? `
          <section class="pdf-section score-section">
            <h2>Life Area Strengths</h2>
            <p class="score-note">
              Scores are calculated out of 100 and show relative strength of different life areas.
              They are guidance indicators, not fixed guarantees.
            </p>

            <div class="score-summary-grid">
              <div class="score-summary-card strong-card">
                <h3>Top Strong Areas</h3>
                ${buildScoreRows(report.life_area_scores.top_strong)}
              </div>

              <div class="score-summary-card attention-card">
                <h3>Growth Opportunities</h3>
                ${buildScoreRows(report.life_area_scores.top_attention)}
              </div>
            </div>

            <h3 class="score-all-heading">Every Life Category</h3>

            <div class="score-card-grid">
              ${report.life_area_scores.areas
                .map(
                  (item) => `
                    <div class="score-card ${getScoreClass(item.level)}">
                      <small>Area ${escapeHtml(String(item.house))}</small>
                      <strong>${escapeHtml(item.title)}</strong>
                      <span>${escapeHtml(String(item.score))}/100</span>
                      <em>${escapeHtml(item.level)}</em>
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
                      ${report.current_mahadasha?.planet === dasha.planet ? '<span class="active-text">Active</span>' : ''}
                      ${escapeHtml(dasha.start)} to ${escapeHtml(dasha.end)}
                    </p>
                  `
                )
                .join("")}
            </div>
          </section>
        `
        : "";

      const currentAntardasha = report.current_dasha_details?.current_antardasha;
      const nextAntardasha = report.current_dasha_details?.next_antardasha;
      const dashaDetailsHtml =
        report.current_mahadasha ||
        currentAntardasha ||
        report.antardasha_timeline?.length
          ? `
          <section class="pdf-section">
            <h2>Dasha Summary</h2>
            <div class="summary-card dasha-summary-box">
              <p><strong>Current Mahadasha:</strong> ${escapeHtml(report.current_mahadasha?.planet ?? report.current_dasha_details?.current_mahadasha ?? "-")}</p>
              <p><strong>Start Date:</strong> ${escapeHtml(report.current_mahadasha?.start ?? report.current_dasha_details?.mahadasha_start ?? "-")}</p>
              <p><strong>End Date:</strong> ${escapeHtml(report.current_mahadasha?.end ?? report.current_dasha_details?.mahadasha_end ?? "-")}</p>
            </div>
            ${
              currentAntardasha
                ? `
                <div class="summary-card dasha-summary-box">
                  <p><strong>Current Antardasha:</strong> ${escapeHtml(currentAntardasha.antardasha)}</p>
                  <p><strong>Start Date:</strong> ${escapeHtml(currentAntardasha.start)}</p>
                  <p><strong>End Date:</strong> ${escapeHtml(currentAntardasha.end)}</p>
                </div>
              `
                : ""
            }
            ${
              nextAntardasha
                ? `
                <div class="summary-card dasha-summary-box">
                  <p><strong>Next Antardasha:</strong> ${escapeHtml(nextAntardasha.antardasha)}</p>
                  <p><strong>Start Date:</strong> ${escapeHtml(nextAntardasha.start)}</p>
                  <p><strong>End Date:</strong> ${escapeHtml(nextAntardasha.end)}</p>
                </div>
              `
                : ""
            }
            ${buildAntardashaTableHtml()}
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
      pdfElement.style.backgroundColor = "#fffaf0";
      pdfElement.style.color = "#2b1b12";
      pdfElement.style.fontFamily =
        '"Nirmala UI", "Mangal", "Noto Sans Devanagari", "Arial Unicode MS", "Inter", Arial, sans-serif';
      pdfElement.style.fontSize = "16px";
      pdfElement.style.lineHeight = "1.95";

      pdfElement.innerHTML = `
        <style>
          .pdf-page {
            width: 794px;
            min-height: 1123px;
            padding: 32px;
            background: #fffaf0;
            box-sizing: border-box;
            page-break-after: always;
            font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Arial Unicode MS", "Inter", Arial, sans-serif;
            color: #1f1f1f;
          }

          .cover-page {
            min-height: auto !important;
            padding: 36px;
            background: #fffaf0;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
          }

          .report-hero {
            background: #050505 !important;
            border-radius: 16px;
            padding: 46px 32px !important;
            margin-bottom: 24px;
            text-align: center !important;
            display: flex;
            flex-direction: column;
            align-items: center !important;
            justify-content: center !important;
            border: 1px solid #d4af37;
          }

          .report-hero h1,
          .report-hero p {
            width: 100%;
            color: #ffffff !important;
            text-align: center !important;
          }

          .report-hero h1 {
            margin: 0 0 10px !important;
            padding: 0;
            font-size: 36px !important;
            font-weight: 800 !important;
            line-height: 1.2;
            letter-spacing: 0.5px;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .report-hero p {
            margin: 0 !important;
            padding: 0;
            font-size: 18px !important;
            font-weight: 600 !important;
            line-height: 1.4;
          }

          .info-card {
            margin-top: 28px;
            margin-bottom: 16px !important;
            background: #fffaf0;
            border: 1px solid #e2b64d;
            border-radius: 22px;
            padding: 34px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .cover-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px 40px;
          }

          .cover-grid div span {
            display: block;
            margin-bottom: 8px;
            color: #7a2b00;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }

          .cover-grid div strong {
            display: block;
            color: #2b1b12;
            font-size: 18px;
            font-weight: 500;
            line-height: 1.4;
          }

          .report-includes-page {
            min-height: auto !important;
            padding: 36px;
            background: #fffaf0;
            box-sizing: border-box;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .report-includes {
            margin-top: 0;
            background: #ffffff;
            border: 1px solid #ead8b8;
            border-radius: 20px;
            padding: 26px;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 20px !important;
          }

          .report-includes h3 {
            margin: 0 0 18px;
            color: #8b0000;
            font-size: 22px;
            font-weight: 800;
          }

          .cover-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }

          .cover-tags span {
            background: #fff1d6;
            border: 1px solid #d4a017;
            color: #7a2b00;
            border-radius: 999px;
            padding: 9px 15px;
            font-weight: 700;
            font-size: 13px;
          }

          .disclaimer {
            margin-top: 14px !important;
            padding: 18px;
            border-left: 5px solid #8b0000;
            background: #ffffff;
            color: #5f4634;
            font-size: 14px;
            line-height: 1.7;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .pdf-section {
            margin-bottom: 18px;
            page-break-inside: auto;
            break-inside: auto;
          }

          .pdf-section h2 {
            color: #8b0000;
            font-size: 24px;
            font-weight: 800;
            margin: 0 0 18px;
            break-after: avoid;
            page-break-after: avoid;
          }

          .transit-block {
            break-inside: auto;
            page-break-inside: auto;
            margin-bottom: 28px;
          }

          .transit-block h3,
          .transit-block h4 {
            break-after: avoid;
            page-break-after: avoid;
          }

          .charts-section {
            margin: 28px 0;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .pdf-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 18px;
          }

          .chart-card {
            display: flex;
            flex-direction: column;
            min-height: 360px;
            background: #ffffff;
            border: 1px solid #ead8b8;
            border-radius: 14px;
            padding: 18px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .pdf-card,
          .chart-card,
          .score-card,
          .transit-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .transit-list {
            display: block;
          }

          .transit-card {
            display: flex;
            align-items: center;
            gap: 16px;
            border: 1px solid #e2b64d;
            border-radius: 14px;
            padding: 18px;
            margin-bottom: 16px;
            background: #ffffff !important;
            page-break-inside: avoid;
          }

          .transit-body {
            flex: 1;
          }

          .transit-body h3 {
            margin: 0 0 6px;
            color: #111111;
            font-size: 18px;
            font-weight: 800;
            line-height: 1.35;
          }

          .transit-body p {
            margin: 0;
            font-size: 14px;
            line-height: 1.45;
            background: transparent !important;
          }

          .transit-status {
            min-width: 110px;
            text-align: center;
            border-radius: 999px;
            padding: 8px 14px;
            font-weight: 800;
            font-size: 13px;
            background: #fff3df;
            color: #8b0000;
          }

          .dasha-summary,
          .dasha-summary-box {
            font-size: 17px;
            line-height: 1.8;
            margin-bottom: 20px;
          }

          .summary-card {
            border: 1px solid #ead8b8;
            background: #ffffff !important;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 18px;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .summary-card div {
            margin-bottom: 10px;
            font-size: 15px;
          }

          .summary-card strong {
            font-weight: 800;
          }

          .dasha-summary-box {
            margin: 12px 0 18px !important;
            padding: 16px !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .dasha-ai-box {
            display: block;
            width: 100%;
            box-sizing: border-box;
          }

          .dasha-summary p,
          .dasha-summary-box p,
          .dasha-emphasis {
            color: #111111 !important;
            font-size: 16px !important;
            font-weight: 800 !important;
            margin: 0 0 12px !important;
            background: transparent !important;
            padding: 3px 0 4px !important;
            line-height: 1.75 !important;
            overflow: visible !important;
          }

          .dasha-summary strong,
          .dasha-summary-box strong,
          .dasha-emphasis strong {
            font-weight: 900;
            color: #111111;
          }

          .dasha-table {
            width: 100%;
            border-collapse: collapse;
            margin: 14px 0 18px;
            border-radius: 12px;
            overflow: hidden;
            font-size: 15px;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .dasha-table th {
            background: #9b0000 !important;
            color: #ffffff !important;
            padding: 12px;
            text-align: left;
            font-weight: 800;
          }

          .dasha-table td {
            padding: 12px;
            border-bottom: 1px solid #ead8b8;
            font-weight: 700 !important;
            color: #111111 !important;
          }

          .dasha-table td strong {
            font-weight: 800 !important;
            color: #111111 !important;
          }

          .dasha-table tr:nth-child(even) td {
            background: #fff7e8 !important;
          }

          .chart-card h3 {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 40px;
            margin: 0 0 14px;
            padding: 0;
            color: #8b0000;
            font-size: 17px;
            font-weight: 800;
            line-height: 1.4;
            text-align: center;
          }

          .chart-note {
            margin-top: -4px;
            color: #6b4a35;
            font-size: 14px;
          }

          .chart-grid {
            display: grid;
            flex: 1;
            grid-template-columns: repeat(4, 1fr);
            border: 4px solid #d4a017;
            text-align: center;
            height: 255px;
          }

          .chart-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            min-height: 85px;
            border: 2px solid #d4a017;
            background: #fffaf2;
            padding: 6px 4px;
            box-sizing: border-box;
          }

          .chart-sign-number {
            color: #5c0000;
            font-size: 10px;
            font-weight: 800;
            line-height: 1.2;
          }

          .chart-sign-name {
            margin-top: 3px;
            color: #8b0000;
            font-size: 8px;
            font-weight: 700;
            line-height: 1.2;
          }

          .chart-planets {
            margin-top: 6px;
            color: #2b1b12;
            font-size: 13px;
            font-weight: 700;
            line-height: 1.2;
          }

          .score-section {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .score-note {
            margin: 0 0 14px;
            color: #6b4a35;
            font-size: 14px;
            line-height: 1.6;
          }

          .score-summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 18px;
          }

          .score-summary-card {
            min-height: 172px;
            padding: 18px;
            border-radius: 16px;
            background: #ffffff;
            break-inside: avoid;
          }

          .score-summary-card h3 {
            margin: 0 0 14px;
            padding: 0;
            font-size: 16px;
            line-height: 1.4;
          }

          .strong-card {
            border: 2px solid #15803d;
          }

          .strong-card h3 {
            color: #15803d;
          }

          .attention-card {
            border: 2px solid #dc2626;
          }

          .attention-card h3 {
            color: #b91c1c;
          }

          .score-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
          }

          .score-row strong,
          .score-row small {
            display: block;
          }

          .score-row strong {
            color: #2b1b12;
            font-size: 15px;
          }

          .score-row small {
            margin-top: 2px;
            color: #6b4a35;
            font-size: 11px;
            line-height: 1.35;
          }

          .score-circle {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: #a40000;
            color: #ffffff;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center;
            font-weight: 700;
            font-size: 15px;
            padding: 0 !important;
            line-height: 1 !important;
            box-sizing: border-box !important;
            flex: 0 0 auto;
          }

          .score-all-heading {
            margin: 24px 0 14px;
            color: #750606;
            font-size: 18px;
            font-weight: 800;
          }

          .score-card-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
          }

          .score-card {
            min-height: 112px;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid #ead8b8;
            background: #ffffff;
            box-sizing: border-box;
            break-inside: avoid;
          }

          .score-card small,
          .score-card strong,
          .score-card span,
          .score-card em {
            display: block;
          }

          .score-card small {
            color: #6b4a35;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .score-card strong {
            min-height: 38px;
            margin-top: 6px;
            color: #2b1b12;
            font-size: 13px;
            line-height: 1.25;
          }

          .score-card span {
            margin-top: 8px;
            font-size: 24px;
            font-weight: 900;
            line-height: 1;
          }

          .score-card em {
            margin-top: 5px;
            color: #4b3528;
            font-size: 11px;
            font-style: normal;
          }

          .score-strong {
            border-color: #16a34a;
            background: #f0fdf4;
          }

          .score-strong span {
            color: #15803d;
          }

          .score-moderate {
            border-color: #d97706;
            background: #fffbeb;
          }

          .score-moderate span {
            color: #b45309;
          }

          .score-attention {
            border-color: #dc2626;
            background: #fef2f2;
          }

          .score-attention span {
            color: #dc2626;
          }

          .pdf-card {
            padding: 12px;
            border: 1px solid #ead8b8;
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 3px 10px rgba(75, 40, 10, 0.08);
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
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0 0 6px;
            padding-bottom: 6px;
            border-bottom: 1px solid #eeeaf8;
            break-inside: avoid;
          }

          .active-text {
            color: #a40000 !important;
            font-size: 14px;
            font-weight: 800;
            line-height: 1;
            background: transparent !important;
            border: 0 !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }

          .active-badge,
          .active-dasha {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 8px;
            min-width: 100px !important;
            height: 34px !important;
            padding: 0 16px !important;
            border-radius: 999px !important;
            background: #a40000 !important;
            color: #ffffff !important;
            font-size: 14px;
            font-weight: 700;
            line-height: 34px !important;
            text-align: center !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
          }

          .pdf-content,
          .pdf-content section,
          .pdf-content p,
          .pdf-content li {
            background: transparent !important;
          }

          .pdf-flow > p,
          .pdf-flow > .bullet,
          .pdf-flow > li,
          .report-content p,
          .report-content li {
            background: transparent !important;
            padding: 0 !important;
          }

          .info-card,
          .chart-card,
          .life-card,
          .summary-card,
          .transit-card,
          .transit-box,
          .roadmap-year,
          .final-observation,
          .dasha-table {
            background: #ffffff !important;
          }

          .transit-box {
            border: 1px solid #d4af37;
            border-radius: 12px;
            padding: 16px;
            margin: 14px 0;
            background: #ffffff !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .transit-box h3 {
            margin: 0 0 10px;
            color: #8b0000;
            font-size: 20px;
            font-weight: 800;
            line-height: 1.45;
          }

          .transit-sub-box {
            border-left: 4px solid #9b0000;
            padding: 10px 14px;
            margin: 10px 0;
            background: #ffffff !important;
            border-radius: 10px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .transit-sub-box h4 {
            margin: 0 0 8px;
            padding: 0;
            color: #8b0000;
            font-size: 16px;
            font-weight: 800;
            line-height: 1.45;
          }

          .roadmap-year {
            margin: 12px 0;
            padding: 16px;
            border: 1px solid #d4af37;
            border-radius: 12px;
            background: #ffffff !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .roadmap-year h3 {
            margin: 0 0 8px;
            padding: 0;
            color: #8b0000;
            font-size: 20px;
            font-weight: 800;
            line-height: 1.45;
          }

          .roadmap-year .roadmap-label {
            margin: 8px 0 4px;
            padding: 0;
            color: #8b0000;
            font-size: 15px;
            font-weight: 800;
            line-height: 1.45;
          }

          .final-observation {
            margin-top: 20px;
            padding: 18px;
            border: 1.5px solid #d4af37;
            border-radius: 12px;
            background: #ffffff !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .final-observation h2 {
            color: #8b0000;
            margin: 0 0 10px;
          }

          .transit-analysis-section {
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-inside: auto !important;
          }

          .transit-analysis-section h2 {
            margin-bottom: 14px !important;
          }

          .dasha-timeline-section {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .pdf-content h1 {
            margin: 30px 0 20px;
            padding: 20px 0 12px;
            color: #750606;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.9;
            break-after: avoid;
            box-sizing: border-box;
            overflow: visible;
            text-align: center;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .pdf-content h2 {
            margin: 18px 0 10px;
            padding: 14px 0 8px;
            color: #8b0000;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.9;
            break-after: avoid;
            box-sizing: border-box;
            overflow: visible;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .pdf-content h2.part-heading {
            margin-bottom: 25px;
          }

          .pdf-content h3 {
            margin: 16px 0 10px;
            padding: 12px 0 8px;
            color: #8b0000;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.9;
            break-after: avoid;
            box-sizing: border-box;
            overflow: visible;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .pdf-content h4 {
            margin: 16px 0 8px;
            padding: 10px 0 7px;
            color: #750606;
            font-size: 15px;
            font-weight: 800;
            line-height: 1.85;
            break-after: avoid;
            font-family: "Ubuntu", "Noto Sans Devanagari", "Mangal", "Nirmala UI", Arial, sans-serif;
          }

          .pdf-content .transit-box h3 {
            margin: 0 0 10px;
            padding: 0;
            color: #8b0000;
            font-size: 20px;
            font-weight: 800;
            line-height: 1.45;
          }

          .pdf-content .transit-sub-box h4 {
            margin: 0 0 10px;
            padding: 0;
            color: #8b0000;
            font-size: 20px;
            font-weight: 800;
            line-height: 1.45;
          }

          .pdf-content p {
            margin: 0 0 18px;
            padding: 8px 0 10px !important;
            background: transparent !important;
            font-family: "Nirmala UI", "Mangal", "Noto Sans Devanagari", "Arial Unicode MS", "Inter", Arial, sans-serif;
            font-size: 16px;
            line-height: 1.95;
            font-weight: 400;
            text-align: left;
            word-break: normal;
            overflow-wrap: break-word;
            break-inside: avoid;
            box-sizing: border-box;
            overflow: visible;
            white-space: normal;
            orphans: 3;
            widows: 3;
          }

          .pdf-content .bullet {
            margin-left: 14px;
            font-size: 16px;
            line-height: 1.95;
            padding: 7px 0 9px !important;
          }

          .pdf-content .gap {
            height: 8px;
          }

          .page-break-before {
            height: 0;
            margin: 0;
            padding: 0;
            break-before: page;
            page-break-before: always;
          }

          .force-new-page {
            break-before: auto !important;
            page-break-before: auto !important;
          }

          .no-large-gap {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
        </style>

        <main class="pdf-content pdf-flow" style="width: 794px; background: #fffaf0;">
          <section class="cover-page">
            <div class="report-hero">
              <h1>Shrivinayaka Astrology</h1>
              <p>${escapeHtml(report.cover_title || getCoverTitle(report.report_style || "full"))}</p>
            </div>

            <div class="info-card">
              <div class="cover-grid">
                <div><span>Name</span><strong>${escapeHtml(report.name)}</strong></div>
                <div><span>Report Type</span><strong>${escapeHtml(report.report_type_label || getReportStyleLabel(report.report_style || "full"))}</strong></div>
                <div><span>Language</span><strong>${escapeHtml(formatLabel(report.language ?? "hindi"))}</strong></div>
                <div><span>Report ID</span><strong>${escapeHtml(report.display_report_id ?? "-")}</strong></div>
                <div><span>Date of Birth</span><strong>${escapeHtml(report.input?.birth_date ?? "-")}</strong></div>
                <div><span>Time of Birth</span><strong>${escapeHtml(report.input?.birth_time ?? "-")}</strong></div>
                <div><span>Birth Place</span><strong>${escapeHtml(report.input?.birth_place ?? "-")}</strong></div>
                <div><span>Generated On</span><strong>${escapeHtml(report.generated_on ?? "-")}</strong></div>
                <div><span>Mahadasha</span><strong>${escapeHtml(report.current_mahadasha?.planet ?? "-")}</strong></div>
                <div><span>Mahadasha Period</span><strong>${escapeHtml(report.current_mahadasha?.start ?? "-")} to ${escapeHtml(report.current_mahadasha?.end ?? "-")}</strong></div>
                <div><span>Employment Status</span><strong>${escapeHtml(report.input?.employment_status ?? "-")}</strong></div>
                <div><span>Relationship Status</span><strong>${escapeHtml(report.input?.relationship_status ?? "-")}</strong></div>
                <div><span>Latitude</span><strong>${escapeHtml(report.latitude !== undefined ? String(report.latitude) : "-")}</strong></div>
                <div><span>Longitude</span><strong>${escapeHtml(report.longitude !== undefined ? String(report.longitude) : "-")}</strong></div>
              </div>
            </div>

          </section>

          <section class="report-includes-page">
            <div class="report-includes">
              <h3>Report Includes</h3>
              <div class="cover-tags">
                <span>Birth Chart</span>
                <span>D1 &amp; D9 Charts</span>
                <span>Mahadasha</span>
                <span>Current Transits</span>
                <span>Life Area Scores</span>
                <span>Personal Consultation</span>
              </div>
            </div>

            <div class="disclaimer disclaimer-box">
              This report is based on Vedic astrology principles and is intended for guidance and self-reflection.
            </div>
          </section>

          ${chartHtml}
          ${transitsHtml}
          ${birthChartsHtml}
          ${dashaDetailsHtml}
          ${dashaTimelineHtml}
          ${lifeAreaScoresHtml}
          <div class="page-break-before"></div>
          ${markdownToHtml(keepOnlyLastFinalObservation(formatReportMarkdown(report.report)))}
        </main>
      `;

      document.body.appendChild(pdfElement);
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 500));

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

      const addCanvasPdfFooters = () => {
        const totalPages = pdf.getNumberOfPages();

        for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
          pdf.setPage(pageNumber);
          pdf.setDrawColor(225, 225, 235);
          pdf.line(pageMargin, pdfHeight - 12, pdfWidth - pageMargin, pdfHeight - 12);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(95, 95, 105);
          pdf.text("Shrivinayaka AI Astrology • shrivinayakaastrology.com", pageMargin, pdfHeight - 7);
          pdf.text(`Page ${pageNumber} of ${totalPages}`, pdfWidth - pageMargin, pdfHeight - 7, {
            align: "right",
          });
        }
      };

      for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
        const block = blocks[blockIndex];
        const tagName = block.tagName.toLowerCase();

        if (block.classList.contains("page-break-before")) {
          if (y > pageMargin) {
            pdf.addPage();
          }
          y = pageMargin;
          continue;
        }

        if (block.classList.contains("cover-page") && y > pageMargin) {
          pdf.addPage();
          y = pageMargin;
        }

        if ((tagName === "h1" || tagName === "h2" || tagName === "h3") && y > pdfHeight - 52) {
          pdf.addPage();
          y = pageMargin;
        }

        const canvas = await html2canvas(block, {
          scale: 2,
          backgroundColor: null,
          useCORS: true,
          windowWidth: flow.scrollWidth,
        });

        const pageImgData = canvas.toDataURL("image/png");
        const imageHeight = (canvas.height * imgWidth) / canvas.width;
        const maxImageHeight = bottomLimit - pageMargin;

        if (imageHeight > maxImageHeight) {
          if (y > pageMargin) {
            pdf.addPage();
            y = pageMargin;
          }

          let sourceY = 0;

          while (sourceY < canvas.height) {
            const availableHeight = bottomLimit - y;
            const sliceHeightPx = Math.min(
              canvas.height - sourceY,
              Math.floor((availableHeight * canvas.width) / imgWidth)
            );

            if (sliceHeightPx <= 0) {
              pdf.addPage();
              y = pageMargin;
              continue;
            }

            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeightPx;

            const sliceContext = sliceCanvas.getContext("2d");

            if (!sliceContext) {
              throw new Error("Unable to create PDF page slice");
            }

            sliceContext.drawImage(
              canvas,
              0,
              sourceY,
              canvas.width,
              sliceHeightPx,
              0,
              0,
              canvas.width,
              sliceHeightPx
            );

            const sliceImageHeight = (sliceHeightPx * imgWidth) / canvas.width;
            pdf.addImage(
              sliceCanvas.toDataURL("image/png"),
              "PNG",
              pageMargin,
              y,
              imgWidth,
              sliceImageHeight
            );

            sourceY += sliceHeightPx;

            if (sourceY < canvas.height) {
              pdf.addPage();
              y = pageMargin;
            } else {
              y += sliceImageHeight + 3.5;
            }
          }

          continue;
        }

        if (y + imageHeight > bottomLimit && y > pageMargin) {
          pdf.addPage();
          y = pageMargin;
        }

        pdf.addImage(pageImgData, "PNG", pageMargin, y, imgWidth, imageHeight);
        y += imageHeight + 3.5;
      }

      addCanvasPdfFooters();
      document.body.removeChild(pdfElement);

      pdf.save(pdfFileName);
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

      const purple: [number, number, number] = [139, 0, 0];
      const palePurple: [number, number, number] = [255, 250, 240];
      const gold: [number, number, number] = [184, 134, 11];
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

      const addFooter = (pageNumber = pdf.getNumberOfPages(), totalPages = pdf.getNumberOfPages()) => {
        pdf.setDrawColor(225, 225, 235);
        pdf.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        setColor(muted);
        pdf.text("Shrivinayaka AI Astrology • shrivinayakaastrology.com", margin, pageHeight - 9);
        pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 9, {
          align: "right",
        });
      };

      const addFooters = () => {
        const totalPages = pdf.getNumberOfPages();

        for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
          pdf.setPage(pageNumber);
          addFooter(pageNumber, totalPages);
        }
      };

      const newPage = () => {
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

      const drawCoverPage = () => {
        const coverTitle = report.cover_title || getCoverTitle(report.report_style || "full");
        const label = (value?: string | number | null) =>
          value === undefined || value === null || value === "" ? "-" : String(value);

        pdf.setFillColor(255, 250, 242);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");

        pdf.setFillColor(5, 5, 5);
        pdf.setDrawColor(212, 175, 55);
        pdf.roundedRect(margin, 18, contentWidth, 66, 6, 6, "FD");
        pdf.setFillColor(212, 175, 55);
        pdf.rect(margin, 80, contentWidth, 3, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(29);
        pdf.setTextColor(212, 175, 55);
        pdf.text("Shrivinayaka Astrology", pageWidth / 2, 42, {
          align: "center",
        });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(13.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(coverTitle, pageWidth / 2, 58, {
          align: "center",
          maxWidth: contentWidth - 18,
        });

        const cardY = 98;
        pdf.setFillColor(255, 250, 240);
        pdf.setDrawColor(226, 182, 77);
        pdf.roundedRect(margin, cardY, contentWidth, 104, 4, 4, "FD");

        const fields = [
          ["Name", report.name],
          ["Report Type", report.report_type_label || getReportStyleLabel(report.report_style || "full")],
          ["Language", report.language],
          ["Report ID", report.display_report_id],
          ["Date of Birth", report.input?.birth_date],
          ["Time of Birth", report.input?.birth_time],
          ["Birth Place", report.input?.birth_place],
          ["Generated On", report.generated_on],
          ["Mahadasha", report.current_mahadasha?.planet],
          ["Mahadasha Period", `${report.current_mahadasha?.start ?? "-"} to ${report.current_mahadasha?.end ?? "-"}`],
          ["Employment Status", report.input?.employment_status],
          ["Relationship Status", report.input?.relationship_status],
          ["Latitude", report.latitude],
          ["Longitude", report.longitude],
        ];

        const colWidth = contentWidth / 2;
        fields.forEach(([fieldLabel, value], index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const x = margin + 10 + col * colWidth;
          const fieldY = cardY + 13 + row * 13;

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.setTextColor(122, 43, 0);
          pdf.text(String(fieldLabel).toUpperCase(), x, fieldY);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10.5);
          setColor(ink);
          pdf.text(label(value), x, fieldY + 5, {
            maxWidth: colWidth - 18,
          });
        });

        const noteY = 216;
        pdf.setFillColor(255, 250, 240);
        pdf.setDrawColor(234, 216, 184);
        pdf.roundedRect(margin, noteY, contentWidth, 44, 4, 4, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(139, 0, 0);
        pdf.text("Report Includes", margin + 8, noteY + 11);

        const tags = [
          "Birth Chart",
          "D1 & D9 Charts",
          "Mahadasha",
          "Current Transits",
          "Life Area Scores",
          "Personal Consultation",
        ];

        let tagX = margin + 8;
        let tagY = noteY + 22;
        tags.forEach((tag) => {
          const tagWidth = pdf.getTextWidth(tag) + 12;
          if (tagX + tagWidth > pageWidth - margin - 8) {
            tagX = margin + 8;
            tagY += 11;
          }

          pdf.setFillColor(255, 241, 214);
          pdf.setDrawColor(212, 160, 23);
          pdf.roundedRect(tagX, tagY - 5, tagWidth, 8, 4, 4, "FD");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.setTextColor(122, 43, 0);
          pdf.text(tag, tagX + 6, tagY);
          tagX += tagWidth + 4;
        });

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(139, 0, 0);
        pdf.roundedRect(margin, 260, contentWidth, 15, 2, 2, "FD");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(95, 70, 52);
        pdf.text(
          "This report is based on Vedic astrology principles and is intended for guidance and self-reflection.",
          margin + 7,
          269,
          { maxWidth: contentWidth - 14 }
        );

        pdf.addPage();
        y = 24;
      };

      const drawHeader = () => {
        pdf.setFillColor(5, 5, 5);
        pdf.rect(0, 0, pageWidth, 46, "F");
        pdf.setFillColor(212, 175, 55);
        pdf.rect(0, 43, pageWidth, 3, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(24);
        pdf.setTextColor(212, 175, 55);
        pdf.text("Shrivinayaka Astrology", pageWidth / 2, 20, {
          align: "center",
        });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        const coverTitle = report.cover_title || getCoverTitle(report.report_style || "full");
        pdf.text(coverTitle, pageWidth / 2, 31, {
          align: "center",
          maxWidth: contentWidth,
        });
        y = 60;
      };

      const drawInfoCard = () => {
        ensureSpace(66);
        pdf.setFillColor(palePurple[0], palePurple[1], palePurple[2]);
        pdf.setDrawColor(220, 205, 250);
        pdf.roundedRect(margin, y, contentWidth, 58, 3, 3, "FD");

        keyValue("Name", report.name, margin + 7, y + 11);
        keyValue(
          "Report Type",
          report.report_type_label || getReportStyleLabel(report.report_style || "full"),
          margin + 70,
          y + 11
        );
        keyValue("Report ID", report.display_report_id ?? "-", margin + 7, y + 29);
        keyValue("Generated On", report.generated_on ?? "-", margin + 70, y + 29);
        keyValue(
          "Current Mahadasha",
          `${report.current_mahadasha?.planet ?? "-"} Mahadasha`,
          margin + 7,
          y + 47
        );
        keyValue(
          "Period",
          `${report.current_mahadasha?.start ?? "-"} to ${report.current_mahadasha?.end ?? "-"}`,
          margin + 70,
          y + 47
        );
        y += 68;
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
            `${planet} in ${ordinalFromValue(data.house_from_ascendant)} House`,
            x + 4,
            y + 25
          );
          pdf.text(
            `${ordinalFromValue(data.house_from_moon)} House from Moon`,
            x + 4,
            y + 32
          );

          if (col === columns - 1 || index === entries.length - 1) {
            y += cardHeight + 5;
          }
        });

        y += 3;
      };

      const drawOneBirthChart = (
        title: string,
        chartData: Record<string, ChartPlanet>,
        x: number,
        topY: number,
        width: number
      ) => {
        const titleHeight = 8;
        const gridTop = topY + titleHeight;
        const columns = 4;
        const rows = 3;
        const cellWidth = width / columns;
        const cellHeight = 19;
        const gridHeight = cellHeight * rows;

        pdf.setDrawColor(212, 160, 23);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, topY, width, titleHeight + gridHeight + 4, 2, 2, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        setColor(purple);
        pdf.text(title, x + width / 2, topY + 5.5, { align: "center" });

        SIGNS.forEach((signName, signIndex) => {
          const col = signIndex % columns;
          const row = Math.floor(signIndex / columns);
          const cellX = x + col * cellWidth;
          const cellY = gridTop + row * cellHeight;

          pdf.setDrawColor(212, 160, 23);
          pdf.setFillColor(255, 250, 242);
          pdf.rect(cellX, cellY, cellWidth, cellHeight, "FD");

          const planets = Object.entries(chartData)
            .filter(([, data]) => data.sign_index === signIndex)
            .map(([name]) => PLANET_SHORT[name] || name);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6);
          setColor(purple);
          pdf.text(String(signIndex + 1), cellX + cellWidth / 2, cellY + 3.5, {
            align: "center",
          });

          pdf.setFontSize(5);
          setColor(gold);
          pdf.text(SIGN_SHORT[signName], cellX + cellWidth / 2, cellY + 7.5, {
            align: "center",
            maxWidth: cellWidth - 2,
          });

          if (planets.length) {
            pdf.setFontSize(8);
            setColor(ink);
            pdf.text(planets, cellX + cellWidth / 2, cellY + 12, {
              align: "center",
              lineHeightFactor: 1.05,
              maxWidth: cellWidth - 2,
            });
          }
        });

        return titleHeight + gridHeight + 4;
      };

      const drawBirthCharts = () => {
        if (!report.charts) {
          return;
        }

        sectionHeading("Birth Charts");
        writeWrapped("Rashi D1 and Navamsha D9 Chart", {
          size: 10.5,
          color: muted,
          after: 5,
        });

        const gap = 6;
        const chartWidth = (contentWidth - gap) / 2;
        const chartHeight = 69;
        ensureSpace(chartHeight + 8);

        const startY = y;
        drawOneBirthChart("Rashi D1", report.charts.d1, margin, startY, chartWidth);
        drawOneBirthChart(
          "Navamsha D9",
          report.charts.d9,
          margin + chartWidth + gap,
          startY,
          chartWidth
        );

        y += chartHeight + 8;
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
          let dateX = margin + 38;

          if (report.current_mahadasha?.planet === dasha.planet) {
            pdf.setFillColor(139, 0, 0);
            pdf.roundedRect(margin + 22, y - 6, 25, 8.5, 4.25, 4.25, "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(6);
            pdf.setTextColor(255, 255, 255);
            pdf.text("Active Now", margin + 34.5, y - 1.2, { align: "center" });
            dateX = margin + 51;
          }

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10.5);
          setColor(muted);
          pdf.text(`${dasha.start} to ${dasha.end}`, dateX, y);
          y += 7;
        });
        y += 5;
      };

      const scoreColor = (level: string): [number, number, number] => {
        if (level === "Strong") return [21, 128, 61];
        if (level === "Moderate") return [180, 83, 9];
        return [220, 38, 38];
      };

      const drawScoreSummary = (
        title: string,
        items: LifeAreaScore[],
        x: number,
        topY: number,
        width: number,
        border: [number, number, number]
      ) => {
        pdf.setDrawColor(border[0], border[1], border[2]);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, topY, width, 48, 3, 3, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(border[0], border[1], border[2]);
        pdf.text(title, x + 5, topY + 8);

        items.forEach((item, index) => {
          const rowY = topY + 17 + index * 10;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          setColor(ink);
          pdf.text(item.title, x + 5, rowY, { maxWidth: width - 31 });

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.2);
          setColor(muted);
          pdf.text(item.meaning, x + 5, rowY + 4, { maxWidth: width - 31 });

          pdf.setFillColor(border[0], border[1], border[2]);
          pdf.roundedRect(x + width - 31, rowY - 7, 25, 10, 5, 5, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7);
          pdf.setTextColor(255, 255, 255);
          pdf.text(`${item.score}/100`, x + width - 18.5, rowY - 2.45, {
            align: "center",
          });
        });
      };

      const drawLifeAreaScores = () => {
        if (!report.life_area_scores) {
          return;
        }

        sectionHeading("Life Area Strengths");
        writeWrapped(
          "These scores show relative strength of different life areas based on your birth chart. They are guidance indicators, not fixed guarantees.",
          {
            size: 10.5,
            color: muted,
            after: 5,
          }
        );

        const gap = 6;
        const summaryWidth = (contentWidth - gap) / 2;
        ensureSpace(58);
        const summaryY = y;
        drawScoreSummary(
          "Top Strong Areas",
          report.life_area_scores.top_strong,
          margin,
          summaryY,
          summaryWidth,
          [21, 128, 61]
        );
        drawScoreSummary(
          "Growth Opportunities",
          report.life_area_scores.top_attention,
          margin + summaryWidth + gap,
          summaryY,
          summaryWidth,
          [220, 38, 38]
        );
        y += 55;

        writeWrapped("Every Life Category", {
          size: 13,
          style: "bold",
          color: purple,
          before: 2,
          after: 5,
          lineFactor: 1.2,
        });

        const columns = 4;
        const cardGap = 4;
        const cardWidth = (contentWidth - cardGap * (columns - 1)) / columns;
        const cardHeight = 29;

        report.life_area_scores.areas.forEach((item, index) => {
          const col = index % columns;
          const x = margin + col * (cardWidth + cardGap);

          if (col === 0) {
            ensureSpace(cardHeight + 5);
          }

          const color = scoreColor(item.level);
          if (item.level === "Strong") {
            pdf.setFillColor(240, 253, 244);
          } else if (item.level === "Moderate") {
            pdf.setFillColor(255, 251, 235);
          } else {
            pdf.setFillColor(254, 242, 242);
          }
          pdf.setDrawColor(color[0], color[1], color[2]);
          pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.8);
          setColor(muted);
          pdf.text(`AREA ${item.house}`, x + 3, y + 5);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          setColor(ink);
          pdf.text(item.title, x + 3, y + 11, { maxWidth: cardWidth - 6 });

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10.5);
          pdf.setTextColor(color[0], color[1], color[2]);
          pdf.text(`${item.score}/100`, x + 3, y + 22);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.2);
          setColor(muted);
          pdf.text(item.level, x + 17, y + 21.5, { maxWidth: cardWidth - 20 });

          if (col === columns - 1 || index === report.life_area_scores!.areas.length - 1) {
            y += cardHeight + 5;
          }
        });

        y += 4;
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

      drawCoverPage();
      drawChart();
      drawTransits();
      drawBirthCharts();
      drawDashaTimeline();
      drawLifeAreaScores();
      writeReport();
      addFooters();

      pdf.save(pdfFileName);
    } catch (error) {
      console.error(error);
      alert("PDF download failed");
    } finally {
      setPdfLoading(false);
    }
  };

  const choosePremiumReport = (reportStyle: string) => {
    setFormData({
      ...formData,
      report_type: "premium",
      report_style: reportStyle,
    });

    document.getElementById("report-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const chooseFreeReport = () => {
    setFormData({
      ...formData,
      report_type: "free",
    });

    document.getElementById("report-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const getSelectedPrice = () => {
    if (formData.report_type === "free") return "₹0";
    if (formData.report_style === "consultation") return "₹49";
    if (formData.report_style === "full_plus_consultation") return "₹149";
    return "₹99";
  };

  return (
    <main className="min-h-screen bg-[#fffaf2] text-[#2b1b12]">
      <div className="mx-auto max-w-6xl px-6 py-10">

        <section className="grid gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-[#d4a017] bg-[#fff6e6] px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8b0000]">
              Shrivinayaka AI Astrology
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-[#5c0000] md:text-6xl">
              AI Vedic Astrology Report
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4b3528]">
              Get a personalized Vedic astrology PDF report based on your birth chart, Mahadasha, current Saturn/Jupiter/Rahu/Ketu transits and one personal question.
            </p>
            <p className="mt-3 text-[#6b4a35]">
              Available in English, Hindi and Hinglish.
            </p>
            <button
              type="button"
              onClick={() =>
                document.getElementById("report-form")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="mt-8 rounded-xl bg-[#8b0000] px-7 py-4 font-bold text-white hover:bg-[#5c0000]"
            >
              Generate My Report
            </button>
          </div>

          <div className="rounded-2xl border border-[#ead8b8] bg-white p-6 shadow-md">
            <h2 className="mb-5 text-2xl font-bold text-[#5c0000]">
              Simple reports for real-life questions
            </h2>
            <div className="space-y-4 text-[#4b3528]">
              <p>When will my career improve?</p>
              <p>Will marriage happen?</p>
              <p>How will health remain?</p>
              <p>When will money improve?</p>
            </div>
          </div>
        </section>

        <section className="py-10">
          <h2 className="mb-6 text-3xl font-bold text-[#5c0000]">
            Choose Your Report
          </h2>
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-[#d4a017] bg-[#fff1d6] p-4 text-center text-[#7a2b00]">
            <p className="font-bold">Limited Launch Offer</p>
            <p className="mt-1 text-sm">
              Special introductory pricing for early users. Prices may increase after launch period.
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-[#d4a017] bg-[#fff6e6] p-6 shadow-md">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#d4a017] px-3 py-1 text-sm font-bold text-[#2b1b12]">
                FREE
              </span>
              <h3 className="text-2xl font-bold text-[#5c0000]">
                Free Mini Astrology Report
              </h3>
              <p className="text-3xl font-bold text-[#8b0000]">₹0</p>
            </div>

            <p className="mt-4 text-[#4b3528]">
              Generate a free mini astrology report based on your birth chart. Get a quick overview of your personality, strengths, weaknesses, current Mahadasha and key life themes.
            </p>

            <ul className="mt-4 space-y-2 text-[#4b3528]">
              <li>✓ Personality Overview</li>
              <li>✓ Current Mahadasha</li>
              <li>✓ Basic Career Tendencies</li>
              <li>✓ Basic Relationship Tendencies</li>
              <li>✓ 2-3 Page PDF</li>
            </ul>

            <p className="mt-4 font-semibold text-[#8b0000]">
              Does not include personal questions, detailed timing, transit analysis or consultation.
            </p>

            <button
              type="button"
              onClick={chooseFreeReport}
              className="mt-6 rounded-xl bg-[#8b0000] px-5 py-3 font-bold text-white hover:bg-[#5c0000]"
            >
              Generate Free Report
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="flex h-full min-h-[700px] flex-col rounded-[20px] border border-[#ead8b8] bg-white p-[30px] shadow-md transition hover:-translate-y-1">
              <h3 className="text-2xl font-bold text-[#5c0000]">Personal Consultation Report</h3>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-4xl font-extrabold text-[#8b0000]">₹49</p>
                <p className="pb-1 text-lg text-gray-500 line-through">₹75</p>
              </div>
              <p className="mt-3 inline-block rounded-full bg-[#fff1d6] px-3 py-1 text-sm font-bold text-[#7a2b00]">
                Launch Offer
              </p>
              <ul className="mt-5 flex-1 space-y-3 text-[#4b3528]">
                <li>Ask one important question</li>
                <li>Dasha + transit based answer</li>
                <li>Timing guidance</li>
                <li>Practical advice</li>
                <li>PDF download</li>
              </ul>
              <button
                type="button"
                onClick={() => choosePremiumReport("consultation")}
                className="mt-auto h-16 min-h-16 max-h-16 w-full rounded-[14px] border-0 bg-[#a40000] px-5 text-lg font-bold text-white hover:bg-[#8b0000]"
              >
                Select
              </button>
            </div>

            <div className="flex h-full min-h-[700px] flex-col rounded-[20px] border border-[#ead8b8] bg-white p-[30px] shadow-md transition hover:-translate-y-1">
              <h3 className="text-2xl font-bold text-[#5c0000]">Complete Astrology Report</h3>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-4xl font-extrabold text-[#8b0000]">₹99</p>
                <p className="pb-1 text-lg text-gray-500 line-through">₹125</p>
              </div>
              <p className="mt-3 inline-block rounded-full bg-[#fff1d6] px-3 py-1 text-sm font-bold text-[#7a2b00]">
                Launch Offer
              </p>
              <ul className="mt-5 flex-1 space-y-3 text-[#4b3528]">
                <li>Personality analysis</li>
                <li>Career and finance</li>
                <li>Marriage and relationships</li>
                <li>Health and wellbeing</li>
                <li>Mahadasha and transits</li>
                <li>D1 + D9 charts</li>
                <li>Life area scores</li>
              </ul>
              <button
                type="button"
                onClick={() => choosePremiumReport("full")}
                className="mt-auto h-16 min-h-16 max-h-16 w-full rounded-[14px] border-0 bg-[#a40000] px-5 text-lg font-bold text-white hover:bg-[#8b0000]"
              >
                Select
              </button>
            </div>

            <div className={`flex h-full min-h-[700px] flex-col rounded-[20px] border bg-[#fff7e8] p-[30px] shadow-md transition hover:-translate-y-1 ${
              formData.report_style === "full_plus_consultation"
                ? "border-2 border-[#8b0000]"
                : "border-[#8b0000]"
            }`}>
              <p className="mb-3 inline-block rounded-full bg-[#8b0000] px-3 py-1 text-sm font-bold text-white">
                Recommended
              </p>
              <h3 className="text-2xl font-bold text-[#5c0000]">Complete Astrology + Consultation Report</h3>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-4xl font-extrabold text-[#8b0000]">₹149</p>
                <p className="pb-1 text-lg text-gray-500 line-through">₹199</p>
              </div>
              <ul className="mt-5 flex-1 space-y-3 text-[#4b3528]">
                <li>Complete astrology report</li>
                <li>One personal question</li>
                <li>Direct answer</li>
                <li>Timing and assessment</li>
                <li>D1 + D9 charts</li>
                <li>Life area scores</li>
                <li>Best value package</li>
              </ul>
              <button
                type="button"
                onClick={() => choosePremiumReport("full_plus_consultation")}
                className="mt-auto h-16 min-h-16 max-h-16 w-full rounded-[14px] border-0 bg-[#a40000] px-5 text-lg font-bold text-white hover:bg-[#8b0000]"
              >
                Select
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-3">
          {[
            "Based on Vedic birth chart",
            "Uses Mahadasha timing",
            "Includes current Saturn, Jupiter, Rahu and Ketu transits",
            "Analyzes from Ascendant and Moon sign",
            "PDF download instantly",
            "Simple Hindi / English / Hinglish",
          ].map((item) => (
            <div key={item} className="rounded-xl border border-[#ead8b8] bg-white p-5 font-semibold text-[#5c0000] shadow-sm">
              {item}
            </div>
          ))}
        </section>

        <section id="report-form" className="scroll-mt-6 py-10">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-[#5c0000]">Generate Your Report</h2>
            <p className="mt-2 text-[#6b4a35]">
              Enter accurate birth details for better chart, Mahadasha and transit analysis.
            </p>
          </div>

        <div className="space-y-4 rounded-2xl border border-[#ead8b8] bg-white p-6 shadow-lg">

          <label className="block text-sm font-semibold text-[#5c0000]">
            Name *
          </label>
          <input
            type="text"
            name="name"
            placeholder="Your Name *"
            value={formData.name}
            required
            className="w-full rounded-xl border border-[#ead8b8] bg-[#fffaf2] p-3 pr-36 text-[#2b1b12] outline-none focus:border-[#8b0000]"
            onChange={handleChange}
          />

          <div>
            <label className="font-bold text-[#8b0000]">
              Date of Birth * (DD/MM/YYYY)
            </label>

            <div className="mt-2 grid grid-cols-3 gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="DD"
                value={formData.birth_day}
                onChange={(e) =>
                  updateBirthDatePart("birth_day", e.target.value)
                }
                required
                className="rounded-xl border border-[#ead8b8] bg-white p-3 text-center text-[#2b1b12]"
              />

              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="MM"
                value={formData.birth_month}
                onChange={(e) =>
                  updateBirthDatePart("birth_month", e.target.value)
                }
                required
                className="rounded-xl border border-[#ead8b8] bg-white p-3 text-center text-[#2b1b12]"
              />

              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="YYYY"
                value={formData.birth_year}
                onChange={(e) =>
                  updateBirthDatePart("birth_year", e.target.value)
                }
                required
                className="rounded-xl border border-[#ead8b8] bg-white p-3 text-center text-[#2b1b12]"
              />
            </div>
          </div>

          <label className="font-bold text-[#8b0000]">
            Time of Birth *
          </label>
          <input
            type="time"
            name="birth_time"
            required
            value={formData.birth_time}
            onChange={handleChange}
            className="w-full rounded-xl border border-[#ead8b8] bg-white p-3 text-[#2b1b12]"
          />

          <p className="rounded-xl border border-[#d4a017]/50 bg-[#fff6e6] p-3 text-sm text-[#8b0000]">
            ⚠️ Time of Birth should be as accurate as possible. A difference of even 10-15 minutes can change house placements and prediction accuracy.
          </p>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-[#5c0000]">
                Place of Birth *
              </label>

              <button
                type="button"
                onClick={() =>
                  setManualCoordinatesMode(!useManualCoordinates)
                }
                className="rounded-xl bg-[#8b0000] px-4 py-2 text-sm font-bold text-white hover:bg-[#5c0000]"
              >
                {useManualCoordinates
                  ? "Search Place Instead"
                  : "Enter Coordinates Manually"}
              </button>
            </div>

            {!useManualCoordinates ? (
              <>
                <input
                  type="text"
                  name="sv_place_lookup_no_store"
                  id="sv_place_lookup_no_store"
                  placeholder="Search birth place"
                  value={placeQuery}
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  readOnly
                  onFocus={(e) => {
                    e.currentTarget.removeAttribute("readonly");
                  }}
                  className="w-full rounded-xl border border-[#ead8b8] bg-white p-3 text-[#2b1b12] outline-none focus:border-[#8b0000]"
                  onChange={(e) => searchPlaces(e.target.value)}
                />

                {placeResults.length > 0 && (
                  <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#ead8b8] bg-white">
                    {placeResults.map((place, index) => (
                      <button
                        key={`${place.display_name}-${index}`}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            birth_place: place.display_name,
                            latitude: String(place.lat),
                            longitude: String(place.lon),
                            use_manual_coordinates: false,
                          }));
                          setPlaceQuery(place.display_name);
                          setPlaceResults([]);
                        }}
                        className="block w-full border-b border-[#ead8b8] p-3 text-left last:border-b-0 hover:bg-[#fff1d6]"
                      >
                        <div className="font-bold text-[#8b0000]">
                          {place.name || place.display_name}
                        </div>

                        <div className="text-sm text-[#6b4a35]">
                          {place.display_name}
                        </div>

                        <div className="text-xs text-gray-500">
                          {place.lat}, {place.lon}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <input
                  type="text"
                  name="sv_manual_location_no_store"
                  id="sv_manual_location_no_store"
                  placeholder="Place Name"
                  value={formData.birth_place}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  readOnly
                  onFocus={(e) => {
                    e.currentTarget.removeAttribute("readonly");
                  }}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      birth_place: e.target.value,
                      use_manual_coordinates: true,
                    }))
                  }
                  required
                  className="w-full rounded-xl border border-[#ead8b8] bg-white p-3 text-[#2b1b12] outline-none focus:border-[#8b0000]"
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        latitude: e.target.value,
                        use_manual_coordinates: true,
                      }))
                    }
                    required
                    className="rounded-xl border border-[#ead8b8] bg-white p-3 text-[#2b1b12] outline-none focus:border-[#8b0000]"
                  />

                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        longitude: e.target.value,
                        use_manual_coordinates: true,
                      }))
                    }
                    required
                    className="rounded-xl border border-[#ead8b8] bg-white p-3 text-[#2b1b12] outline-none focus:border-[#8b0000]"
                  />
                </div>
              </>
            )}
          </div>

          <label className="block text-sm font-semibold text-[#5c0000]">
            Report Type *
          </label>
          <select
            name="report_type"
            value={formData.report_type}
            className="w-full rounded-xl border border-[#ead8b8] bg-[#fffaf2] p-3 pr-36 text-[#2b1b12] outline-none focus:border-[#8b0000]"
            onChange={handleChange}
          >
            <option value="free">Free Report</option>
            <option value="premium">Premium Report</option>
          </select>

          {formData.report_type === "premium" && (
            <>
              <label className="block text-sm font-semibold text-[#5c0000]">
                Premium Report Type *
              </label>
              <div className="relative">
              <select
            name="report_style"
            value={formData.report_style}
            className="w-full rounded-xl border border-[#ead8b8] bg-[#fffaf2] p-3 pr-36 text-[#2b1b12] outline-none focus:border-[#8b0000]"
            onChange={handleChange}
          >
            <option value="consultation">
              Personal Consultation Report - ₹49
            </option>
            <option value="full">
              Complete Astrology Report - ₹99
            </option>
            <option value="full_plus_consultation">
              Complete Astrology + Consultation Report - ₹149
            </option>
          </select>
              {formData.report_style === "full_plus_consultation" && (
                <span className="pointer-events-none absolute left-[420px] top-1/2 -translate-y-1/2 rounded-full bg-[#fff1d6] px-3 py-1 font-serif text-sm font-bold italic text-[#8b0000] shadow-sm max-md:hidden">
                  Best Value
                </span>
              )}
              </div>
              <p className="hidden">
                Recommended: Complete Astrology + Consultation Report - ₹149
              </p>
            </>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-[#5c0000]">
              Language
            </label>

            <select
              name="language"
              value={formData.language}
              className="w-full rounded-xl border border-[#ead8b8] bg-[#fffaf2] p-3 text-[#2b1b12] outline-none focus:border-[#8b0000]"
              onChange={handleChange}
            >
              <option value="english">English</option>
              <option value="hindi">सरल हिन्दी</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>

          <label className="block text-sm font-semibold text-[#5c0000]">
            Employment Status *
          </label>
          <select
            name="employment_status"
            value={formData.employment_status}
            required
            className="w-full rounded-xl border border-[#ead8b8] bg-[#fffaf2] p-3 text-[#2b1b12] outline-none focus:border-[#8b0000]"
            onChange={handleChange}
          >
            <option value="not_selected">Employment Status *</option>
            <option value="employed">Employed</option>
            <option value="self_employed">Self Employed</option>
            <option value="business">Business</option>
            <option value="freelance">Freelance</option>
            <option value="student">Student</option>
            <option value="unemployed">Unemployed</option>
            <option value="retired">Retired</option>
          </select>

          <label className="block text-sm font-semibold text-[#5c0000]">
            Relationship Status *
          </label>
          <select
            name="relationship_status"
            value={formData.relationship_status}
            required
            className="w-full rounded-xl border border-[#ead8b8] bg-[#fffaf2] p-3 text-[#2b1b12] outline-none focus:border-[#8b0000]"
            onChange={handleChange}
          >
            <option value="not_selected">Relationship Status *</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
            <option value="complicated">Complicated</option>
          </select>

          {formData.report_type === "premium" && (
            <>
          {formData.report_style !== "consultation" && (
            <>
              <label className="block text-sm font-semibold text-[#5c0000]">
                Current Concern
              </label>
              <select
                name="current_concern"
                value={formData.current_concern}
                className="w-full rounded-xl border border-[#ead8b8] bg-[#fffaf2] p-3 text-[#2b1b12] outline-none focus:border-[#8b0000]"
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

            </>
          )}

          {formData.report_style !== "full" && (
            <>
              <textarea
                name="main_question"
                placeholder="Ask one specific question..."
                value={formData.main_question}
                required={
                  formData.report_style === "consultation" ||
                  formData.report_style === "full_plus_consultation"
                }
                className="min-h-28 w-full rounded-xl border border-[#ead8b8] bg-[#fffaf2] p-3 text-[#2b1b12] outline-none focus:border-[#8b0000]"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    main_question: e.target.value,
                  })
                }
              />

              <div className="rounded-xl border border-[#d4a017]/60 bg-[#fff6e6] p-4 text-sm text-[#4b3528]">
                <p className="mb-2 font-bold text-[#5c0000]">
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
            className="w-full rounded-xl bg-[#8b0000] p-4 font-bold text-white transition-all hover:bg-[#5c0000] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? loadingMessages[loadingMessageIndex]
              : formData.report_type === "free"
              ? "Generate Free Report"
              : `Generate Report - ${getSelectedPrice()}`}
          </button>

          {loading && (
            <p className="text-center text-sm text-[#6b4a35]">
              Please wait. Your chart, Dasha and transits are being prepared.
            </p>
          )}

          {errorMessage && (
            <p className="text-sm text-red-400 text-center">
              {errorMessage}
            </p>
          )}
        </div>
        </section>

        {report && (
          <div id="report-content" className="mt-10 rounded-2xl border border-[#ead8b8] bg-white p-6 shadow-lg">
            <h2 className="mb-6 text-3xl font-bold text-[#5c0000]">
              Astrology Report
            </h2>

            <div className="space-y-6">

              <div className="rounded-xl border border-[#ead8b8] bg-[#fff6e6] p-4">
                <h3 className="mb-2 text-xl font-bold text-[#5c0000]">
                  Current Mahadasha
                </h3>

                <p>
                  {report.current_mahadasha?.planet} Mahadasha
                </p>

                <p className="text-sm text-[#6b4a35]">
                  {`${report.current_mahadasha?.start} \u2192 ${report.current_mahadasha?.end}`}
                </p>
              </div>

              {report.chart && (
                <div className="rounded-xl border border-[#ead8b8] bg-[#fff6e6] p-4">
                  <h3 className="mb-4 text-xl font-bold text-[#5c0000]">
                    Planetary Positions
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(report.chart).map(
                      ([planet, data]: any) => (
                        <div
                          key={planet}
                          className="rounded-lg border border-[#ead8b8] bg-white p-3"
                        >
                          <p className="font-bold">{planet}</p>
                          <p>{data.sign}</p>
                          {data.degree && (
                            <p className="text-sm font-semibold text-[#8b0000]">
                              {data.degree}
                            </p>
                          )}
                          <p className="text-sm text-[#6b4a35]">
                            House {data.house}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {report.transits?.transits && (
                <div className="rounded-xl border border-[#ead8b8] bg-[#fff6e6] p-4">
                  <h3 className="mb-4 text-xl font-bold text-[#5c0000]">
                    Current Transits
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(report.transits.transits).map(
                      ([planet, data]: any) => (
                        <div
                          key={planet}
                          className="rounded-lg border border-[#ead8b8] bg-white p-3"
                        >
                          <p className="font-bold">{planet}</p>
                          <p>{data.sign}</p>
                          <p className="text-sm text-[#6b4a35]">
                            {planet} in {ordinalFromValue(data.house_from_ascendant)} House
                          </p>
                          <p className="text-sm text-[#6b4a35]">
                            {ordinalFromValue(data.house_from_moon)} House from Moon
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {report.charts && (
                <section className="rounded-xl border border-[#ead8b8] bg-[#fff6e6] p-4">
                  <h3 className="mb-2 text-xl font-bold text-[#5c0000]">
                    Birth Charts
                  </h3>
                  <p className="text-sm text-[#6b4a35]">
                    Rashi D1 and Navamsha D9 Chart
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <NorthIndianChart
                      title="Rashi D1"
                      chartData={report.charts.d1}
                    />

                    <NorthIndianChart
                      title="Navamsha D9"
                      chartData={report.charts.d9}
                    />
                  </div>
                </section>
              )}

              {report.dasha_timeline && (
                <div className="rounded-xl border border-[#ead8b8] bg-[#fff6e6] p-4">
                  <h3 className="mb-4 text-xl font-bold text-[#5c0000]">
                    Mahadasha Timeline
                  </h3>

                  <div className="space-y-2">
                    {report.dasha_timeline.map((dasha) => (
                      <div
                        key={`${dasha.planet}-${dasha.start}`}
                         className="flex flex-col gap-1 rounded-lg border border-[#ead8b8] bg-white p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <p className="flex items-center gap-2 font-bold">
                          <span>{dasha.planet}</span>
                          {report.current_mahadasha?.planet === dasha.planet && (
                            <span className="inline-flex h-7 min-w-[76px] items-center justify-center rounded-full bg-[#8b0000] px-3 text-xs font-bold leading-none text-white">
                              Active Now
                            </span>
                          )}
                        </p>
                         <p className="text-sm text-[#6b4a35]">
                          {dasha.start} → {dasha.end}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.life_area_scores && (
                <LifeAreaScoresSection scores={report.life_area_scores} />
              )}

              <div className="rounded-xl border border-[#ead8b8] bg-[#fff6e6] p-6">
                <h3 className="mb-4 text-2xl font-bold text-[#5c0000]">
                  Astrology Report
                </h3>

                <div className="max-w-none text-[#2b1b12]">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="mb-8 mt-2 border-b border-[#d4a017] pb-4 text-4xl font-bold text-[#5c0000]">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-4 mt-10 text-2xl font-bold text-[#8b0000]">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mb-3 mt-8 text-xl font-bold text-[#5c0000]">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="mb-3 mt-8 text-xl font-bold text-[#5c0000]">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p className="mb-5 text-lg leading-8 text-[#3a281f]">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-5 list-disc space-y-2 pl-6 text-[#3a281f]">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="leading-7">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold text-[#5c0000]">
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
                  className="rounded-xl border border-[#ead8b8] bg-white px-5 py-3 font-bold text-[#5c0000] hover:bg-[#fff6e6]"
                >
                  Copy Report
                </button>

                <button
                  onClick={downloadPDF}
                  disabled={pdfLoading}
                  className="rounded-xl bg-[#8b0000] px-5 py-3 font-bold text-white hover:bg-[#5c0000] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pdfLoading ? "Downloading..." : "Download PDF"}
                </button>
              </div>

              {report?.report_type === "free" && (
                <div className="mt-6 rounded-xl border border-[#d4a017] bg-[#fff6e6] p-5">
                  <h3 className="mb-2 text-xl font-bold text-[#5c0000]">
                    Unlock Premium Report
                  </h3>
                  <p className="mb-4 text-[#4b3528]">
                    Get detailed career timing, relationship analysis, remedies, full chart and Dasha timeline.
                  </p>
                  <button
                    type="button"
                    onClick={generatePremiumReport}
                    disabled={loading}
                    className="rounded-xl bg-[#8b0000] px-5 py-3 font-bold text-white hover:bg-[#5c0000] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? loadingMessages[loadingMessageIndex] : "Generate Premium Report"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <section className="px-5 py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-[#5c0000]">
              View Sample Astrology Reports
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-center text-[#6b4a35]">
              Check sample PDF reports before ordering your personalized report.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {sampleReports.map((sample) => (
                <a
                  key={sample.title}
                  href={sample.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-[#ead8b8] bg-white p-6 shadow-md transition hover:-translate-y-1 hover:border-[#8b0000]"
                >
                  <h3 className="text-xl font-bold text-[#8b0000]">
                    {sample.title}
                  </h3>

                  <p className="mt-3 text-[#6b4a35]">
                    {sample.desc}
                  </p>

                  <span className="mt-5 inline-block rounded-full bg-[#8b0000] px-4 py-2 text-sm font-bold text-white">
                    View Sample PDF
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12">
          <h2 className="mb-5 text-3xl font-bold text-[#5c0000]">
            Try Our Free Astrology Report
          </h2>
          <div className="mb-10 space-y-5 leading-8 text-[#4b3528]">
            <p>
              If you are new to online astrology, start with the free astrology report. It gives you a free birth chart report with a simple overview of your personality, basic career tendencies, relationship themes and current Mahadasha. This free Vedic astrology report is a useful first step before choosing a deeper paid analysis.
            </p>
            <p>
              Your free horoscope PDF helps you understand the style of the report and the kind of guidance you can expect. Liked your free report? Upgrade to Complete Astrology Report for deeper insights into career, money, marriage, health, future timing, Mahadasha prediction and current transit analysis.
            </p>
          </div>

          <h2 className="mb-5 text-3xl font-bold text-[#5c0000]">
            What is an AI Vedic Astrology Report?
          </h2>
          <div className="space-y-5 leading-8 text-[#4b3528]">
            <p>
              An AI astrology report from Shrivinayaka AI Astrology combines traditional Vedic astrology report structure with modern AI writing. The report uses your birth date, birth time and birth place to prepare a birth chart analysis, then explains important life areas in simple language. Instead of giving only technical chart data, the report focuses on practical questions such as career growth, marriage timing, money pressure, health tendencies and current life direction.
            </p>
            <p>
              Vedic astrology places strong importance on Mahadasha prediction because planetary periods often show which area of life is active at a particular time. If you are running Rahu Mahadasha, Saturn Mahadasha or another major period, the report explains how that timing may affect career, relationships, finances and personal decisions. It also includes current Saturn transit, Jupiter transit and Rahu Ketu transit influences so the reading does not feel disconnected from your present situation.
            </p>
            <p>
              The online astrology PDF report also studies the chart from both Ascendant and Moon sign. This helps connect outer events with emotional experience. For example, Saturn may show career pressure from the Ascendant while the Moon sign may show mental heaviness or delay. This approach is useful for people who want a readable Hindi astrology report, English report or Hinglish report without needing to understand complex astrology terms.
            </p>
            <p>
              The goal is simple: a clear AI Vedic astrology report for real-life problems. You can use it for birth chart analysis, Mahadasha timing, transit guidance and one focused personal question. Astrology cannot guarantee fixed events, but it can show tendencies, timing pressure, opportunities and areas where discipline or patience may be needed.
            </p>
          </div>
        </section>

        <section className="py-12">
          <h2 className="mb-6 text-3xl font-bold text-[#5c0000]">FAQ</h2>
          <div className="space-y-4">
            {[
              ["Is this report based on Moon sign or Ascendant?", "The report uses both Ascendant and Moon sign. Ascendant helps with life events and house results, while Moon sign helps understand emotional and mental impact."],
              ["How accurate should birth time be?", "Birth time should be as accurate as possible. A difference of even 10-15 minutes can change house placements and prediction accuracy."],
              ["Can I ask more than one question?", "The consultation report focuses on one primary question. If multiple questions are entered, the first major question is analyzed."],
              ["Will I get a PDF?", "Yes. After the report is generated, you can download it as a PDF."],
              ["Is this available in Hindi?", "Yes. Reports are available in English, simple Hindi and Hinglish."],
              ["Can astrology guarantee events?", "No. Astrology shows tendencies, timing patterns and possibilities. It should not be treated as a guarantee or replacement for professional advice."],
            ].map(([question, answer]) => (
              <div key={question} className="rounded-xl border border-[#ead8b8] bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[#5c0000]">{question}</h3>
                <p className="mt-2 leading-7 text-[#4b3528]">{answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-14 text-sm leading-7 text-[#6b4a35]">
          <p>
            Disclaimer: Astrology reports are for guidance, reflection and personal insight only. They do not guarantee events and should not replace medical, legal, financial or mental health advice.
          </p>
        </section>
      </div>
    </main>
  );
}
