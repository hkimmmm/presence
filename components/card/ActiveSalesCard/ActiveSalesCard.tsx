    "use client";
    import { InformationCircleIcon, ArrowRightIcon, ArrowLongUpIcon } from "@heroicons/react/24/outline";
    import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

    type ActiveSalesCardProps = {
    className?: string;
    };


    export default function ActiveSalesCard({ className }: ActiveSalesCardProps) {
    const data = [
        { name: "Jan", sales: 3000 },
        { name: "Feb", sales: 5000 },
        { name: "Mar", sales: 4000 },
        { name: "Apr", sales: 6000 },
    ];

    return (
        <div className={`w-full lg:w-1/2 p-6 bg-white border-r border-gray-200 ${className}`}>
        <div className="flex justify-between items-center text-gray-700 text-sm">
            <div className="flex items-center gap-1">
            <span className="font-medium">Active Sales</span>
            <InformationCircleIcon className="w-4 h-4 text-gray-400" />
            </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
            <div>
            <h2 className="text-3xl font-bold text-gray-900">$27,064</h2>
            <div className="mt-1 text-sm text-gray-500 flex items-center">
                <p>vs last month</p>
                <span className="ml-2 flex items-center gap-1 bg-green-100 text-green-600 font-semibold px-2 py-0.5 rounded-md">
                <ArrowLongUpIcon className="w-4 h-4" /> 12%
                </span>
            </div>
            </div>

            <div className="w-24 h-16">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                <XAxis dataKey="name" hide />
                <Tooltip />
                <Bar dataKey="sales" fill="#FF7849" radius={[5, 5, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

        <div className="-mx-6 mt-6 border-t border-gray-200 pt-4 text-sm text-black hover:underline cursor-pointer flex justify-center">
  <p className="flex items-center gap-1">
    See Details
    <ArrowRightIcon className="w-4 h-4" />
  </p>
</div>

        </div>
    );
    }
