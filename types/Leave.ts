export type Leave = {
  id?: number;
  karyawan_nama: string;
  approver_username: string | null;  // Username dari tabel users
  karyawan_id: number;
  jenis: 'cuti' | 'sakit' | 'dinas';
  tanggal_mulai: string;
  tanggal_selesai: string;
  status?: 'pending' | 'approved' | 'rejected';
  keterangan?: string;
  foto_bukti?: string;
};
