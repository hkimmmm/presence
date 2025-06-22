"use client";
import Link from 'next/link';
import { sidebarItems } from '@/config/sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

// Definisikan tipe untuk payload token JWT
interface TokenPayload {
  username: string;
  role: string;
  foto_profile: string;
}

// Definisikan tipe untuk user
interface User {
  image: string;
  name: string;
  role: string;
}

export default function Sidebar() {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Ambil data user dari token saat komponen dimuat
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: TokenPayload = jwtDecode(token);
        setUser({
          image: decoded.foto_profile || '/images/default-profile.jpg',
          name: decoded.username,
          role: decoded.role,
        });
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  // Atur sidebar agar menutup otomatis saat di mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        closeSidebar();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeSidebar]);

  // Fungsi logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Tampilkan loading jika data user belum tersedia
  if (!user) return <div>Loading...</div>;

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
                className="flex items-center gap-2 p-2 rounded hover:bg-blue-200"
              >
                <item.icon className="h-5 w-5 text-gray-600" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info and Logout Section */}
      <div className="absolute bottom-0 w-full p-4 bg-white border-t">
        <div className="flex items-center gap-3 mb-2">
          <Image
            src={user.image}
            alt="User Profile"
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-sm text-red-600 hover:text-red-800 py-2 rounded hover:bg-blue-200"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}