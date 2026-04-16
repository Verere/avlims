"use client";
import React, { useState } from "react";
import Sidebar from "../../../components/Dashboard/Sidebar";
import Topbar from "../../../components/Dashboard/Topbar";
import KPICardsRow from "../../../components/Dashboard/KPICardsRow";
import Charts from "../../../components/Dashboard/Charts";
import ActivityTable from "@/components/Dashboard/ActivityTable";
import AlertsPanel from "../../../components/Dashboard/AlertsPanel";
import QuickActions from "../../../components/Dashboard/QuickActions";

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (
    <div className="bg-gray-50 min-h-screen flex">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      {/* Main content area */}
      <div className={`flex-1 min-h-screen ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-56'} transition-all duration-300 flex flex-col`}>
        <Topbar title="Dashboard" />
        <div className="flex-1 px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
          <QuickActions />
          <KPICardsRow />
          <Charts />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ActivityTable />
            </div>
            <div>
              <AlertsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
