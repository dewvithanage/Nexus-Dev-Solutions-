// Browser helper: uploads a product's images one file per request.
//
// Vercel refuses request bodies over 4.5 MB, so sending up to four images
// together in one request would fail once they added up past that. One at a
// time, each request stays under the limit. Stops at the first failure and
// returns the server's message.
export async function uploadProductImages(
  productId: string,
  files: File[]
): Promise<{ ok: boolean; message?: string }> {
  for (const file of files) {
    const formData = new FormData();
    formData.append("images", file);
    const response = await fetch(`/api/products/${productId}/images`, { method: "POST", body: formData });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        ok: false,
        message: data.message || (response.status === 413 ? "The image is too large (max 4 MB)." : "upload failed"),
      };
    }
  }
  return { ok: true };
}
