import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = (pdfFonts as any).vfs;

const PDF_THEME = {
  pageBg: "#fffaf0",
  cream: "#fff8e8",
  cream2: "#fff3dc",
  red: "#990000",
  darkRed: "#7f0000",
  border: "#d9c58f",
  lightBorder: "#eadfbd",
  text: "#1f1f1f",
  muted: "#666666",
};

function safeText(value: any): string {
  if (value === null || value === undefined) return "-";

  if (typeof value === "string") return value;

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    if (value.planet && value.start && value.end) {
      return `${value.planet}: ${value.start} to ${value.end}`;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

function getInput(report: any) {
  return report.input || {};
}

function getAscendantSign(report: any) {
  return (
    report?.chart?.Ascendant?.sign ||
    report?.chart?.ascendant?.sign ||
    report?.chart?.Ascendant?.rashi ||
    report?.chart?.ascendant?.rashi ||
    "-"
  );
}

function getNakshatraSummary(report: any) {
  return report?.nakshatra_summary_card || {};
}

function formatTimeAMPM(time?: string) {
  if (!time) return "-";

  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;

  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;

  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

function dashaPeriod(dasha: any) {
  if (!dasha) return "-";
  if (typeof dasha === "object" && dasha.start && dasha.end) {
    return `${dasha.start} to ${dasha.end}`;
  }
  return "-";
}

function dashaName(dasha: any) {
  if (!dasha) return "-";
  if (typeof dasha === "object" && dasha.planet) return dasha.planet;
  return safeText(dasha);
}

function currentAntardashaName(report: any) {
  return (
    report?.current_antardasha?.planet ||
    report?.current_dasha_details?.current_antardasha?.antardasha ||
    report?.current_dasha_details?.current_antardasha?.planet ||
    report?.current_antardasha ||
    "-"
  );
}

function currentAntardashaPeriod(report: any) {
  if (report?.current_antardasha?.start && report?.current_antardasha?.end) {
    return `${report.current_antardasha.start} to ${report.current_antardasha.end}`;
  }

  if (
    report?.current_dasha_details?.current_antardasha?.start &&
    report?.current_dasha_details?.current_antardasha?.end
  ) {
    return `${report.current_dasha_details.current_antardasha.start} to ${report.current_dasha_details.current_antardasha.end}`;
  }

  return "-";
}

function reportTypeLabel(reportType: any) {
  const value = safeText(reportType).toLowerCase().trim();

  if (value === "premium" || value === "full_plus_consultation") {
    return "Complete Astrology + Consultation Report";
  }

  if (value === "full" || value === "complete" || value === "complete_astrology") {
    return "Complete Astrology Report";
  }

  if (value === "consultation" || value === "personal_consultation") {
    return "Personal Consultation Report";
  }

  return safeText(reportType);
}

function getPlanetRows(report: any) {
  const chart = report.chart || {};
  return Object.entries(chart).map(([name, value]: any) => ({
    name,
    sign: value?.sign || value?.rashi || "-",
    house: value?.house || "-",
    degree: value?.degree || value?.longitude || "",
  }));
}

function getChartRows(report: any, chartType: "d1" | "d9") {
  return report?.charts?.[chartType] || null;
}

function getLifeScores(report: any) {
  return (
    report?.life_scores ||
    report?.lifeScores ||
    report?.life_area_scores ||
    null
  );
}

function getLifeScoreItems(lifeScores: any) {
  if (!lifeScores || Object.keys(lifeScores).length === 0) {
    return [];
  }

  return Array.isArray(lifeScores)
    ? lifeScores
    : Array.isArray(lifeScores?.areas)
    ? lifeScores.areas
    : Object.entries(lifeScores).map(([area, value]) => ({
        area,
        ...(typeof value === "object" && value !== null ? value : { score: value }),
      }));
}

function lifeScoreCards(lifeScores: any) {
  const scoreItems = getLifeScoreItems(lifeScores);

  if (!scoreItems.length) {
    return null;
  }

  const rows: any[] = [];

  scoreItems.forEach((item: any) => {
    const area =
      item.area ||
      item.title ||
      item.name ||
      item.label ||
      "Life Area";

    const score =
      item.score ?? item.value ?? item.percent ?? 0;

    const numericScore = Number(score) || 0;
    const scoreColor =
      numericScore >= 75
        ? "#166534"
        : numericScore >= 60
        ? "#15803d"
        : numericScore >= 40
        ? "#c2410c"
        : "#b91c1c";
    const scoreFill =
      numericScore >= 75
        ? "#dcfce7"
        : numericScore >= 60
        ? "#ecfccb"
        : numericScore >= 40
        ? "#ffedd5"
        : "#fee2e2";

    rows.push([
      {
        text: area.replace(/_/g, " ").toUpperCase(),
        bold: true,
        fontSize: 9.5,
        margin: [6, 5, 6, 5],
      },
      {
        text: `${numericScore}/100`,
        bold: true,
        fontSize: 10.5,
        color: scoreColor,
        alignment: "right",
        margin: [6, 5, 6, 5],
        fillColor: scoreFill,
      },
    ]);
  });

  return {
    table: {
      widths: ["*", 80],
      body: rows,
    },
    dontBreakRows: true,
    keepWithHeaderRows: 1,
    layout: {
      hLineColor: () => "#e5e7eb",
      vLineColor: () => "#e5e7eb",
      fillColor: (rowIndex: number, _node: any, columnIndex: number) =>
        columnIndex === 0 ? (rowIndex % 2 === 0 ? "#ffffff" : "#f9fafb") : null,
      paddingTop: () => 1,
      paddingBottom: () => 1,
      paddingLeft: () => 3,
      paddingRight: () => 3,
    },
    margin: [0, 4, 0, 8],
  };
}

function strongestWeakestSummary(lifeScores: any) {
  const scoreItems = getLifeScoreItems(lifeScores).map((item: any) => ({
    name: item.area || item.title || item.name || item.label || "Life Area",
    score: Number(item.score ?? item.value ?? item.percent ?? 0) || 0,
  }));

  if (!scoreItems.length) {
    return null;
  }

  const strongest = [...scoreItems].sort((a, b) => b.score - a.score)[0];
  const weakest = [...scoreItems].sort((a, b) => a.score - b.score)[0];

  return {
    table: {
      widths: ["*", "*"],
      body: [[
        {
          stack: [
            { text: "Top Strength", bold: true, fontSize: 11, color: "#166534" },
            { text: `${safeText(strongest.name)} (${strongest.score})`, fontSize: 12, bold: true },
          ],
          fillColor: "#dcfce7",
          margin: [6, 5, 6, 5],
        },
        {
          stack: [
            { text: "Needs Attention", bold: true, fontSize: 11, color: "#b91c1c" },
            { text: `${safeText(weakest.name)} (${weakest.score})`, fontSize: 12, bold: true },
          ],
          fillColor: "#fee2e2",
          margin: [6, 5, 6, 5],
        },
      ]],
    },
    layout: {
      hLineColor: () => "#e5e7eb",
      vLineColor: () => "#e5e7eb",
      paddingTop: () => 1,
      paddingBottom: () => 1,
      paddingLeft: () => 3,
      paddingRight: () => 3,
    },
    margin: [0, 2, 0, 6],
  };
}

export function downloadProfessionalReport(report: any) {
  console.log("PDFMAKE REPORT DATA:", report);
  console.log("PDF life_scores:", report.life_scores);
  console.log("REPORT LIFE SCORES");
  console.log(JSON.stringify(report.life_scores, null, 2));

  const reportText = report.report || "";
  const part2Marker = "PART 2 - Personal Consultation Analysis";
  const [part1Raw, part2Raw = ""] = reportText.split(part2Marker);
  const part1Text = part1Raw
    .replace(/PART 1 - Complete Astrology Report/g, "")
    .replace(/Complete Astrology Report \+ Personal Consultation/gi, "")
    .trim();
  const part2Text = part2Raw.trim();
  const lifeScores = getLifeScores(report);

  const content: any[] = [];

  content.push(...coverPage(report));
  content.push(
    sectionTitle("Report Includes"),
    chipRow([
      "Birth Chart",
      "D1 & D9 Charts",
      "Mahadasha",
      "Current Transits",
      "Life Area Scores",
      "Personal Consultation",
    ]),
    sectionTitle("Planetary Positions"),
    planetGrid(getPlanetRows(report)),
    {
      unbreakable: true,
      stack: [
        sectionTitle("Current Planetary Period Snapshot"),
        currentPeriodSnapshot(report),
      ],
    },
    sectionTitle("Birth Charts"),
    chartSection("Rashi D1", getChartRows(report, "d1")),
    chartSection("Navamsha D9", getChartRows(report, "d9")),
    sectionTitle("Dasha Summary"),
    dashaSummary(report),
    {
      unbreakable: true,
      stack: [
        sectionTitle("Antardasha Timeline"),
        antardashaTable(report.upcoming_antardasha_rows || report.antardasha_timeline || []),
      ],
    }
  );

  if (lifeScores && Object.keys(lifeScores).length > 0) {
    content.push(sectionTitle("Life Area Strengths"));
    const summaryBox = strongestWeakestSummary(lifeScores);
    if (summaryBox) {
      content.push(summaryBox);
    }
    const scoreCards = lifeScoreCards(lifeScores);
    if (scoreCards) {
      content.push(scoreCards);
    }
  }

  content.push({
    text: "PART 1",
    style: "partHeading",
    alignment: "center",
    pageBreak: "before",
  });
  content.push(topPageSpacer());
  content.push({
    text: "COMPLETE ASTROLOGY REPORT",
    style: "partSubHeading",
    alignment: "center",
  });
  content.push(...reportSections(part1Text, report));

  const consultation =
    report?.consultation ||
    report?.consultation_analysis ||
    report?.personal_consultation ||
    report?.part2 ||
    null;

  if (part2Text || consultation) {
    content.push({
      text: "PART 2",
      style: "partHeading",
      pageBreak: "before",
    });
    content.push(topPageSpacer());
    content.push({
      text: "PERSONAL CONSULTATION ANALYSIS",
      style: "partSubHeading",
    });

    if (part2Text) {
      const parsedPart2Sections = reportSections(part2Text, report);

      if (parsedPart2Sections.length > 0) {
        content.push(...parsedPart2Sections);
      } else {
        const fallbackConsultationSections = consultationSections(report);

        if (fallbackConsultationSections.length > 0) {
          content.push(...fallbackConsultationSections);
        } else {
          content.push(
            sectionBox(
              "Personal Consultation Analysis",
              part2Text
                .split(/\n\s*\n/)
                .map((item: string) => item.trim())
                .filter(Boolean)
                .map(paragraph)
            )
          );
        }
      }
    } else if (typeof consultation === "string" && consultation.trim()) {
      content.push(
        sectionBox("Personal Consultation Analysis", [
          ...consultation
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map(paragraph),
        ])
      );
    } else if (consultation && typeof consultation === "object") {
      const part2Sections = [
        ["Brief Chart Summary", consultation.brief_chart_summary],
        ["Factors Relevant to Question", consultation.factors_relevant_to_question],
        ["Current Dasha Impact", consultation.current_dasha_impact],
        ["Current Transit Impact", consultation.current_transit_impact],
        ["Direct Answer to Your Question", consultation.direct_answer],
        ["Final Observation", consultation.final_observation],
      ];

      part2Sections.forEach(([title, value]) => {
        if (value) {
          content.push(
            sectionBox(String(title), [
              ...String(value)
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map(paragraph),
            ])
          );
        }
      });
    }
  }

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 62, 40, 48],
    background: () => ({
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 595.28,
          h: 841.89,
          color: PDF_THEME.pageBg,
        },
      ],
    }),

    footer: function (currentPage: number, pageCount: number) {
      return {
        columns: [
          { text: "Shrivinayaka AI Astrology • shrivinayakaastrology.com", fontSize: 9, color: "#555" },
          { text: `Page ${currentPage} of ${pageCount}`, alignment: "right", fontSize: 9, color: "#555" },
        ],
        margin: [40, 0, 40, 0],
      };
    },

    content: content.filter(Boolean),

    styles: {
      h1: { fontSize: 24, bold: true, color: PDF_THEME.red, alignment: "center", margin: [0, 12, 0, 16] },
      h2: { fontSize: 17, bold: true, color: PDF_THEME.red, margin: [0, 20, 0, 10] },
      normal: { fontSize: 10.5, lineHeight: 1.35, color: PDF_THEME.text },
      sectionTitle: { fontSize: 16, bold: true, color: PDF_THEME.red },
      subHeading: { fontSize: 13, bold: true, color: PDF_THEME.red },
      sectionHeading: { fontSize: 18, bold: true, color: PDF_THEME.red, margin: [0, 18, 0, 10] },
      partHeading: { fontSize: 24, bold: true, alignment: "center", color: PDF_THEME.red, margin: [0, 20, 0, 4] },
      partSubHeading: { fontSize: 16, bold: true, alignment: "center", color: PDF_THEME.text, margin: [0, 0, 0, 22] },
      body: { fontSize: 11.5, lineHeight: 1.35, color: PDF_THEME.text },
      small: { fontSize: 9, color: PDF_THEME.muted },
    },

    defaultStyle: {
      fontSize: 11.5,
      lineHeight: 1.35,
    },
  };

  pdfMake.createPdf(docDefinition).download(
    `${safeText(report?.name) || "Shrivinayaka"}-Astrology-Report.pdf`
  );
}

function coverRow(label: string, value: any) {
  return [
    {
      text: label.toUpperCase(),
      bold: true,
      fontSize: 10,
      color: "#374151",
    },
    {
      text: String(value || "-"),
      fontSize: 11,
      color: "#111827",
    },
  ];
}

function coverPage(report: any) {
  const input = report?.input || {};
  const nakshatraSummary = getNakshatraSummary(report);

  const name = input.name || report?.name || "-";
  const reportType = reportTypeLabel(
    input.report_type ||
      report?.report_type ||
      "Complete Astrology + Consultation Report"
  );

  const rawLanguage = String(input.language || report?.language || "English");
  const language =
    rawLanguage.charAt(0).toUpperCase() + rawLanguage.slice(1).toLowerCase();
  const dob = input.date_of_birth || input.dob || report?.dob || input.birth_date || "-";
  const tob = formatTimeAMPM(
    input.time_of_birth || input.birth_time || report?.time_of_birth
  );
  const place =
    input.birth_place ||
    input.place_of_birth ||
    report?.birth_place ||
    "-";

  const mahadasha =
    report?.current_mahadasha?.planet || report?.current_mahadasha || "-";

  const mahadashaPeriod =
    report?.current_mahadasha?.start && report?.current_mahadasha?.end
      ? `${report.current_mahadasha.start} to ${report.current_mahadasha.end}`
      : report?.mahadasha_period || "-";

  const antardasha =
    currentAntardashaName(report);

  const antardashaPeriod = currentAntardashaPeriod(report);
  const ascendant = getAscendantSign(report);
  const moonSign = nakshatraSummary["Moon Sign"] || report?.moon_sign || "-";
  const nakshatra = nakshatraSummary["Nakshatra"] || report?.nakshatra?.nakshatra || "-";
  const pada = nakshatraSummary["Pada"] || report?.nakshatra?.pada || "-";

  return [
    {
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 515,
          h: 110,
          color: "#111111",
        },
      ],
      absolutePosition: { x: 40, y: 35 },
    },
    {
      text: "Shrivinayaka Astrology",
      color: "#ffffff",
      bold: true,
      fontSize: 26,
      alignment: "center",
      absolutePosition: { x: 40, y: 62 },
      width: 515,
    },
    {
      text: "Complete Astrology + Consultation Report",
      color: "#f3f4f6",
      fontSize: 11.5,
      alignment: "center",
      absolutePosition: { x: 40, y: 100 },
      width: 515,
    },
    {
      text: "Personalized AI Astrology Report",
      color: "#d1d5db",
      fontSize: 9.5,
      italics: true,
      alignment: "center",
      absolutePosition: { x: 40, y: 122 },
      width: 515,
    },
    {
      text: "Client Birth Details",
      style: "sectionHeading",
      margin: [0, 165, 0, 12],
    },
    {
      table: {
        widths: [170, "*"],
        body: [
          coverRow("Name", name),
          coverRow("Report Type", reportType),
          coverRow("Language", language),
          coverRow("Date of Birth", dob),
          coverRow("Time of Birth", tob),
          coverRow("Birth Place", place),
          coverRow("Ascendant", ascendant),
          coverRow("Moon Sign", moonSign),
          coverRow("Nakshatra", nakshatra),
          coverRow("Pada", pada),
          coverRow("Mahadasha", mahadasha),
          coverRow("Mahadasha Period", mahadashaPeriod),
          coverRow("Antardasha", antardasha),
          coverRow("Antardasha Period", antardashaPeriod),
        ],
      },
      layout: {
        hLineColor: () => "#d1d5db",
        vLineColor: () => "#ffffff",
        fillColor: (rowIndex: number) =>
          rowIndex % 2 === 0 ? "#f9fafb" : "#ffffff",
        paddingLeft: () => 10,
        paddingRight: () => 10,
        paddingTop: () => 8,
        paddingBottom: () => 8,
      },
      margin: [0, 0, 0, 20],
    },
    {
      text: "Prepared by Shrivinayaka AI Astrology",
      alignment: "center",
      fontSize: 11,
      color: "#6b7280",
      absolutePosition: { x: 40, y: 760 },
      width: 515,
    },
    {
      text: "shrivinayakaastrology.com",
      alignment: "center",
      fontSize: 10,
      color: "#9ca3af",
      absolutePosition: { x: 40, y: 776 },
      width: 515,
    },
    {
      text: "",
      pageBreak: "after",
    },
  ];
}

function sectionHeading(title: string) {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            columns: [
              {
                width: 4,
                canvas: [
                  {
                    type: "rect",
                    x: 0,
                    y: 0,
                    w: 4,
                    h: 40,
                    color: PDF_THEME.red,
                  },
                ],
              },
              {
                width: "*",
                text: title,
                fontSize: 16,
                bold: true,
                color: PDF_THEME.red,
                margin: [6, 10, 0, 4],
              },
            ],
            fillColor: PDF_THEME.cream,
            margin: [0, 0, 0, 0],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => PDF_THEME.border,
      vLineColor: () => PDF_THEME.border,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 10],
  };
}

function sectionTitle(title: string, pageBreak = false) {
  const heading: any = sectionHeading(title);
  if (pageBreak) {
    heading.pageBreak = "before";
  }
  return heading;
}

function topPageSpacer() {
  return { text: "", margin: [0, 8, 0, 0] };
}

function paragraph(text: string) {
  return {
    unbreakable: true,
    stack: [
      {
        text,
        style: "normal",
      },
    ],
    margin: [0, 8, 0, 8],
  };
}

function inlineAstroDetails(items: { label: string; value: any }[]) {
  const line: any[] = [];

  items.forEach((item, index) => {
    if (index > 0) {
      line.push({ text: " | ", color: PDF_THEME.text });
    }

    line.push({
      text: `${item.label}: `,
      bold: true,
      color: PDF_THEME.text,
    });

    line.push({
      text: String(item.value || "-"),
      color: PDF_THEME.text,
    });
  });

  return {
    text: line,
    fontSize: 10.5,
    lineHeight: 1.35,
    margin: [0, 4, 0, 8],
  };
}

function subHeading(text: string) {
  return {
    text,
    fontSize: 14,
    bold: true,
    color: PDF_THEME.text,
    margin: [0, 4, 0, 4],
  };
}

function accentSubHeading(text: string) {
  return {
    text,
    fontSize: 12,
    bold: true,
    color: PDF_THEME.red,
    margin: [0, 4, 0, 4],
  };
}

function sectionBox(
  title: string,
  body: any[],
  fillColor = PDF_THEME.cream,
  keepCount = 1,
  continuationStyle: "plain" | "boxed" | "heading-only" = "heading-only"
) {
  const createTableBlock = (stack: any[]) => ({
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack,
            fillColor,
            margin: [10, 8, 10, 10],
          },
        ],
      ],
    },
    layout: {
      hLineColor: () => PDF_THEME.lightBorder,
      vLineColor: () => PDF_THEME.lightBorder,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 8,
      paddingBottom: () => 8,
    },
  });

  if (!body.length) {
    return {
      ...createTableBlock([sectionHeading(title)]),
      margin: [0, 8, 0, 14],
    };
  }

  if (continuationStyle === "heading-only") {
    return {
      stack: [
        createTableBlock([sectionHeading(title)]),
        ...body,
      ],
      margin: [0, 8, 0, 14],
    };
  }

  const firstChunk = body.slice(0, Math.max(keepCount, 1));
  const remainingChunk = body.slice(Math.max(keepCount, 1));

  return {
    stack: [
      {
        unbreakable: true,
        ...createTableBlock([sectionHeading(title), ...firstChunk]),
      },
      ...(remainingChunk.length > 0
        ? continuationStyle === "boxed"
          ? [createTableBlock(remainingChunk)]
          : remainingChunk
        : []),
    ],
    margin: [0, 8, 0, 14],
  };
}

function transitCard(title: string, parts: any[]) {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              ...(title
                ? [
                    {
                      text: title,
                      fontSize: 15,
                      bold: true,
                      color: PDF_THEME.red,
                      margin: [0, 0, 0, 4],
                    },
                  ]
                : []),
              ...parts,
            ],
            fillColor: "#fffdf7",
            margin: [12, 10, 12, 10],
          },
        ],
      ],
    },
    layout: {
      hLineColor: () => PDF_THEME.border,
      vLineColor: () => PDF_THEME.border,
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.8,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
    margin: [0, 4, 0, 10],
  };
}

function transitTitle(text: string) {
  return {
    text,
    fontSize: 15,
    bold: true,
    color: PDF_THEME.red,
    margin: [0, 0, 0, 6],
  };
}

function transitInnerHeading(text: string) {
  return {
    text,
    fontSize: 12.5,
    bold: true,
    color: PDF_THEME.red,
    margin: [0, 1, 0, 1],
  };
}

function transitSectionBlock(heading: string, bodyLines: string[]) {
  return {
    stack: [
      /from Moon$/i.test(heading) ? transitInnerHeading(heading) : {
        text: heading,
        fontSize: 12.5,
        bold: true,
        color: PDF_THEME.red,
        margin: [0, 1, 0, 2],
      },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 455,
            y2: 0,
            lineWidth: 0.8,
            lineColor: "#d4a017",
          },
        ],
        margin: [0, 0, 0, 2],
      },
      {
        text: bodyLines.join("\n"),
        fontSize: 10.5,
        lineHeight: 1.4,
        color: PDF_THEME.text,
        margin: [0, 0, 0, 0],
      },
    ],
    margin: [0, 0, 0, 1],
  };
}

function chipRow(items: string[]) {
  return {
    columns: items.map((item) => ({
      text: item,
      alignment: "center",
      bold: true,
      fontSize: 9,
      color: "#8b0000",
      margin: [3, 5, 3, 5],
      fillColor: "#fff3df",
    })),
    columnGap: 6,
    margin: [0, 5, 0, 15],
  };
}

function planetGrid(planets: any[]) {
  if (!planets.length) return { text: "Planet data not available.", style: "body" };

  const rows = [];
  for (let i = 0; i < planets.length; i += 2) {
    const row: any[] = planets.slice(i, i + 2).map((p: any) => ({
      stack: [
        { text: safeText(p.name), bold: true, fontSize: 11, color: "#111827" },
        { text: safeText(p.sign), bold: true, fontSize: 18, color: "#8b0000", margin: [0, 6, 0, 2] },
        { text: `House ${safeText(p.house)}`, fontSize: 10, color: "#666" },
      ],
      fillColor: "#fafafa",
      margin: [10, 10, 10, 10],
    }));

    rows.push(row);
  }

  return {
    table: { widths: ["*", "*"], body: rows },
    layout: {
      hLineColor: () => "#d1d5db",
      vLineColor: () => "#d1d5db",
    },
    margin: [0, 5, 0, 15],
  };
}

function dashaSummary(report: any) {
  return {
    table: {
      widths: ["50%", "50%"],
      body: [
        ["Current Mahadasha", dashaName(report.current_mahadasha)],
        ["Mahadasha Period", dashaPeriod(report.current_mahadasha)],
        ["Current Antardasha", currentAntardashaName(report)],
        ["Antardasha Period", currentAntardashaPeriod(report)],
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 5, 0, 15],
  };
}

function currentPeriodSnapshot(report: any) {
  return {
    columns: [
      {
        table: {
          widths: ["*"],
          body: [[{
            stack: [
              { text: "Current Mahadasha", bold: true, fontSize: 11, color: "#8b0000", margin: [0, 0, 0, 6] },
              { text: dashaName(report.current_mahadasha), bold: true, fontSize: 16, color: "#111827", margin: [0, 0, 0, 4] },
              { text: dashaPeriod(report.current_mahadasha), fontSize: 10, color: "#6b7280" },
            ],
            margin: [12, 12, 12, 12],
            fillColor: "#fff7e8",
          }]],
        },
        layout: {
          hLineColor: () => "#d1d5db",
          vLineColor: () => "#d1d5db",
        },
      },
      {
        table: {
          widths: ["*"],
          body: [[{
            stack: [
              { text: "Current Antardasha", bold: true, fontSize: 11, color: "#8b0000", margin: [0, 0, 0, 6] },
              { text: currentAntardashaName(report), bold: true, fontSize: 16, color: "#111827", margin: [0, 0, 0, 4] },
              { text: currentAntardashaPeriod(report), fontSize: 10, color: "#6b7280" },
            ],
            margin: [12, 12, 12, 12],
            fillColor: "#f9fafb",
          }]],
        },
        layout: {
          hLineColor: () => "#d1d5db",
          vLineColor: () => "#d1d5db",
        },
      },
    ],
    columnGap: 12,
    margin: [0, 4, 0, 14],
  };
}

function hasMeaningfulText(value: any) {
  return typeof value === "string" && value.trim().length > 0;
}

function consultationSections(report: any) {
  const consultation = report?.consultation || {};
  const sections: any[] = [];

  const structuredItems = [
    ["Brief Chart Summary", consultation?.brief_chart_summary || report?.brief_chart_summary || ""],
    ["Factors Relevant To Question", consultation?.factors_relevant_to_question || ""],
    ["Current Dasha Impact", consultation?.current_dasha_impact || ""],
    ["Current Transit Impact", consultation?.current_transit_impact || ""],
    ["Direct Answer to Your Question", consultation?.direct_answer || ""],
    ["Final Observation", consultation?.final_observation || ""],
  ];

  structuredItems.forEach(([title, text]) => {
    if (hasMeaningfulText(text)) {
      sections.push(
        sectionBox(
          String(title),
          [paragraph(String(text))],
          /Final Observation/i.test(String(title)) ? PDF_THEME.cream2 : PDF_THEME.cream
        )
      );
    }
  });

  if (sections.length > 0) {
    return sections;
  }

  if (hasMeaningfulText(report?.consultation_analysis)) {
    return [
      sectionBox("Personal Consultation Analysis", [
        paragraph(report.consultation_analysis),
      ]),
    ];
  }

  return [];
}

function chartSection(title: string, chartData: any) {
  if (!chartData) {
    return null;
  }

  const houses = Array.from({ length: 12 }, (_, i) => i + 1).map((house) => {
    const planets = Object.entries(chartData)
      .filter(([, value]: any) => Number(value?.house) === house)
      .map(([planet]) => planet)
      .join(", ");

    const firstEntry = Object.values(chartData).find(
      (value: any) => Number(value?.house) === house
    ) as any;
    const sign = firstEntry?.sign || "-";

    return {
      stack: [
        { text: `House ${house}`, bold: true, fontSize: 10, color: "#111827" },
        { text: safeText(sign), bold: true, fontSize: 13, color: "#8b0000", margin: [0, 4, 0, 2] },
        { text: planets || "-", fontSize: 9, color: "#4b5563" },
      ],
      margin: [8, 8, 8, 8],
      fillColor: house % 2 === 0 ? "#fff7e8" : "#fafafa",
    };
  });

  const rows = [];
  for (let i = 0; i < houses.length; i += 4) {
    rows.push(houses.slice(i, i + 4));
  }

  return {
    unbreakable: true,
    stack: [
      { text: title, style: "h2" },
      {
        table: {
          widths: ["*", "*", "*", "*"],
          body: rows,
        },
        layout: {
          hLineColor: () => "#d1d5db",
          vLineColor: () => "#d1d5db",
        },
        margin: [0, 4, 0, 14],
      },
    ],
  };
}

function antardashaTable(rows: any[]) {
  if (!rows.length) return { text: "Antardasha timeline not available.", style: "body" };

  const visibleRows = rows.slice(0, 6);
  return {
    table: {
      headerRows: 1,
      widths: ["*", "*", "*"],
      body: [
        [
          { text: "Period", bold: true, color: "#fff" },
          { text: "Start Date", bold: true, color: "#fff" },
          { text: "End Date", bold: true, color: "#fff" },
        ],
        ...visibleRows.map((r: any) => [
          r.period || "-",
          r.start || r.start_date || "-",
          r.end || r.end_date || "-",
        ]),
      ],
    },
    dontBreakRows: true,
    keepWithHeaderRows: 1,
    layout: {
      fillColor: (rowIndex: number) => rowIndex === 0 ? "#a40000" : rowIndex % 2 === 0 ? "#fff7e8" : null,
    },
    margin: [0, 8, 0, 15],
  };
}

function lifeStrengths(scores: any[]) {
  if (!scores.length) return { text: "Life area scores not available.", style: "body" };

  return {
    table: {
      widths: ["*", "*", "*"],
      body: scores.slice(0, 12).reduce((acc: any[], item: any, index: number) => {
        const cell = {
          stack: [
            { text: safeText(item.name || item.area || item.title), bold: true },
            {
              text: `${safeText(item.score)} / 100`,
              fontSize: 16,
              bold: true,
              color: Number(item.score) < 50 ? "#b00000" : "#087f3f",
            },
          ],
          margin: [8, 8, 8, 8],
        };

        if (index % 3 === 0) acc.push([]);
        acc[acc.length - 1].push(cell);
        return acc;
      }, []),
    },
    layout: "lightHorizontalLines",
    margin: [0, 5, 0, 15],
  };
}

function renderTransitSection(body: string) {
  const lines = body
    .split("\n")
    .map((line) => line.trim().replace(/^#{1,6}\s+/, ""))
    .filter(Boolean)
    .filter((line) => !/^\(?\s*Approx\.\s*\d+\s+words\s*\)?$/i.test(line));

  const cards: any[] = [];
  let currentCard: { title: string; sections: Array<{ heading: string; body: string[] }> } | null = null;
  let currentSection: { heading: string; body: string[] } | null = null;

  const isPlanetHeading = (line: string) =>
    /^(Saturn|Jupiter|Rahu|Ketu)\s+in\s+\d+(st|nd|rd|th)\s+House(\s+from\s+Moon)?$/i.test(
      line
    );

  const isSubHeading = (line: string) =>
    /^(Saturn Impact|Jupiter Impact|Rahu Impact|Ketu Impact|Impact from Ascendant|Impact from Moon|Practical Advice)$/i.test(
      line
    );

  const flushSection = () => {
    if (currentCard && currentSection) {
      currentCard.sections.push(currentSection);
      currentSection = null;
    }
  };

  const flushCard = () => {
    flushSection();

    if (currentCard) {
      const cardStack: any[] = [];

      currentCard.sections.forEach((section, index) => {
        if (section.heading !== "Details") {
          cardStack.push(transitSectionBlock(section.heading, section.body));
        } else if (section.body.length) {
          cardStack.push({
            text: section.body.join("\n"),
            fontSize: 10.5,
            lineHeight: 1.45,
            color: PDF_THEME.text,
            margin: [0, 0, 0, 6],
          });
        }
      });

      cards.push({
        stack: [
          transitTitle(currentCard.title),
          transitCard("", cardStack),
        ],
        margin: [0, 2, 0, 10],
      });
      currentCard = null;
    }
  };

  lines.forEach((line) => {
    if (isPlanetHeading(line)) {
      if (/from Moon$/i.test(line) && currentCard) {
        flushSection();
        currentSection = { heading: line, body: [] };
        return;
      }

      flushCard();
      currentCard = { title: line, sections: [] };
      return;
    }

    if (isSubHeading(line)) {
      if (!currentCard) {
        currentCard = { title: "", sections: [] };
      }
      flushSection();
      currentSection = { heading: line, body: [] };
      return;
    }

    if (!currentCard) {
      currentCard = { title: "", sections: [] };
    }
    if (!currentSection) {
      currentSection = { heading: "Details", body: [] };
    }
    currentSection.body.push(line);
  });

  flushCard();

  return cards;
}

function transitSectionBox(title: string, cards: any[]) {
  if (!cards.length) {
    return {
      pageBreak: "before",
      stack: [sectionHeading(title)],
      margin: [0, 8, 0, 14],
    };
  }

  return {
    pageBreak: "before",
    stack: [
      sectionHeading(title),
      cards[0],
      ...cards.slice(1),
    ],
    margin: [0, 8, 0, 14],
  };
}

function bodyBlocks(body: string): any[] {
  return body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((blocks: any[], item: string) => {
      const headingMatch = item.match(/^#{2,6}\s+(.+)$/);
      if (headingMatch) {
        const headingText = headingMatch[1].trim();
        if (headingText) {
          blocks.push(subHeading(headingText));
        }
      } else {
        const cleaned = item.replace(/^#{1,6}\s+/, "").trim();
        if (cleaned && !/^#{1,6}$/.test(cleaned)) {
          blocks.push(paragraph(cleaned));
        }
      }

      return blocks;
    }, []);
}

function dashaParagraphBlocks(lines: string[]): any[] {
  return lines
    .map((line) => line.trim().replace(/^#{1,6}\s+/, ""))
    .filter(Boolean)
    .map((line) => paragraph(line));
}

function consultationTransitBlocks(body: string) {
  const lines = body
    .split("\n")
    .map((line) => line.trim().replace(/^#{1,6}\s+/, ""))
    .filter(Boolean);

  const blocks: any[] = [];
  let currentHeading = "";
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length) {
      blocks.push(paragraph(currentParagraph.join(" ")));
      currentParagraph = [];
    }
  };

  lines.forEach((line) => {
    if (/^(Saturn Impact|Jupiter Impact|Rahu Impact|Ketu Impact|Impact from Ascendant|Impact from Moon|Practical Advice)$/i.test(line)) {
      flushParagraph();
      currentHeading = line;
      blocks.push(subHeading(currentHeading));
      return;
    }

    currentParagraph.push(line);
  });

  flushParagraph();
  return blocks;
}

function directAnswerBlocks(body: string) {
  const lines = body
    .split("\n")
    .map((line) => line.trim().replace(/^#{1,6}\s+/, ""))
    .filter(Boolean);

  const blocks: any[] = [];
  let currentLabel = "";
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length) {
      blocks.push(paragraph(currentParagraph.join(" ")));
      currentParagraph = [];
    }
  };

  lines.forEach((line) => {
    if (/^(Your Question|Brief Answer|What the Chart Indicates|Possible Time Period|Practical Advice)$/i.test(line)) {
      flushParagraph();
      currentLabel = line;
      blocks.push(accentSubHeading(currentLabel));
      return;
    }

    currentParagraph.push(line);
  });

  flushParagraph();
  return blocks;
}

function structuredDashaSection(title: string, body: string, report?: any) {
  if (/^\s*11\.\s*Detailed Current Mahadasha Analysis\s*$/i.test(title)) {
    const currentMahadasha = report?.current_mahadasha || {};
    const mahadashaPlanet = currentMahadasha?.planet || dashaName(currentMahadasha);
    const mahadashaStart = currentMahadasha?.start || "-";
    const mahadashaEnd = currentMahadasha?.end || "-";

    const remainingBody = body
      .split("\n")
      .map((item) => item.trim().replace(/^#{1,6}\s+/, ""))
      .filter((line) => {
        if (!line) {
          return true;
        }

        return (
          !/^Current Mahadasha:?$/i.test(line) &&
          !/Mahadasha$/i.test(line) &&
          !/^\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}$/i.test(line)
        );
      })
      .join("\n")
      .trim();

    const blocks: any[] = [
      subHeading("Current Mahadasha"),
      {
        text: `Current Mahadasha: ${mahadashaPlanet}`,
        fontSize: 10,
        bold: true,
        color: PDF_THEME.text,
        margin: [0, 2, 0, 4],
      },
      {
        text: `Start Date: ${mahadashaStart}`,
        fontSize: 10,
        bold: true,
        color: PDF_THEME.text,
        margin: [0, 2, 0, 4],
      },
      {
        text: `End Date: ${mahadashaEnd}`,
        fontSize: 10,
        bold: true,
        color: PDF_THEME.text,
        margin: [0, 2, 0, 10],
      },
    ];

    if (remainingBody) {
      blocks.push(...bodyBlocks(remainingBody));
    }

    return sectionBox(title, blocks);
  }

  const rawLines = body
    .split("\n")
    .map((item) => item.trim().replace(/^#{1,6}\s+/, ""));

  const blocks: any[] = [];
  let index = 0;

  while (index < rawLines.length && !rawLines[index]) {
    index += 1;
  }

  const headingLine = rawLines[index] || "";
  if (headingLine) {
    blocks.push(subHeading(headingLine.replace(/:$/, "").trim()));
    index += 1;
  }

  while (index < rawLines.length && !rawLines[index]) {
    index += 1;
  }

  const detailLines: string[] = [];
  while (
    index < rawLines.length &&
    /^(Current Mahadasha:|Current Antardasha:|Next Antardasha:|Start Date:|End Date:)/i.test(
      rawLines[index]
    )
  ) {
    const currentLine = rawLines[index];
    const previousLine = detailLines[detailLines.length - 1] || "";

    if (!/^Current (Mahadasha|Antardasha):$/i.test(currentLine) || previousLine !== currentLine) {
      detailLines.push(currentLine);
    }

    index += 1;
  }

  detailLines.forEach((line) => {
    blocks.push({
      text: line,
      fontSize: 10,
      bold: true,
      color: PDF_THEME.text,
      margin: [0, 2, 0, 4],
    });
  });

  const remainingBody = rawLines.slice(index).join("\n").trim();
  if (remainingBody) {
    blocks.push(...bodyBlocks(remainingBody));
  }

  return sectionBox(title, blocks);
}

function consultationDashaImpactSection(title: string, body: string) {
  const lines = body
    .split("\n")
    .map((item) => item.trim().replace(/^#{1,6}\s+/, ""))
    .filter(Boolean);

  const blocks: any[] = [];
  let index = 0;

  if (lines[index] && /^Current Mahadasha:?$/i.test(lines[index])) {
    blocks.push(subHeading("Current Mahadasha"));
    index += 1;
  }

  const detailLines: string[] = [];
  while (
    index < lines.length &&
    (/Mahadasha$/i.test(lines[index]) ||
      /^Current Mahadasha:/i.test(lines[index]) ||
      /^Start Date:/i.test(lines[index]) ||
      /^End Date:/i.test(lines[index]) ||
      /^\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}$/i.test(lines[index]))
  ) {
    const line = lines[index];

    if (/^\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}$/i.test(line)) {
      const [start, end] = line.split(/\s+to\s+/i);
      detailLines.push(`Start Date: ${start}`);
      detailLines.push(`End Date: ${end}`);
    } else if (/Mahadasha$/i.test(line) && !/^Current Mahadasha:/i.test(line)) {
      detailLines.push(`Current Mahadasha: ${line.replace(/\s+Mahadasha$/i, "").trim()}`);
    } else {
      detailLines.push(line);
    }

    index += 1;
  }

  detailLines.forEach((line) => {
    blocks.push({
      text: line,
      fontSize: 10,
      bold: true,
      color: PDF_THEME.text,
      margin: [0, 2, 0, 4],
    });
  });

  if (detailLines.length) {
    blocks.push({ text: "", margin: [0, 0, 0, 6] });
  }

  const remainingBody = lines.slice(index).join("\n");
  if (remainingBody.trim()) {
    blocks.push(...bodyBlocks(remainingBody));
  }

  return sectionBox(title, blocks);
}

function roadmapSection(title: string, body: string) {
  const blocks: any[] = [];
  const lines = body
    .split("\n")
    .map((item) => item.trim().replace(/^#{1,6}\s+/, ""))
    .filter(Boolean);

  let currentChunk: string[] = [];

  const flushChunk = () => {
    if (!currentChunk.length) return;
    blocks.push(...bodyBlocks(currentChunk.join("\n\n")));
    currentChunk = [];
  };

  lines.forEach((line) => {
    const yearMatch = line.match(/^Year\s*[123]\s*:?$/i);
    if (yearMatch) {
      flushChunk();
      blocks.push(transitTitle(yearMatch[0].replace(/:$/, "").trim()));
      return;
    }

    currentChunk.push(line);
  });

  flushChunk();

  return sectionBox(title, blocks);
}

function reportSections(markdown: string, report?: any) {
  const clean = markdown
    .replace(/[*_>`]/g, "")
    .replace(
      /(?:^|\n)\s*(?:14\.\s*)?Antardasha Timeline[\s\S]*?(?=\n\s*(?:15\.\s|PART 2 -)|\s*$)/i,
      "\n"
    )
    .replace(/\n{3,}/g, "\n\n");

  const lines = clean.split("\n");
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  const isPart2BlockHeading = (line: string) =>
    /^#{1,3}\s+(Brief Chart Summary|Factors Relevant To Question|Factors Relevant to Question|Current Dasha Impact|Current Transit Impact|Direct Answer to Your Question|Final Observation)$/i.test(
      line.trim()
    );

  const isSectionHeading = (line: string) => {
    const trimmed = line.trim();
    return (
      /^\s*\d+\.\s+.+$/.test(trimmed) ||
      /^#{1,3}\s*\d+\.\s+.+$/.test(trimmed) ||
      isPart2BlockHeading(trimmed)
    );
  };

  const normalizeSectionHeading = (line: string) =>
    line.trim().replace(/^#{1,3}\s+/, "");

  const pushCurrent = () => {
    if (!currentTitle) return;
    sections.push({
      title: currentTitle.trim(),
      body: currentBody.join("\n").trim(),
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (isSectionHeading(line)) {
      pushCurrent();
      currentTitle = normalizeSectionHeading(line);
      currentBody = [];
      continue;
    }

    if (!currentTitle && !line.trim()) {
      continue;
    }

    if (currentTitle) {
      currentBody.push(line);
    }
  }

  pushCurrent();

  if (sections.length === 0) {
    return bodyBlocks(clean.trim());
  }

  return sections.map(({ title, body }) => {
    const paragraphs = body
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (/^\s*(?:14\.\s*)?Antardasha Timeline\s*$/i.test(title)) {
      return sectionBox(title, [
        antardashaTable(
          report?.upcoming_antardasha_rows ||
            report?.next_antardasha_rows ||
            report?.antardasha_timeline ||
            []
        ),
      ]);
    }

    if (/Current Transit Analysis/i.test(title)) {
      return transitSectionBox(title, renderTransitSection(body));
    }

    if (/^\s*2\.\s*Moon Sign, Nakshatra and Pada Analysis\s*$/i.test(title)) {
      const nakshatraSummary = getNakshatraSummary(report || {});
      const filteredParagraphs = paragraphs.filter(
        (item) =>
          !/^(Moon Sign:|Nakshatra:|Pada:|Nakshatra Lord:)/i.test(item) &&
          !/^Moon Sign:\s*.+\|\s*Nakshatra:\s*.+\|\s*Pada:\s*.+\|\s*Nakshatra Lord:\s*.+$/i.test(item)
      );

      return sectionBox(title, [
        inlineAstroDetails([
          { label: "Moon Sign", value: report?.chart?.moon_sign || report?.moon_sign || nakshatraSummary["Moon Sign"] },
          { label: "Nakshatra", value: report?.chart?.nakshatra || report?.nakshatra?.nakshatra || report?.nakshatra || nakshatraSummary["Nakshatra"] },
          { label: "Pada", value: report?.chart?.pada || report?.nakshatra?.pada || report?.pada || nakshatraSummary["Pada"] },
          {
            label: "Nakshatra Lord",
            value:
              report?.chart?.nakshatra_lord ||
              report?.nakshatra?.nakshatra_lord ||
              report?.nakshatra_lord ||
              nakshatraSummary["Nakshatra Lord"],
          },
        ]),
        ...(filteredParagraphs.length ? filteredParagraphs.map((item) => paragraph(item)) : []),
      ], PDF_THEME.pageBg, 1, "boxed");
    }

    if (/^\s*11\.\s*Detailed Current Mahadasha Analysis\s*$/i.test(title)) {
      return structuredDashaSection(title, body, report);
    }

    if (/^\s*12\.\s*Current Antardasha Meaning\s*$/i.test(title)) {
      return structuredDashaSection(title, body, report);
    }

    if (/^\s*13\.\s*Next Antardasha Preview\s*$/i.test(title)) {
      return structuredDashaSection(title, body, report);
    }

    if (/^\s*15\.\s*Next 3 Years Roadmap\s*$/i.test(title)) {
      return roadmapSection(title, body);
    }

    if (/^Current Dasha Impact$/i.test(title)) {
      return consultationDashaImpactSection(title, body);
    }

    if (/^Current Transit Impact$/i.test(title)) {
      return sectionBox(title, consultationTransitBlocks(body), PDF_THEME.cream, 2);
    }

    if (/^Direct Answer to Your Question$/i.test(title)) {
      return sectionBox(title, directAnswerBlocks(body), PDF_THEME.cream, 2);
    }

    return sectionBox(
      title,
      paragraphs.length ? bodyBlocks(body) : [paragraph(body)],
      /Final Observation/i.test(title) ? PDF_THEME.cream2 : PDF_THEME.cream
    );
  }).filter(Boolean);
}
