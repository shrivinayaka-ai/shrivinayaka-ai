import Link from "next/link";

export default function ReportIndexPage() {
  return (
    <div className="min-h-screen bg-black text-white p-10">
      <div className="max-w-3xl mx-auto bg-zinc-900 p-8 rounded-2xl">
        <h1 className="text-3xl font-bold mb-4">
          Select a Saved Report
        </h1>

        <p className="text-gray-300 mb-6">
          Open a report from the admin dashboard.
        </p>

        <Link
          href="/admin"
          className="bg-purple-600 hover:bg-purple-700 px-5 py-3 rounded-xl font-bold"
        >
          Back to Reports Dashboard
        </Link>
      </div>
    </div>
  );
}
