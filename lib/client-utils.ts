export function shrink(file: File, max: number = 1200): Promise<Blob | File> {
  return new Promise((resolve) => {
    // If it's not an image file or FileReader is unavailable, return original file
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;

          if (!origW || !origH) {
            return resolve(file);
          }

          // Scale down proportionally to max dimension
          const s = Math.min(1, max / Math.max(origW, origH));
          const targetW = Math.max(1, Math.round(origW * s));
          const targetH = Math.max(1, Math.round(origH * s));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return resolve(file);
          }

          ctx.drawImage(img, 0, 0, targetW, targetH);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size > 0) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.82
          );
        } catch (err) {
          console.warn('Canvas processing error on mobile, using original file:', err);
          resolve(file);
        }
      };

      img.onerror = () => {
        console.warn('Could not decode image via Image(), using original file.');
        resolve(file);
      };

      const result = readerEvent.target?.result as string;
      if (result) {
        img.src = result;
      } else {
        resolve(file);
      }
    };

    reader.onerror = () => {
      console.warn('FileReader error on iPhone, using original file.');
      resolve(file);
    };

    try {
      reader.readAsDataURL(file);
    } catch (e) {
      resolve(file);
    }
  });
}
