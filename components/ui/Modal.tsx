"use client";

import React from "react";
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: "confirm" | "success";
  onClose: () => void;
  onConfirm?: () => void; // Untuk tombol konfirmasi
  confirmText?: string; // Teks tombol konfirmasi
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  type = "confirm",
  onClose,
  onConfirm,
  confirmText = "OK",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
        {/* Header Modal */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {type === "confirm" ? (
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
            ) : (
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
            )}
            {title}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Isi Modal */}
        <p className="mt-4 text-gray-700">{message}</p>

        {/* Tombol */}
        <div className="mt-6 flex justify-end gap-2">
          {type === "confirm" && onConfirm && (
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={onConfirm}>
              {confirmText}
            </button>
          )}
          <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400" onClick={onClose}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
