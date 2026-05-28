"use client";

import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useParams } from "next/navigation";

export default function SavedReportPage() {
  const params = useParams();
  const [report, setReport] = useState<any>(null);
  const [adminKey, setAdminKey] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const fetchReport = async () => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/report/${params.id}`,
        {
          headers: {
            "x-admin-key": adminKey
          }
        }
      );

      setReport(response.data);
      setAuthorized(true);
    } catch (error) {
      alert("Wrong admin key");
      console.error(error);
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-zinc-900 p-10 rounded-2xl w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6">
            Admin Access Required
          </h1>

          <input
            type="password"
            placeholder="Enter Admin Key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="w-full p-4 rounded-xl bg-zinc-800 mb-4"
          />

          <button
            onClick={fetchReport}
            className="w-full bg-purple-600 hover:bg-purple-700 p-4 rounded-xl font-bold"
          >
            Open Report
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-black text-white p-10">
        Loading report...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <div className="max-w-5xl mx-auto bg-zinc-900 p-8 rounded-2xl">

        <h1 className="text-4xl font-bold mb-4">
          Saved Astrology Report
        </h1>

        <div className="bg-zinc-800 p-5 rounded-xl mb-8">
          <p><strong>Name:</strong> {report.name}</p>
          <p><strong>Birth Date:</strong> {report.birth_date}</p>
          <p><strong>Birth Time:</strong> {report.birth_time}</p>
          <p><strong>Birth Place:</strong> {report.birth_place}</p>
          <p><strong>Report Type:</strong> {report.report_type}</p>
          <p><strong>Payment:</strong> {report.payment_status}</p>
          <p><strong>Created:</strong> {report.created_at}</p>
        </div>

        <div className="bg-zinc-800 p-6 rounded-xl">
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
                <li className="leading-7">{children}</li>
              ),
            }}
          >
            {report.report}
          </ReactMarkdown>
        </div>

      </div>
    </div>
  );
}
