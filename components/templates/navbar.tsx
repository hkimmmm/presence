"use client";

import Link from "next/link";
import Button from "../ui/Button";

const Navbar = () => {
  return (
    <nav className="w-full bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        {/* Nama Perusahaan */}
        <h1 className="text-2xl font-bold text-gray-800">Dr White</h1>

        {/* Menu Navigasi */}
        <ul className="hidden md:flex space-x-6 text-gray-700">
          <li>
            <Link href="#home" className="hover:text-blue-500">Home</Link>
          </li>
          <li>
            <Link href="#about" className="hover:text-blue-500">About</Link>
          </li>
          <li>
            <Link href="#services" className="hover:text-blue-500">Services</Link>
          </li>
          <li>
            <Link href="#contact" className="hover:text-blue-500">Contact</Link>
          </li>
        </ul>

        {/* Button Login dengan Link */}
        <Link href="/auth/login">
          <Button variant="primary" className="px-4 py-2">Login</Button>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
