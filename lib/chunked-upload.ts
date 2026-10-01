/**
 * Client-side helper to upload large files (up to 25MB) in 2MB chunks,
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
  const uploadId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
    ? crypto.randomUUID() 
    : `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const mimeType = file.type || 'audio/mpeg';

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkBlob = file.slice(start, end);

    const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    if (onProgress) {
      onProgress(percent, `Uploading audio track (${percent}%)...`);
    }

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
      throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}: ${errText}`);
    }

    const result = await res.json();
    if (result.completed && result.mediaUrl) {
      return result.mediaUrl;
    }
  }

  return `/api/media/${uploadId}`;
}
