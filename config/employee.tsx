export interface Employee {
  id: string;
  nik: string;
  nama: string;
  status: React.ReactNode; 
}

export const employees: Employee[] = [
  {
      id: "1",
      nik: "123456",
      nama: "John Doe",
      status: "Aktif",
  },
  {
      id: "2",
      nik: "654321",
      nama: "Jane Doe",
      status: "Nonaktif",
  },
];
