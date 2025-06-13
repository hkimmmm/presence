"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const ButtonBack = () => {
  return (
    <button
      onClick={() => window.history.back()}
      className="flex items-center text-blue-600 hover:text-blue-800"
    >
      <ArrowLeftIcon className="w-6 h-6 mr-2" />
      Kembali
    </button>
  );
};

export default ButtonBack;
