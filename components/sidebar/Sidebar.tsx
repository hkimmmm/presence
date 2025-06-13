"use client";
import Link from 'next/link';
import { sidebarItems } from '@/config/sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline'; // Import XMark

export default function Sidebar() {
  const { isSidebarOpen, closeSidebar } = useSidebar();

  // Atur sidebar agar menutup otomatis saat di mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        closeSidebar(); // Tutup otomatis di mobile/tablet
      }
    };

    // Jalankan saat pertama kali render dan saat resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeSidebar]);

  return (
    <aside 
      className={`bg-white shadow-md min-h-screen w-64 fixed md:relative z-50 transition-transform duration-300 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0`}
    >
      {/* Header Sidebar */}
      <div className="flex justify-between items-center p-4 border-b mt-3">
        <h2 className="text-xl font-bold">Menu</h2>
        {/* XMark untuk Mobile */}
        <XMarkIcon 
          className="h-6 w-6 text-gray-600 cursor-pointer md:hidden" 
          onClick={closeSidebar} 
        />
      </div>

      {/* Isi Sidebar */}
      <nav className="p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => (
            <li key={item.name}>
              <Link 
                href={item.href}
                onClick={() => window.innerWidth < 768 && closeSidebar()}
              >
                <span className="flex items-center gap-2 p-2 rounded hover:bg-blue-200">
                  <item.icon className="h-5 w-5 text-gray-600" />
                  {item.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
