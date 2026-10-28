export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadToCloudinary(file: File): Promise<string> {
  // Validate maximum file size limit (<= 5MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File size (${sizeInMb}MB) exceeds the 5MB maximum limit. Please choose a smaller file.`
    );
  }

  // 1. Request cryptographic signature from our server route
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!signRes.ok) {
    const errData = await signRes.json().catch(() => ({}));
    throw new Error(
      errData.error ||
        "Cloudinary API keys are not configured or you do not have permission to upload."
    );
  }

  const { timestamp, folder, signature, apiKey, cloudName } = await signRes.json();

  // 2. Upload file directly to Cloudinary using signed payload
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!uploadRes.ok) {
    const errJson = await uploadRes.json().catch(() => ({}));
    throw new Error(
      errJson?.error?.message || "Failed to upload image to Cloudinary. Please check configuration."
    );
  }

  const data = await uploadRes.json();
  const secureUrl = String(data.secure_url).replace("/upload/", "/upload/f_auto,q_auto/");

  // 3. Register newly uploaded file in backend tracking (pending confirmation/save)
  try {
    fetch("/api/upload/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicId: data.public_id,
        url: secureUrl,
        bytes: data.bytes,
        format: data.format,
      }),
    }).catch(() => {});
  } catch (regErr) {
    console.warn("Could not register file in tracking system:", regErr);
  }

  return secureUrl;
}
