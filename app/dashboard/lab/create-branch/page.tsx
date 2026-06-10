"use client";
import CreateBranchForm from "@/components/CreateBranchForm";
import { useSearchParams } from "next/navigation";

export default function CreateBranchPage() {
  const searchParams = useSearchParams();
  const labId = searchParams.get("labId");
  console.log(searchParams,'s')
  if (!labId) {
    return <div className="text-center mt-10 text-red-600">No lab selected for branch creation (missing labId in URL).</div>;
  }
  return <CreateBranchForm labId={labId} />;
}
