"use client";
import React, { useState, useTransition } from "react";
import SubCategoryForm from "@/components/SubCategoryForm";
import addSubCategory from "./actions";

export default function SubCategoryFormWrapper({ categories, slug, branch }: { categories: { id: string; name: string }[]; slug: string; branch: string }) {
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (form: any) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await addSubCategory(form, slug, branch);
        setSuccess(true);
      } catch (e: any) {
        setError(e?.message || "Failed to add sub-category");
      }
    });
  };

  return (
    <>
      <SubCategoryForm onSubmit={handleSubmit} loading={loading} categories={categories} />
      {error && <div className="text-red-600 mt-2 text-center">{error}</div>}
      {success && <div className="text-green-600 mt-2 text-center">Sub-category added successfully!</div>}
    </>
  );
}
