"use client";
import { useTransition } from "react";
import { removeAllBranchesAction } from "@/app/dashboard/lab/remove-branches/actions";

export default function RemoveBranchesButton({ labId, onRemoved }: { labId: string, onRemoved?: () => void }) {
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      await removeAllBranchesAction(labId);
      if (onRemoved) onRemoved();
    });
  };

  return (
    <button
      className="mt-2 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition font-semibold text-sm"
      onClick={handleRemove}
      disabled={isPending}
    >
      {isPending ? "Removing..." : "Remove Branches"}
    </button>
  );
}
