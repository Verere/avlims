import Link from "next/link";

export default function SampleCollectionEntry() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold text-slate-900">Sample Collection</h1><p className="mt-2 text-slate-600">Open a laboratory branch dashboard to manage its specimens.</p><Link href="/dashboard" className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white">Go to dashboard</Link></div></main>;
}
