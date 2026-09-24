import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    // Fetch orders safely with try-catch fallback in case relations are missing
    let verifiedOrders: any[] = [];
    try {
      verifiedOrders = await prisma.order.findMany({
        where: {
          status: "VERIFIED",
          createdAt: { gte: startOfMonth },
        },
        include: {
          business: true,
          orderItems: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (dbError) {
      console.error("Prisma relation fetch error, falling back:", dbError);
      // Fallback to simple query if relations fail
      verifiedOrders = await prisma.order.findMany({
        where: { status: "VERIFIED" },
        orderBy: { createdAt: "desc" },
      });
    }

    const totalRevenue = verifiedOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || order.amount || 0), 0);

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(20).fillColor("#1E293B").text("StartupSpark — Monthly Sales Audit");
    doc.fontSize(11).fillColor("#64748B").text(`Period: ${startOfMonth.toLocaleDateString()} - Present`);
    doc.moveDown(1);
    doc.fontSize(12).fillColor("#1E293B").text(`Total Verified Orders: ${verifiedOrders.length} | Total Revenue: Rs.${totalRevenue.toFixed(2)}`);
    doc.moveDown(1);

    const tableTop = doc.y;
    doc.fontSize(9).fillColor("#334155");
    doc.text("Date", 50, tableTop, { width: 70 });
    doc.text("Business", 120, tableTop, { width: 120 });
    doc.text("Items Count", 240, tableTop, { width: 70, align: "center" });
    doc.text("Amount", 310, tableTop, { width: 100, align: "right" });
    doc.text("Status", 420, tableTop, { width: 120, align: "right" });
    doc.moveTo(50, tableTop + 14).lineTo(540, tableTop + 14).strokeColor("#CBD5E1").stroke();

    let y = tableTop + 20;

    if (verifiedOrders.length === 0) {
      doc.fontSize(10).fillColor("#94A3B8").text("No verified orders this month yet.", 50, y);
    } else {
      for (const order of verifiedOrders) {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }

        const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—";
        const itemCount = order.orderItems && Array.isArray(order.orderItems)
          ? order.orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
          : 1;

        const businessName = order.business?.businessName || order.businessName || "—";
        const orderAmount = Number(order.totalAmount || order.amount || 0);

        doc.fontSize(8).fillColor("#1E293B");
        doc.text(dateStr, 50, y, { width: 70 });
        doc.text(businessName, 120, y, { width: 120 });
        doc.text(String(itemCount), 240, y, { width: 70, align: "center" });
        doc.text(`Rs.${orderAmount.toFixed(2)}`, 310, y, { width: 100, align: "right" });
        doc.text(order.status || "VERIFIED", 420, y, { width: 120, align: "right" });

        y += 22;
      }
    }

    doc.end();
    const pdfBuffer = await pdfReady;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="monthly-sales-audit-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Generate monthly sales audit fatal error:", error);
    return NextResponse.json({ message: "Unable to generate report.", error: String(error) }, { status: 500 });
  }
}