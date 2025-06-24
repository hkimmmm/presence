import {
    HomeIcon,
    DocumentTextIcon,
    CalendarIcon,
    UsersIcon,
    MapIcon,
    BriefcaseIcon,
    UserCircleIcon,
    QrCodeIcon,
  } from '@heroicons/react/24/outline';
  
  export const sidebarItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
    },
    {
    name: 'Laporan',
    href: '/dashboard/laporan',
    icon: DocumentTextIcon,   
  },
    {
      name: 'Data Sales',
      href: '/dashboard/employee',
      icon: BriefcaseIcon,
    },
    {
      name: 'Daftar Keahadiran',
      href: '/dashboard/presence',
      icon: UsersIcon,
    },
    {
      name: 'Daftar Pengajuan Cuti',
      href: '/dashboard/leave_requests',
      icon: CalendarIcon,
    },
    {
      name: 'QR Code Generator',
      href: '/dashboard/qrcode',
      icon: QrCodeIcon,
    },
    {
      name: 'Lokasi Kantor',
      href: '/dashboard/lokasi',
      icon: MapIcon,
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: UserCircleIcon,
    },
  ];
  