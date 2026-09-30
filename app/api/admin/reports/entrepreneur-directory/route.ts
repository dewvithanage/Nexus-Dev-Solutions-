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

    const entrepreneurs = await prisma.entrepreneurProfile.findMany({
      where: { status: "APPROVED" },
      orderBy: { appliedAt: "asc" },
      include: {
        user: true,
        business: {
          include: {
            products: true,
            orders: { where: { status: "VERIFIED" } },
          },
        },
      },
    });

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.on("data", (chunk) => chunks.push(chunk));

    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(20).fillColor("#1E293B").text("StartupSpark — Entrepreneur Directory Summary");
    doc.fontSize(11).fillColor("#64748B").text(`Generated ${new Date().toLocaleDateString()}`);
    doc.moveDown(1);
    doc.fontSize(12).fillColor("#1E293B").text(`Total Approved Entrepreneurs: ${entrepreneurs.length}`);
    doc.moveDown(1);

    const tableTop = doc.y;
    doc.fontSize(9).fillColor("#334155");
    doc.text("Name", 50, tableTop, { width: 100 });
    doc.text("Business", 150, tableTop, { width: 110 });
    doc.text("Faculty", 260, tableTop, { width: 100 });
    doc.text("Products", 360, tableTop, { width: 60, align: "center" });
    doc.text("Verified Sales", 420, tableTop, { width: 120, align: "right" });
    doc.moveTo(50, tableTop + 14).lineTo(540, tableTop + 14).strokeColor("#CBD5E1").stroke();

    let y = tableTop + 20;

    if (entrepreneurs.length === 0) {
      doc.fontSize(10).fillColor("#94A3B8").text("No approved entrepreneurs yet.", 50, y);
    } else {
      for (const entrepreneur of entrepreneurs) {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }

        const business = entrepreneur.business;
        const revenue = business?.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0) ?? 0;

        doc.fontSize(8).fillColor("#1E293B");
        doc.text(entrepreneur.user.name, 50, y, { width: 100 });
        doc.text(business?.businessName ?? "—", 150, y, { width: 110 });
        doc.text(entrepreneur.university ?? "—", 260, y, { width: 100 });
        doc.text(String(business?.products.length ?? 0), 360, y, { width: 60, align: "center" });
        doc.text(`Rs.${revenue.toFixed(2)} (${business?.orders.length ?? 0} orders)`, 420, y, { width: 120, align: "right" });

        y += 22;
      }
    }

    doc.end();
    const pdfBuffer = await pdfReady;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="entrepreneur-directory-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Generate entrepreneur directory error:", error);
    return NextResponse.json({ message: "Unable to generate report." }, { status: 500 });
  }
}