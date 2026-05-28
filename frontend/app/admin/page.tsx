"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";

export default function AdminPage() {

  const [reports, setReports] = useState([]);
  const [adminKey, setAdminKey] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const fetchReports = async () => {
    try {
      const response = await axios.get(
        "https://shrivinayaka-backend.onrender.com/reports",
        {
          headers: {
            "x-admin-key": adminKey
          }
        }
      );

      setReports(response.data.reports);

    } catch (error) {
      console.error(error);
    }
  };

  const handleLogin = async () => {

    try {

      const response = await axios.get(
        "https://shrivinayaka-backend.onrender.com/reports",
        {
          headers: {
            "x-admin-key": adminKey
          }
        }
      );

      setReports(response.data.reports);
      setAuthorized(true);

    } catch (error) {
      alert("Wrong admin key");
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">

        <div className="bg-zinc-900 p-10 rounded-2xl w-full max-w-md">

          <h1 className="text-3xl font-bold mb-6">
            Admin Login
          </h1>

          <input
            type="password"
            placeholder="Enter Admin Key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="w-full p-4 rounded-xl bg-zinc-800 mb-4"
          />

          <button
            onClick={handleLogin}
            className="w-full bg-purple-600 hover:bg-purple-700 p-4 rounded-xl font-bold"
          >
            Login
          </button>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-10">

      <h1 className="text-4xl font-bold mb-10">
        Reports Dashboard
      </h1>

      <div className="overflow-x-auto">

        <table className="w-full border border-zinc-800">

          <thead className="bg-zinc-900">

            <tr>
              <th className="p-4 text-left">ID</th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Payment</th>
              <th className="p-4 text-left">Birth Place</th>
              <th className="p-4 text-left">Created</th>
              <th className="p-4 text-left">Action</th>
            </tr>

          </thead>

          <tbody>

            {reports.map((report: any) => (

              <tr
                key={report.id}
                className="border-t border-zinc-800"
              >
                <td className="p-4">{report.id}</td>

                <td className="p-4">
                  {report.name}
                </td>

                <td className="p-4">
                  {report.report_type}
                </td>

                <td className="p-4">
                  {report.payment_status}
                </td>

                <td className="p-4">
                  {report.birth_place}
                </td>

                <td className="p-4">
                  {report.created_at}
                </td>

                <td className="p-4">
                  <Link
                    href={`/admin/report/${report.id}`}
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
                  >
                    View
                  </Link>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
