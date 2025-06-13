"use client";
import { 
  BellIcon, 
  ChatBubbleOvalLeftEllipsisIcon, 
  UserCircleIcon, 
  ArrowLeftOnRectangleIcon, 
  Bars3Icon // Import Bars-3 Icon untuk mobile
} from '@heroicons/react/24/outline';
import { Menu } from '@headlessui/react';
import { useState, useEffect } from 'react';

export default function TopNavRightBox() {
  const [isMobile, setIsMobile] = useState(false);

  // Cek ukuran layar untuk responsivitas
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Jika ukuran < 768px dianggap mobile/tablet
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Panggil sekali saat pertama kali dirender
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative">
      {isMobile ? (
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <Bars3Icon className="h-6 w-6 text-gray-600" /> {/* Ganti jadi Bars3Icon */}
          </Menu.Button>
          <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } block px-4 py-2 text-sm text-gray-700`}
                  >
                    <BellIcon className="inline h-5 w-5 mr-2" /> Notification
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } block px-4 py-2 text-sm text-gray-700`}
                  >
                    <ChatBubbleOvalLeftEllipsisIcon className="inline h-5 w-5 mr-2" /> Message
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } block px-4 py-2 text-sm text-gray-700`}
                  >
                    <UserCircleIcon className="inline h-5 w-5 mr-2" /> Profile
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } block px-4 py-2 text-sm text-gray-700`}
                  >
                    <ArrowLeftOnRectangleIcon className="inline h-5 w-5 mr-2" /> Logout
                  </a>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
      ) : (
        <div className="flex space-x-4">
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <BellIcon className="h-6 w-6 text-gray-600" />
          </button>
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6 text-gray-600" />
          </button>
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <UserCircleIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}
