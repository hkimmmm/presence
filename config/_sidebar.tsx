import {
  HomeIcon,
  DocumentTextIcon,
  CalendarIcon,
  UsersIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

export const sidebarItems = [
  {
    name: 'Dashboard',
    href: '/supervisor',
    icon: HomeIcon,
  },
  {
    name: 'Laporan',
    href: '/supervisor/laporan',
    icon: DocumentTextIcon,
  },
  {
    name: 'Daftar Kehadiran',
    href: '/supervisor/kehadiran',
    icon: UsersIcon,
  },
  {
    name: 'Daftar Pengajuan Cuti',
    href: '/supervisor/izin',
    icon: CalendarIcon,
  },
  {
    name: 'Data Sales',
    href: '/supervisor/karyawan',
    icon: BriefcaseIcon,
  },
];
