import ProductOverviewCard from "@/components/card/ProductOverviewCard/ProductOverviewCard";
import ActiveSalesCard from "@/components/card/ActiveSalesCard/ActiveSalesCard";
import ProductRevenueCard from "@/components/card/ProductRevenueCard/ProductRevenueCard";

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-gray-600">
        Track your sales and performance of your energy
      </p>

      <div className="flex flex-col lg:flex-row gap-4 mt-4 items-stretch">
        <div className="lg:w-1/3 w-full">
          <ProductOverviewCard className="h-full" />
        </div>

        <div className="lg:w-2/3 w-full border border-gray-200 rounded-xl overflow-hidden flex flex-col lg:flex-row h-full">
  <ActiveSalesCard className="h-full flex-1 border-r border-gray-200" />
  <ProductRevenueCard className="h-full flex-1" />
</div>

      </div>
    </>
  );
}
