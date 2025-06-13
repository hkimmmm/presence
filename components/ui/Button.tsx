"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

const Button: React.FC<ButtonProps> = ({ variant = "primary", children, className, ...props }) => {
  const baseStyles = "rounded-md px-4 py-2 font-medium transition-all border";
  const variants = {
    primary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700",
    secondary: "bg-gray-500 text-white border-gray-500 hover:bg-gray-600 hover:border-gray-600",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className || ""}`} {...props}>
      {children}
    </button>
  );
};


export default Button;
