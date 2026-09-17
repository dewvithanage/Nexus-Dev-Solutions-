// Sample recent orders shown on the dashboard.
// TODO (Sprint 1, Feature 5/Imesha): replace with real Orders loaded via
// Prisma once the Order model has data — see the team architecture doc.
const recentOrders = [
  { id: "#1024", customer: "Emma Vance", product: "iPhone 11 BackCover", quantity: 1, status: "Completed" },
  { id: "#1023", customer: "Liam Chen", product: "MI Mouse", quantity: 1, status: "Pending Pickup" },
  { id: "#1022", customer: "Sophia Vance", product: "Tempered Glass", quantity: 1, status: "Completed" },
];

export default function RecentOrders() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#101828]">Recent Orders</h2>
        <button type="button" className="text-[11px] font-medium text-blue-600 hover:underline">
          View All Orders
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead className="bg-[#f8fafc]">
            <tr className="text-[10px] text-slate-500">
              <th className="px-5 py-3 font-medium">Order ID</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 text-center font-medium">Quantity</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <tr key={order.id} className="text-[11px] text-slate-600">
                <td className="px-5 py-4 font-semibold text-slate-800">{order.id}</td>
                <td className="px-5 py-4">{order.customer}</td>
                <td className="px-5 py-4 font-medium text-slate-800">{order.product}</td>
                <td className="px-5 py-4 text-center">{order.quantity}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-[9px] font-medium ${
                      order.status === "Completed"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
