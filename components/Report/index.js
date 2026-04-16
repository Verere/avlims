
"use client"

import AIPoweredInsights from "../analytics/AIPoweredInsights";
import ChannelPerformance from "../analytics/ChannelPerformance";
import CustomerSegmentation from "../analytics/CustomerSegmentation";
import OverviewCards from "../analytics/OverviewCards";
import ProductPerformance from "../analytics/ProductPerformance";
import RevenueChart from "../analytics/RevenueChart";
import UserRetention from "../analytics/UserRetention";



const ReportPage = () => {
	return (
		<div className='flex-1 w-full overflow-auto relative z-10 bg-gray-900 -mt-[80px]'>
			{/* <Header title={"Analytics Dashboard"} /> */}

			<main className='mx-auto py-6 px-4 lg:px-8'>
        <div className='flex align-center space-x-2'>
				<OverviewCards />
				<RevenueChart />
					<ProductPerformance />
					{/* <UserRetention /> */}
        </div>

				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
					{/* <ChannelPerformance />
					<CustomerSegmentation /> */}
				</div>

				{/* <AIPoweredInsights /> */}
			</main>
		</div>
	);
};
export default ReportPage;

 