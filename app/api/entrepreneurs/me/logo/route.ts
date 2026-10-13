import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireEntrepreneur } from "@/lib/api";
import { saveUploadedFile, UploadValidationError } from "@/lib/upload";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError("Send the logo as multipart/form-data.", 400);
    }

    const file = formData.get("logo");

    if (!(file instanceof File)) {
      return jsonError("No logo file provided.", 400);
    }

    const url = await saveUploadedFile(file, "logos");

    const business = await prisma.business.update({
      where: { id: auth.business.id },
      data: { logoUrl: url },
    });

    return NextResponse.json({ message: "Logo updated.", business });
  } catch (error) {
    // Wrong file type, empty or too large: the user's mistake, not a
    // server fault, so 400 with the reason instead of a generic 500.
    if (error instanceof UploadValidationError) {
      return jsonError(error.message, 400);
    }
    console.error("Upload logo error:", error);
    return NextResponse.json({ message: "Unable to upload logo." }, { status: 500 });
  }
}
