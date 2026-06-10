import React from "react";

interface CommentCardProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onFormat: (token: "bold" | "italic" | "bullet") => void;
}

export default function CommentCard({ title, value, onChange, onFormat }: CommentCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{title}</h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => onFormat("bold")} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600">Bold</button>
          <button type="button" onClick={() => onFormat("italic")} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600">Italic</button>
          <button type="button" onClick={() => onFormat("bullet")} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600">Bullet</button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800"
        placeholder="Add structured comments here..."
      />
    </div>
  );
}
