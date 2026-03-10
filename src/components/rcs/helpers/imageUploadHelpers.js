export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });
}

export function getImageDimensions(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => reject(new Error('Unable to load image dimensions.'));
    image.src = source;
  });
}

export function validateImageDimensions(width, height, minWidth, minHeight) {
  if (width < minWidth || height < minHeight) {
    return `Image too small. Minimum required is ${minWidth}x${minHeight}.`;
  }

  return '';
}

export function cropImageDataUrl({
  source,
  outputWidth,
  outputHeight,
  zoom,
  offsetX,
  offsetY,
  fitMode = 'cover',
}) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Unable to get canvas context.'));
        return;
      }

      const baseScale =
        fitMode === 'contain'
          ? Math.min(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight)
          : Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
      const scaled = baseScale * zoom;
      const drawWidth = image.naturalWidth * scaled;
      const drawHeight = image.naturalHeight * scaled;

      const maxOffsetX = Math.max(0, (drawWidth - outputWidth) / 2);
      const maxOffsetY = Math.max(0, (drawHeight - outputHeight) / 2);
      const drawX = (outputWidth - drawWidth) / 2 + offsetX * maxOffsetX;
      const drawY = (outputHeight - drawHeight) / 2 + offsetY * maxOffsetY;

      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => reject(new Error('Unable to crop selected image.'));
    image.src = source;
  });
}

export function downloadDataUrlFile(dataUrl, fileName = 'image.png') {
  if (!dataUrl) {
    return;
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
