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

  // 3. Inject f_auto,q_auto optimization parameters into secure_url
  return String(data.secure_url).replace("/upload/", "/upload/f_auto,q_auto/");
}
