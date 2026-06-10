"use client";
import { useRouter } from "next/navigation";

export default function SetLabButton({ labId }: { labId: string }) {
  const router = useRouter();
  const handleClick = async () => {
    await fetch("/api/session/set-lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labId }),
    });
    router.push("/dashboard/create-branch");
  };
  return (
    <button
      className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-semibold"
      onClick={handleClick}
    >
      Create Branch
    </button>
  );
}
