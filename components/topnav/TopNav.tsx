"use client";
import { Bars3BottomLeftIcon } from '@heroicons/react/24/outline';
import TopNavRightBox from './rightbox/TopNavRightBox';
import { useSidebar } from '@/context/SidebarContext';
import SearchBox from './searchbox/SearchBox';

export default function TopNav() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center w-full border-b">
      <div className="flex items-center space-x-4">
        {/* Tombol Toggle Sidebar hanya muncul di layar kecil */}
        <button 
          className="block md:hidden p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          onClick={toggleSidebar}
        >
          <Bars3BottomLeftIcon className="h-6 w-6 text-gray-600" />
        </button>
        <SearchBox />
      </div>
      <TopNavRightBox />
    </header>
  );
}
