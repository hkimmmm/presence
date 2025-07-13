"use client";

import Link from "next/link";
import Button from "../ui/Button";
import CV from "@/public/cv.png";
import Image from "next/image";

const Navbar = () => {
  return (
    <nav className="w-full bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo dan Nama Perusahaan */}
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 relative">
            <Image 
              src={CV} 
              alt="CV Citra Buana Cemerlang Logo"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            CV Citra Buana Cemerlang
          </h1>
        </div>

        {/* Menu Navigasi - Dipindahkan ke tengah */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <ul className="hidden md:flex space-x-6 text-gray-700">
            <li>
              <Link href="/" className="hover:text-blue-500 transition-colors">Home</Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-blue-500 transition-colors">About</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-blue-500 transition-colors">Contact</Link>
            </li>
          </ul>
        </div>

        {/* Button Login dengan Link */}
        <Link href="/auth/login">
          <Button variant="primary" className="px-4 py-2">Login</Button>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;