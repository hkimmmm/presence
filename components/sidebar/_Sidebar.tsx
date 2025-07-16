// components/sidebar.tsx
"use client";
import Link from 'next/link';
import { sidebarItems } from '@/config/_sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import CV from "@/assets/images/citra_buana_cemerlang1.png";
import { useRouter } from 'next/navigation';

interface User {
  image: string;
  name: string;
  role: string; // Selalu "Supervisor" untuk UI
}

export default function Sidebar() {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Ambil data user dari API /api/me saat komponen dimuat
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/me', {
          credentials: 'include', // Sertakan cookie
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch user');
        }

        setUser({
          image: result.foto_profile || '/images/default-profile.jpg',
          name: result.nama || result.username,
          role: 'Supervisor', // Selalu "Supervisor" untuk UI
        });
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/auth/login?error=invalid_token');
      }
    }

    fetchUser();
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
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'GET' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
      router.push('/auth/login');
    }
  };

  // Tampilkan loading jika data user belum tersedia
  if (!user) return <div>Loading...</div>;

  return (
<aside
  className={`bg-blue-300 shadow-md w-64 fixed top-0 left-0 h-screen z-50 transition-transform duration-300
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0`}
>
  {/* Header Sidebar */}
  <div className="bg-blue-300 flex justify-between items-center text-black p-4 border-b">
    <div className="flex items-center gap-3">
      <Image
        src={CV}
        alt="Logo Citra Buana"
        width={40}
        height={40}
        className="object-contain"
      />
      <h2 className="text-xl text-black font-bold">Citra Buana Cemerlang</h2>
    </div>
    <XMarkIcon
      className="h-6 w-6 text-gray-600 cursor-pointer md:hidden"
      onClick={closeSidebar}
    />
  </div>

  {/* Isi Sidebar */}
  <nav className="p-4 flex-1 overflow-y-auto">
    <ul className="space-y-2 text-black">
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
  <div className="w-64 p-4 bg-blue-300 border-t fixed bottom-0 left-0">
    <div className="flex items-center gap-3 mb-2">
      <Image
        src={user.image}
        alt="User Profile"
        width={40}
        height={40}
        className="rounded-full object-cover"
      />
      <div>
        <p className="text-sm text-black font-medium">{user.name}</p>
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