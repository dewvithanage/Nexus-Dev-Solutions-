import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { saveUploadedFile } from "@/lib/upload";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const businessId = user?.entrepreneurProfile?.business?.id;

    if (!user || user.role !== "ENTREPRENEUR" || !businessId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("logo");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No logo file provided." }, { status: 400 });
    }

    const url = await saveUploadedFile(file, "logos");

    const business = await prisma.business.update({
      where: { id: businessId },
      data: { logoUrl: url },
    });

    return NextResponse.json({ message: "Logo updated.", business });
  } catch (error) {
    console.error("Upload logo error:", error);
    return NextResponse.json({ message: "Unable to upload logo." }, { status: 500 });
  }
}
