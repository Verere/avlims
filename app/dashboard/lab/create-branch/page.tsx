"use client";
import { Suspense } from "react";
import CreateBranchForm from "@/components/CreateBranchForm";
import { useSearchParams } from "next/navigation";

export default function CreateBranchPage() {
  return (
    <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
      <CreateBranchPageContent />
    </Suspense>
  );
}

function CreateBranchPageContent() {
  const searchParams = useSearchParams();
  const labId = searchParams?.get("labId");
 
  if (!labId) {
    return <div className="text-center mt-10 text-red-600">No lab selected for branch creation (missing labId in URL).</div>;
  }
  return <CreateBranchForm labId={labId} />;
}
