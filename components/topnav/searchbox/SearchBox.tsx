"use client";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function SearchBox() {
  return (
    <div className="relative w-full md:w-80 lg:w-96">
      <input
        type="text"
        placeholder="Search..."
        className="pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
      />
      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
    </div>
  );
}
