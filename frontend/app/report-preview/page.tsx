"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function ReportPreviewPage() {
  const [report, setReport] = useState("");

  useEffect(() => {
    fetch("/sample-report.md")
      .then((res) => res.text())
      .then(setReport);
  }, []);

  return (
    <main className="report-preview">
      <ReactMarkdown>{report}</ReactMarkdown>
    </main>
  );
}