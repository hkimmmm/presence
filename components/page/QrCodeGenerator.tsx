/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { useRouter } from 'next/navigation';

type QRType = 'checkin' | 'checkout';

export default function QRGeneratorPage() {
  const [qrData, setQrData] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [qrType, setQrType] = useState<QRType | ''>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const userResponse = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include',
        });
        const userResult = await userResponse.json();

        if (!userResponse.ok || userResult.role !== 'admin') {
          throw new Error(userResult.message || 'Akses ditolak: Hanya admin yang diizinkan');
        }
      } catch (error: any) {
        console.error('Error checking admin:', error);
        setErrorMessage(error.message || 'Gagal memuat halaman');
        router.push('/auth/login?error=invalid_token');
      }
    };

    checkAdmin();
  }, [router]);

  // Generate QR code for mass check-in/check-out
  async function generateQR(type: QRType) {
    try {
      setErrorMessage(null);
      const body = { type, is_mass_qr: true };

      const res = await fetch('/api/generate-qr', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Gagal membuat QR code');
      }

      const data = await res.json();
      setQrData(data.qrCode);
      setQrType(type);
      setIsActive(true);
      setTimeLeft(Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
    } catch (error: any) {
      console.error('Error generating QR:', error);
      setErrorMessage(error.message || 'Gagal membuat QR code');
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
        setTimeLeft((prev) => prev - 1);
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

  // Format time mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">QR Code Generator</h1>
      </div>

      <div className="space-y-6">
        {errorMessage && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            {errorMessage}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={() => generateQR('checkin')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Generate QR Code Masuk
          </button>
          <button
            onClick={() => generateQR('checkout')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Generate QR Code Pulang
          </button>
        </div>

        <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm max-w-md mx-auto">
          {qrData ? (
            <div className="flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">
                QR Code {qrType === 'checkin' ? 'Masuk' : 'Pulang'}
              </h2>
              <div ref={qrRef} className="mb-4 p-4 bg-white rounded border border-gray-300">
                <QRCode value={qrData} size={256} bgColor="#FFFFFF" fgColor="#000000" level="Q" />
              </div>
              <div className="mb-4 text-center w-full overflow-x-auto">
                <p className="text-sm text-gray-600">
                  Encoded Data:
                  <span className="block break-all font-mono mt-1 text-xs max-w-xs">{qrData}</span>
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
          ) : (
            <div className="p-12 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">Belum ada QR code yang di-generate</p>
              <p className="text-sm text-gray-400 mt-2">
                Klik salah satu tombol di atas untuk membuat QR code massal
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}