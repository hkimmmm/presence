"use client"
import { useState } from "react";
import { ChevronDownIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import "./ProductOverviewCard.css";

type ProductOverviewCardProps = {
  className?: string; // ✅ Tambahkan ini
};

export default function ProductOverviewCard({ className }: ProductOverviewCardProps) {
  const [selectedTime, setSelectedTime] = useState("This month");
  const [selectedCategory, setSelectedCategory] = useState("Cosmetics");

  return (
    <div className={`p-6 bg-white rounded-xl border border-gray-200 w-full ${className}`}>
      <div className="flex justify-between items-center text-gray-600 text-sm">
        <div className="flex items-center gap-1">
          Product Overview
          <InformationCircleIcon className="w-4 h-4 text-gray-400" />
        </div>

        <button
          className="flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded-md text-xs"
          onClick={() => {
            const newTime = selectedTime === "This month" ? "Last month" : "This month";
            setSelectedTime(newTime);
          }}
        >
          {selectedTime} <ChevronDownIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-baseline">
        <h2 className="text-3xl text-black font-bold">$43,630</h2>
        <p className="text-gray-500 text-sm ml-2 total-sales">Total sales</p>
      </div>

      <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
        <p>Select by product</p>
        <div className="flex items-center gap-2">
          <p>New sales: <span className="font-semibold">453</span></p>
          <ChevronDownIcon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          className={`flex items-center gap-1 px-2 py-2 rounded-md font-medium text-sm transition-all ${
            selectedCategory === "Cosmetics" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-600"
          }`}
          onClick={() => setSelectedCategory("Cosmetics")}
        >
          Cosmetics
          <InformationCircleIcon className="w-4 h-4" />
        </button>

        <button
          className={`flex items-center gap-1 px-2 py-2 rounded-md font-medium text-sm transition-all ${
            selectedCategory === "Housewest" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-600"
          }`}
          onClick={() => setSelectedCategory("Housewest")}
        >
          Housewest
          <InformationCircleIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
