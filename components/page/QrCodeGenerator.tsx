"use client";

import { useState, useEffect, useRef } from 'react';
import QRCode from "react-qr-code";

type QRType = 'checkin' | 'checkout';

export default function QRGeneratorPage() {
  const [qrData, setQrData] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 menit
  const [isActive, setIsActive] = useState<boolean>(false);
  const [qrType, setQrType] = useState<QRType | ''>('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // Tambahkan state untuk error
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // Ambil token dari localStorage
  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, []);

  // Fungsi untuk mengambil presensiId aktif dari API (opsional)
async function fetchActivePresensiId(): Promise<number> {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/presence', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error('Gagal mengambil presensi');
    }
    const presensiList = await res.json();
    // Cari presensi dengan checkout_time: null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activePresensi = presensiList.find((p: any) => p.checkout_time === null);
    // if (!activePresensi) {
    //   throw new Error('Tidak ada presensi aktif');
    // }
    return activePresensi.id; // Misalnya, 2
  } catch (err) {
    console.error('Error fetching presensiId:', err);
    return 2; // Fallback untuk testing
  }
}

  // Generate QR code
  async function generateQR(presensiId: number, type: 'checkin' | 'checkout') {
    try {
      setError(null); // Reset error sebelum request
      console.log('Mengirim request:', { type, presensiId });
      const res = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }), // Tambahkan otorisasi jika diperlukan
        },
        body: JSON.stringify({
          type,
          presensiId: presensiId.toString(), // Konversi ke string untuk memastikan kompatibilitas
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Gagal membuat QR code: ${errorData.message}`);
      }

      const data = await res.json();
      console.log('✅ QR Code generated:', data.qrCode);
      return data.qrCode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('❌ Error:', error);
      setError(error.message); // Simpan pesan error untuk ditampilkan
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
        <div className="flex space-x-4">
          <button
            onClick={async () => {
              if (!token) {
                setError('Silakan login terlebih dahulu');
                return;
              }
              try {
                const presensiId = await fetchActivePresensiId(); // Ambil presensiId aktif
                const qr = await generateQR(presensiId, 'checkin');
                setQrData(qr);
                setQrType('checkin');
                setTimeLeft(300);
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
                return;
              }
              try {
                const presensiId = await fetchActivePresensiId(); // Ambil presensiId aktif
                const qr = await generateQR(presensiId, 'checkout');
                setQrData(qr);
                setQrType('checkout');
                setTimeLeft(300);
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
          <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">
                {qrType === 'checkin' ? 'Check-In QR Code' : 'Check-Out QR Code'}
              </h2>

              <div
                ref={qrRef}
                className="mb-4 p-4 bg-white rounded border border-gray-300"
              >
                <QRCode
                  value={qrData}
                  size={256}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  level="Q"
                />
              </div>

              <div className="mb-4 text-center">
                <p className="text-sm text-gray-600">
                  Encoded Data:
                  <span className="block break-words font-mono mt-1">{qrData}</span>
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