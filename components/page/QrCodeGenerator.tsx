/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from 'react';
import QRCode from "react-qr-code";
import { useRouter } from 'next/navigation';

type QRType = 'checkin' | 'checkout';
type Karyawan = { id: number; nama: string };

export default function QRGeneratorPage() {
  const [qrData, setQrData] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [qrType, setQrType] = useState<QRType | ''>('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [selectedKaryawanId, setSelectedKaryawanId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isMassQR, setIsMassQR] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Ambil token dan periksa peran
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    if (!storedToken) {
      setError('Silakan login untuk membuat QR code');
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(storedToken.split('.')[1]));
      if (payload.role === 'admin') {
        setIsAdmin(true);
        fetchKaryawanList(storedToken);
      }
    } catch (err) {
      console.error('Error decoding token:', err);
    }
  }, [router]);

  // Ambil daftar karyawan untuk admin
  async function fetchKaryawanList(token: string) {
    try {
      const res = await fetch('/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Gagal mengambil daftar karyawan');
      }
      const data = await res.json();
      setKaryawanList(data);
    } catch (err: any) {
      console.error('Error fetching karyawan:', err);
      setError(err.message);
    }
  }

  // Fungsi untuk refresh token
  async function refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('Tidak ada refresh token');
      }
      const res = await fetch('/api/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Gagal refresh token');
      }
      const data = await res.json();
      localStorage.setItem('token', data.accessToken);
      setToken(data.accessToken);
      return data.accessToken;
    } catch (err: any) {
      console.error('Error refreshing token:', err);
      setError('Sesi kedaluwarsa, silakan login ulang');
      router.push('/login');
      return null;
    }
  }

  // Fungsi untuk mengambil presensiId aktif (hanya untuk mode perorangan)
  async function fetchActivePresensiId(karyawanId?: number): Promise<number> {
    try {
      let currentToken = token;
      if (!currentToken) {
        throw new Error('Tidak ada token, silakan login');
      }

      let url = '/api/presence';
      if (isAdmin && karyawanId) {
        url += `?karyawan_id=${karyawanId}`;
      }

      let res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (res.status === 401) {
        currentToken = await refreshToken();
        if (!currentToken) {
          throw new Error('Sesi kedaluwarsa, silakan login ulang');
        }
        res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Gagal mengambil presensi: ${errorData.message}`);
      }

      const presensiList = await res.json();
      console.log('Presensi list:', presensiList);
      const activePresensi = presensiList.find((p: any) => p.checkout_time === null);
      if (!activePresensi) {
        throw new Error('Tidak ada presensi aktif');
      }
      console.log('Active presensi:', activePresensi);
      return activePresensi.id;
    } catch (err: any) {
      console.error('Error fetching presensiId:', err);
      setError(err.message);
      throw err;
    }
  }

  // Generate QR code
  async function generateQR(type: 'checkin' | 'checkout', karyawanId?: number) {
    try {
      setError(null);
      const body: any = { type, is_mass_qr: isMassQR };
      
      if (!isMassQR) {
        if (isAdmin && !karyawanId) {
          throw new Error('Silakan pilih karyawan terlebih dahulu');
        }
        const presensiId = await fetchActivePresensiId(isAdmin ? karyawanId : undefined);
        body.presensiId = presensiId.toString();
        if (isAdmin && karyawanId) {
          body.karyawan_id = karyawanId;
        }
      }

      console.log('Mengirim request:', body);
      const res = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Gagal membuat QR code: ${errorData.message}`);
      }

      const data = await res.json();
      console.log('✅ QR Code generated:', data.qrCode);
      if (isMassQR) {
        setTimeLeft(Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
      } else {
        setTimeLeft(300);
      }
      return data.qrCode;
    } catch (error: any) {
      console.error('❌ Error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Download QR code
  const downloadQR = (): void => {
    if (!qrRef.current || !qrData) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const pngFile = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngFile;
      link.download = `qr-${qrType}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  // Countdown timer
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      setQrData('');
      setQrType('');
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, timeLeft]);

  // Format waktu mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-auto bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">QR Code Generator</h1>
      </div>

      <div className="space-y-6">
        {isAdmin && (
          <>
            <div>
              <label className="flex text-black items-center">
                <input
                  type="checkbox"
                  checked={isMassQR}
                  onChange={(e) => setIsMassQR(e.target.checked)}
                  className="mr-2" 
                />
                Buat QR Code Massal
              </label>
            </div>
            {!isMassQR && (
              <div>
                <label htmlFor="karyawan" className="block text-sm font-medium text-gray-700">
                  Pilih Karyawan
                </label>
                <select
                  id="karyawan"
                  value={selectedKaryawanId || ''}
                  onChange={(e) => setSelectedKaryawanId(Number(e.target.value) || null)}
                  className="mt-1 block w-full border border-gray-300 text-black rounded-md shadow-sm p-2"
                >
                  <option value="">Pilih karyawan</option>
                  {karyawanList.map((karyawan) => (
                    <option key={karyawan.id} value={karyawan.id}>
                      {karyawan.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        <div className="flex space-x-4">
          <button
            onClick={async () => {
              if (!token) {
                setError('Silakan login terlebih dahulu');
                router.push('/login');
                return;
              }
              try {
                const qr = await generateQR('checkin', isAdmin && !isMassQR ? (selectedKaryawanId ?? undefined) : undefined);
                setQrData(qr);
                setQrType('checkin');
                setIsActive(true);
              } catch (err) {
                console.error('Error generating check-in QR:', err);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Generate Check-In QR
          </button>

          <button
            onClick={async () => {
              if (!token) {
                setError('Silakan login terlebih dahulu');
                router.push('/login');
                return;
              }
              try {
                const qr = await generateQR('checkout', isAdmin && !isMassQR ? (selectedKaryawanId ?? undefined) : undefined);
                setQrData(qr);
                setQrType('checkout');
                setIsActive(true);
              } catch (err) {
                console.error('Error generating check-out QR:', err);
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Generate Check-Out QR
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {qrData ? (
          <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm max-w-md mx-auto">
  <div className="flex flex-col items-center">
    <h2 className="text-xl font-semibold mb-4 text-gray-700">
      Check-In QR Code (Massal)
    </h2>

    <div ref={qrRef} className="mb-4 p-4 bg-white rounded border border-gray-300">
      <QRCode value={qrData} size={256} bgColor="#FFFFFF" fgColor="#000000" level="Q" />
    </div>

    <div className="mb-4 text-center w-full overflow-x-auto">
      <p className="text-sm text-gray-600">
        Encoded Data:
        <span className="block break-all font-mono mt-1 text-xs max-w-xs">
          {qrData}
        </span>
      </p>
      <p className="text-sm text-gray-600 mt-1">
        Expires in: <span className="font-bold">{formatTime(timeLeft)}</span>
      </p>
    </div>

    <button
      onClick={downloadQR}
      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
    >
      Download QR Code
    </button>
  </div>
</div>
        ) : (
          <div className="mt-8 p-12 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <p className="text-gray-500">
              {token ? 'Belum ada QR code yang di-generate' : 'Silakan login untuk membuat QR code'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {token && 'Klik salah satu tombol di atas untuk membuat QR code'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}