'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../styles/global.css';

import { 
  UserGroupIcon, 
  UsersIcon, 
  ClockIcon, 
  MapPinIcon, 
  BuildingOfficeIcon,
  UserIcon,
  // ArrowUpIcon
} from '@heroicons/react/24/outline';

// Definisikan tipe untuk data dari API
interface DashboardData {
  success: boolean;
  data: {
    presensi: {
      totalHadirHariIni: number;
    };
    karyawan: {
      id: number;
      nama: string;
      email: string;
      no_telepon: string;
      tanggal_bergabung: string;
    }[];
    leaveRequests: {
      id: number;
      jenis: string;
      tanggal_mulai: string;
      tanggal_selesai: string;
      keterangan: string;
      karyawan_nama: string;
    }[];
    lokasiKantor: {
      id: number;
      nama_kantor: string;
      latitude: number;
      longitude: number;
      radius_meter: number;
    }[];
  };
}

interface TokenPayload {
  user_id: number;
  username: string;
  role: string;
  nama: string;
  foto_profile: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ambil informasi pengguna dari /api/me
        const userResponse = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          throw new Error(errorData.message || 'Gagal memuat data pengguna');
        }

        const userData: TokenPayload = await userResponse.json();
        if (userData.role !== 'admin') {
          throw new Error('Akses ditolak: Hanya admin yang diizinkan');
        }

        // Ambil data dashboard
        const dashboardResponse = await fetch('/api/home', {
          method: 'GET',
          credentials: 'include',
        });

        if (!dashboardResponse.ok) {
          const errorData = await dashboardResponse.json();
          throw new Error(errorData.message || 'Gagal mengambil data dashboard');
        }

        const data: DashboardData = await dashboardResponse.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data');
        router.push('/auth/login?error=invalid_token');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return <div className="text-gray-500 text-center mt-4">Memuat data...</div>;
  }

  if (errorMessage) {
    return <div className="text-red-500 text-center mt-4">{errorMessage}</div>;
  }

  if (!dashboardData) {
    return <div className="text-gray-500 text-center mt-4">Tidak ada data tersedia</div>;
  }

  return (
   <div className="p-6 min-h-screen">
  {/* Header */}
  <div className="flex justify-between items-center mb-8">
    <div>
      <h1 className="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
      <p className="text-gray-500 mt-1">Ringkasan aktivitas karyawan hari ini</p>
    </div>
    <div className="text-sm text-gray-500">
      {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>

  {/* Stats Cards */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    {/* Presensi Hari Ini */}
    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 font-medium">Hadir Hari Ini</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{dashboardData.data.presensi.totalHadirHariIni}</p>
        </div>
        <div className="bg-blue-100 p-3 rounded-full">
          <UserGroupIcon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
      {/* <div className="mt-4">
        <div className="flex items-center text-sm text-green-600">
          <ArrowUpIcon className="h-4 w-4 mr-1" />
          <span>+2 dari kemarin</span>
        </div>
      </div> */}
    </div>

    {/* Total Karyawan */}
    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 font-medium">Total Karyawan</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{dashboardData.data.karyawan.length}</p>
        </div>
        <div className="bg-indigo-100 p-3 rounded-full">
          <UsersIcon className="h-6 w-6 text-indigo-600" />
        </div>
      </div>
    </div>

    {/* Cuti Pending */}
    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 font-medium">Cuti Pending</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{dashboardData.data.leaveRequests.length}</p>
        </div>
        <div className="bg-amber-100 p-3 rounded-full">
          <ClockIcon className="h-6 w-6 text-amber-600" />
        </div>
      </div>
    </div>
  </div>

  {/* Main Content */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Lokasi Kantor */}
    <div className="lg:col-span-1">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <MapPinIcon className="h-5 w-5 text-red-500 mr-2" />
            Lokasi Kantor
          </h2>
        </div>
        <div className="p-6">
          {dashboardData.data.lokasiKantor.length > 0 ? (
            <ul className="space-y-4">
              {dashboardData.data.lokasiKantor.map((lokasi) => (
                <li key={lokasi.id} className="flex items-start">
                  <div className="bg-red-100 p-2 rounded-full mr-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{lokasi.nama_kantor}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">Koordinat:</span> {lokasi.latitude}, {lokasi.longitude}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Radius:</span> {lokasi.radius_meter} meter
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada data lokasi kantor</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Tabel Karyawan & Cuti */}
    <div className="lg:col-span-2 space-y-6">
      {/* Tabel Karyawan */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <UserIcon className="h-5 w-5 text-blue-500 mr-2" />
            Daftar Karyawan Aktif
          </h2>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
           <Link
  href="/dashboard/employee"
  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
>
  Lihat Semua →
</Link>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telepon
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bergabung
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData.data.karyawan.slice(0, 5).map((karyawan) => (
                <tr key={karyawan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {karyawan.nama.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{karyawan.nama}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {karyawan.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {karyawan.no_telepon}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(karyawan.tanggal_bergabung).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel Cuti Pending */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <ClockIcon className="h-5 w-5 text-amber-500 mr-2" />
            Permintaan Cuti Pending
          </h2>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Link
  href="/dashboard/leave_requests"
  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
>
  Lihat Semua →
</Link>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jenis
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData.data.leaveRequests.slice(0, 5).map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {leave.karyawan_nama}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      leave.jenis === 'cuti' ? 'bg-blue-100 text-blue-800' : 
                      leave.jenis === 'sakit' ? 'bg-red-100 text-red-800' : 
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {leave.jenis}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(leave.tanggal_mulai).toLocaleDateString('id-ID')} - {new Date(leave.tanggal_selesai).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}