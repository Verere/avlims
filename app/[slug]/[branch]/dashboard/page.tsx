
import React from "react";
import KPICardsRow from "../../../../components/Dashboard/KPICardsRow";
import Charts from "../../../../components/Dashboard/Charts";
import ActivityTable from "@/components/Dashboard/ActivityTable";
import AlertsPanel from "@/components/Dashboard/AlertsPanel";
import Topbar from "@/components/Dashboard/Topbar";
// import QuickActions from "../../../../components/Dashboard/QuickActions";

export default function DashboardPage() {
  return (
    <div className="flex-1 min-h-screen bg-gray-50 flex flex-col">
      <Topbar title="Overview" />
      <div className="flex-1 px-2 sm:px-4 md:px-8 py-6 w-full max-w-7xl mx-auto">
        {/* <QuickActions /> */}
        <KPICardsRow />
        <Charts />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2">
            <ActivityTable />
          </div>
          <div>
            <AlertsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
