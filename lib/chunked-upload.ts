/**
 * Client-side helper to upload audio files in 2MB chunks with retry capability,
 * completely bypassing Vercel's 4.5MB Serverless Function payload limit.
 */
export async function uploadLargeAudioInChunks(
  file: File | Blob,
  fileName: string = 'audio.mp3',
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per chunk
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const uploadId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  let mimeType = file.type || 'audio/mpeg';
  if (mimeType === 'audio/mp3') mimeType = 'audio/mpeg';

  let finalMediaUrl = '';

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkBlob = file.slice(start, end);

    const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    if (onProgress) {
      onProgress(percent, `Uploading audio track (${percent}%)...`);
    }

    let success = false;
    let lastError = '';

    // Retry up to 3 times per chunk for network resilience
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileName', fileName);
        formData.append('mimeType', mimeType);
        formData.append('chunk', chunkBlob, `${fileName}.part${chunkIndex}`);

        const res = await fetch('/api/upload-chunk', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Server returned ${res.status}: ${errText}`);
        }

        const result = await res.json();
        if (result.completed && result.mediaUrl) {
          finalMediaUrl = result.mediaUrl;
        }

        success = true;
        break;
      } catch (err: any) {
        lastError = err?.message || String(err);
        await new Promise((r) => setTimeout(r, 800)); // wait before retry
      }
    }

    if (!success) {
      throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}: ${lastError}`);
    }
  }

  return finalMediaUrl || `/api/media/${uploadId}`;
}
