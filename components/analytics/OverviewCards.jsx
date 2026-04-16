import { motion } from "framer-motion";
import { DollarSign, Users, ShoppingBag, Eye, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { currencyFormat } from './../../utils/currency';

const overviewData = [
	{ name: "Revenue", value: currencyFormat(0), change: 0, icon: DollarSign },
	{ name: "Tests", value: "0", change:0, icon: Eye },
	{ name: "Referrals", value: "0", change: 0, icon: Users },
	{ name: "Ref Bonus", value: currencyFormat(0), change: 15.7, icon: DollarSign },
];

const OverviewCards = () => {
	return (
		<div className='min-w-[200px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
			{overviewData.map((item, index) => (
				<motion.div
					key={item.name}
					className='bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg shadow-lg
            rounded-xl p-6 border border-gray-700
          '
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: index * 0.1 }}
				>
					<div className='flex items-center justify-between'>
						<div>
							<h3 className='text-sm font-medium text-gray-400'>{item.name}</h3>
							<p className='mt-1 text-xl font-semibold text-gray-100'>{item.value}</p>
						</div>

					</div>
					<div
						className={`
              mt-4 flex items-center ${item.change >= 0 ? "text-green-500" : "text-red-500"}
            `}
					>
						{item.change >= 0 ? <ArrowUpRight size='20' /> : <ArrowDownRight size='20' />}
						<span className='ml-1 text-sm font-medium'>{Math.abs(item.change)}%</span>
						<span className='ml-2 text-sm text-gray-400'>vs last Week</span>
					</div>
				</motion.div>
			))}
		</div>
	);
};
export default OverviewCards;
