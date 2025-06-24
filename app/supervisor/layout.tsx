import Sidebar from "@/components/sidebar/_Sidebar";
import TopNav from "@/components/topnav/TopNavSpv";
import { SidebarProvider } from "@/context/SidebarContext";

export const metadata = {
  title: 'Dashboard',
  description: 'Halaman Dashboard',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
       <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
       <div className="flex-1 flex flex-col md:ml-64">
          <TopNav />
          <main className="p-4 flex-1 overflow-y-auto bg-white">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}