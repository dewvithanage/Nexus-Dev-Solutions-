import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    // 401 = not signed in, 403 = signed in but not an admin.
    const admin = await getCurrentUser();
    if (!admin) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }
    if (admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // The relation on Order is called "items" (not "orderItems"). There is
    // deliberately no try/catch fallback here: the old fallback ran a plain
    // query with no month filter and no business/item data, so a failure
    // produced a report that downloaded fine but listed every verified order
    // ever. If this query fails, the catch block below returns a clear error.
    const verifiedOrders = await prisma.order.findMany({
      where: {
        status: "VERIFIED",
        createdAt: { gte: startOfMonth },
      },
      include: {
        business: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = verifiedOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(20).fillColor("#1E293B").text("StartupSpark - Monthly Sales Audit");
    doc.fontSize(11).fillColor("#64748B").text(`Period: ${startOfMonth.toLocaleDateString()} - Present`);
    doc.moveDown(1);
    doc
      .fontSize(12)
      .fillColor("#1E293B")
      .text(`Total Verified Orders: ${verifiedOrders.length} | Total Revenue: Rs.${totalRevenue.toFixed(2)}`);
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

        const dateStr = new Date(order.createdAt).toLocaleDateString();
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const businessName = order.business.businessName;
        const orderAmount = Number(order.totalAmount);

        doc.fontSize(8).fillColor("#1E293B");
        doc.text(dateStr, 50, y, { width: 70 });
        doc.text(businessName, 120, y, { width: 120 });
        doc.text(String(itemCount), 240, y, { width: 70, align: "center" });
        doc.text(`Rs.${orderAmount.toFixed(2)}`, 310, y, { width: 100, align: "right" });
        doc.text(order.status, 420, y, { width: 120, align: "right" });

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
    return NextResponse.json({ message: "Unable to generate report." }, { status: 500 });
  }
}
