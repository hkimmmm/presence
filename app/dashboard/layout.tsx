import Sidebar from "@/components/sidebar/Sidebar";
import TopNav from "@/components/topnav/TopNav";
import { SidebarProvider } from "@/context/SidebarContext";

export const metadata = {
  title: 'Dashboard',
  description: 'Halaman Dashboard',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopNav />
          <main className="p-4 flex-1 overflow-y-auto bg-white">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
