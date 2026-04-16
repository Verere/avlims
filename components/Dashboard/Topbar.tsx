import React from "react";

export default function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm flex items-center justify-between px-6 h-16 border-b">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50"
            aria-label="Search"
          />
          <svg className="absolute right-2 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </div>
        <button className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none" aria-label="Notifications">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="relative">
          <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200" aria-haspopup="true" aria-expanded="false">
            <img src="/avatar.png" alt="User avatar" className="w-8 h-8 rounded-full border" />
            <span className="hidden md:inline text-sm font-medium text-gray-700">Admin</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
       
        </div>
      </div>
    </header>
  );
}
