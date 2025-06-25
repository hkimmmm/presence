export type Users = {
    id?: number;
    username: string;
    email: string;
    password?: string;
    role: 'admin' | 'sales' | 'supervisor' | 'karyawan';
};