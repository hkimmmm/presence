import {
    HomeIcon,
    DocumentTextIcon,
    CalendarIcon,
    UsersIcon,
    CogIcon,
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
    icon: DocumentTextIcon,
    subItems: [
      { name: 'Laporan Cuti', href: '/dashboard/report/leave' },
      { name: 'Laporan Presensi', href: '/dashboard/report/presence' },
    ],
  },
    {
      name: 'Employee',
      href: '/dashboard/employee',
      icon: BriefcaseIcon,
    },
    {
      name: 'Leave Request',
      href: '/dashboard/leave_requests',
      icon: CalendarIcon,
    },
    {
      name: 'QR Code Generator',
      href: '/dashboard/qrcode',
      icon: QrCodeIcon,
    },
    {
      name: 'Customers',
      href: '/dashboard/customers',
      icon: UsersIcon,
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: CogIcon,
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: UserCircleIcon,
    },
  ];
  