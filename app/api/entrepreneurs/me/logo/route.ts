import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireEntrepreneur } from "@/lib/api-auth";
import { parseFormBody } from "@/lib/request-validation";
import { saveUploadedFile } from "@/lib/upload";

const logoSchema = z.object({ logo: z.instanceof(File, { message: "No logo file provided." }) }).strict();

export async function POST(request: NextRequest) {
  try {
    const auth = await requireEntrepreneur({ approvedOnly: false });
    if (auth.error) return auth.error;

    const parsed = await parseFormBody(request, logoSchema);
    if (parsed.error) return parsed.error;

    // Throws UploadValidationError (-> 400) for a non-image or oversized file.
    const url = await saveUploadedFile(parsed.data.logo, "logos");

    const business = await prisma.business.update({
      where: { id: auth.business.id },
      data: { logoUrl: url },
    });

    return NextResponse.json({ message: "Logo updated.", business });
  } catch (error) {
    return handleRouteError(error, "Upload logo error", { fallback: "Unable to upload logo." });
  }
}
