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

      const baseScale = Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
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

function extractUploadedUrl(responseBody) {
  const candidates = [
    responseBody?.url,
    responseBody?.image_url,
    responseBody?.responseObject?.url,
    responseBody?.responseObject?.image_url,
    responseBody?.data?.url,
    responseBody?.data?.image_url,
    responseBody?.result?.url,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
}

export async function uploadDataUrlToCdn(
  dataUrl,
  { fileName = 'image.png', fieldName = 'file' } = {}
) {
  const uploadUrl = '/api/engati/media-upload';
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dataUrl,
      fileName,
      fieldName,
    }),
  });

  const rawBody = await response.text();
  let responseBody = {};

  try {
    responseBody = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    responseBody = { raw: rawBody };
  }

  const looksLikeHtml = /<!doctype html|<html/i.test(rawBody);

  if (!response.ok) {
    const debugUrl = responseBody?._engati_upload_url ? ` upstream: ${responseBody._engati_upload_url}` : '';
    const debugLocation = responseBody?._engati_upload_location
      ? ` location: ${responseBody._engati_upload_location}`
      : '';
    const htmlHint = looksLikeHtml
      ? ' Upstream returned HTML (likely redirect/login/wrong upload endpoint).'
      : '';
    throw new Error(`CDN upload failed (${response.status}).${debugUrl}${debugLocation}${htmlHint}`);
  }

  const uploadedUrl = extractUploadedUrl(responseBody);

  if (!uploadedUrl) {
    const htmlHint = looksLikeHtml ? ' Upload endpoint returned HTML instead of a media URL.' : '';
    throw new Error(`CDN upload succeeded but no URL was returned.${htmlHint}`);
  }

  return uploadedUrl;
}
