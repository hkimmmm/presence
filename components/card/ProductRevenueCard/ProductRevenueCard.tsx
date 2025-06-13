"use client";
import { InformationCircleIcon, ArrowRightIcon, ArrowLongUpIcon } from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

type ProductRevenueCardProps = {
  className?: string;
};

export default function ProductRevenueCard({ className }: ProductRevenueCardProps) {
  const data = [
    { name: "Jan", sales: 2500 },
    { name: "Feb", sales: 4000 },
    { name: "Mar", sales: 4500 },
    { name: "Apr", sales: 5000 },
  ];

  return (
    <div className={`w-full lg:w-1/2 p-6 bg-white ${className}`}>
      <div className="flex justify-between items-center text-gray-700 text-sm">
        <div className="flex items-center gap-1">
          <span className="font-medium">Product Revenue</span>
          <InformationCircleIcon className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">$14,532</h2>
          <div className="mt-1 text-sm text-gray-500 flex items-center">
            <p>vs last month</p>
            <span className="ml-2 flex items-center gap-1 bg-green-100 text-green-600 font-semibold px-2 py-0.5 rounded-md">
              <ArrowLongUpIcon className="w-4 h-4" /> 8%
            </span>
          </div>
        </div>

        <div className="w-24 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" hide />
              <Tooltip />
              <Bar dataKey="sales" fill="#60A5FA" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="-mx-6 mt-6 border-t border-gray-200 pt-4 text-sm text-black hover:underline cursor-pointer flex justify-center">
  <p className="flex items-center gap-1">
    View More
    <ArrowRightIcon className="w-4 h-4" />
  </p>
</div>
    </div>
  );
}
