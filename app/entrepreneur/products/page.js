"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Sidebar from "../../../components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "../../../components/entrepreneur/dashboard/DashboardHeader";

export default function MyProductsPage() {
  // Store products from database
  const [products, setProducts] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Error message
  const [error, setError] = useState("");

  // Load products when page opens
  useEffect(() => {
    async function loadProducts() {
      // Get logged entrepreneur details
      const savedEntrepreneur =
        localStorage.getItem("entrepreneur");

      if (!savedEntrepreneur) {
        setError("Please login first.");
        setLoading(false);
        return;
      }

      const entrepreneur =
        JSON.parse(savedEntrepreneur);

      try {
        // Get products belonging to this entrepreneur
        const response = await fetch(
          `/api/products?entrepreneurId=${entrepreneur.id}`
        );

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.message || "Unable to load products."
          );
          return;
        }

        setProducts(data.products || []);
      } catch (error) {
        console.error("Load products error:", error);

        setError(
          "Something went wrong while loading products."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <DashboardHeader title="My Products" />

        {/* Page content */}
        <main className="flex-1 overflow-auto px-6 py-5">

          {/* Top area */}
          <div className="mb-5 flex items-center justify-between">

            <div>
              <h1 className="text-xl font-bold text-[#172033]">
                My Products
              </h1>

              <p className="mt-1 text-xs text-[#667085]">
                View and manage all products you have submitted.
              </p>
            </div>

            {/* Add Product button */}
            <Link
              href="/entrepreneur/products/add"
              className="rounded-md bg-[#2563EB] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1D4ED8]"
            >
              + Add Product
            </Link>

          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="rounded-lg border border-[#D8E0EA] bg-white p-8">
              <p className="text-sm text-[#667085]">
                Loading products...
              </p>
            </div>
          ) : products.length === 0 ? (

            /* Empty state */
            <div className="rounded-lg border border-[#D8E0EA] bg-white p-10 text-center">

              <h2 className="text-lg font-bold text-[#172033]">
                No Products Yet
              </h2>

              <p className="mt-2 text-sm text-[#667085]">
                Add your first product to StartupSpark.
              </p>

              <Link
                href="/entrepreneur/products/add"
                className="mt-5 inline-block rounded-md bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Add Product
              </Link>

            </div>

          ) : (

            /* Products table */
            <div className="overflow-hidden rounded-lg border border-[#D8E0EA] bg-white shadow-sm">

              <table className="w-full text-left">

                {/* Table header */}
                <thead className="bg-[#F4F7FB]">

                  <tr className="text-[11px] font-semibold text-[#46566C]">

                    <th className="px-5 py-4">
                      Product
                    </th>

                    <th className="px-5 py-4">
                      Category
                    </th>

                    <th className="px-5 py-4">
                      Price
                    </th>

                    <th className="px-5 py-4">
                      Stock
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Action
                    </th>

                  </tr>

                </thead>

                {/* Table body */}
                <tbody className="divide-y divide-[#E5EAF0]">

                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="transition hover:bg-[#FAFBFC]"
                    >

                      {/* Product details */}
                      <td className="px-5 py-4">

                        <p className="text-sm font-semibold text-[#172033]">
                          {product.name}
                        </p>

                        {product.description && (
                          <p className="mt-1 max-w-[280px] truncate text-xs text-[#667085]">
                            {product.description}
                          </p>
                        )}

                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 text-sm text-[#475467]">
                        {product.category}
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 text-sm font-medium text-[#172033]">
                        Rs. {Number(product.price).toFixed(2)}
                      </td>

                      {/* Quantity */}
                      <td className="px-5 py-4 text-sm text-[#475467]">
                        {product.quantity}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                            product.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : product.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {product.status}
                        </span>

                      </td>

                      {/* Edit button */}
                      <td className="px-5 py-4">

                        <Link
                          href={`/entrepreneur/products/${product.id}/edit`}
                          className="rounded-md border border-[#2563EB] px-4 py-2 text-xs font-semibold text-[#2563EB] transition hover:bg-[#EFF4FF]"
                        >
                          Edit
                        </Link>

                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </main>

      </div>

    </div>
  );
}