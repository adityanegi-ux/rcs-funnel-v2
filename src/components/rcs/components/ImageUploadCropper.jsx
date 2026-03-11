import { useMemo, useState } from 'react';

import {
  cropImageDataUrl,
  getImageDimensions,
  readFileAsDataUrl,
  validateImageDimensions,
} from '../helpers/imageUploadHelpers';
import { uploadImageDataUrl } from '../../../services/engatiJourneyApi';

function ImageUploadCropper({ spec, value, onChange, onDone }) {
  const [cropState, setCropState] = useState(null);
  const [error, setError] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const previewStyle = useMemo(() => {
    if (!cropState) {
      return {};
    }

    return {
      transform: `translate(${cropState.offsetX * 50}px, ${cropState.offsetY * 50}px) scale(${cropState.zoom})`,
    };
  }, [cropState]);

  const onFileSelected = async (file) => {
    if (!file) {
      return;
    }

    setError('');

    try {
      const fileDataUrl = await readFileAsDataUrl(file);
      const dimensions = await getImageDimensions(fileDataUrl);
      const dimensionError = validateImageDimensions(
        dimensions.width,
        dimensions.height,
        spec.minWidth,
        spec.minHeight
      );

      if (dimensionError) {
        setError(dimensionError);
        return;
      }

      setCropState({
        source: fileDataUrl,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to process selected image.');
    }
  };

  const applyCrop = async () => {
    if (!cropState || isApplying) {
      return;
    }

    try {
      setError('');
      setIsApplying(true);
      const croppedDataUrl = await cropImageDataUrl({
        source: cropState.source,
        outputWidth: spec.outputWidth,
        outputHeight: spec.outputHeight,
        zoom: cropState.zoom,
        offsetX: cropState.offsetX,
        offsetY: cropState.offsetY,
        fitMode: spec.fitMode || 'cover',
      });

      const uploadedUrl = await uploadImageDataUrl({
        dataUrl: croppedDataUrl,
        fileName: `${spec.key || 'image'}-${Date.now()}.png`,
        workflow: spec.workflow,
      });

      onChange(uploadedUrl);
      setCropState(null);
      onDone?.();
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : 'Unable to apply crop.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div>
      {cropState ? (
        <div className='rounded-xl border border-[#D0D5DD] bg-white p-4'>
          <h4 className='text-base font-semibold text-[#111827]'>{spec.title}</h4>
          <p className='text-xs text-[#667085] mt-1'>
            Minimum: {spec.minWidth}x{spec.minHeight} | Output: {spec.outputWidth}x{spec.outputHeight}
          </p>

          {error ? <p className='text-xs text-[#B42318] mt-2'>{error}</p> : null}

          <div className='mt-3 min-h-[260px] max-h-[52vh] overflow-hidden rounded-lg border border-[#EAECF0] bg-[#F8FAFC] p-2 flex items-center justify-center'>
            <img
              src={cropState.source}
              alt='Crop source'
              className='max-h-full max-w-full object-contain'
              style={previewStyle}
            />
          </div>

          <p className='mt-3 text-xs text-[#667085]'>Auto-center crop will be used for this image.</p>

          <div className='mt-3 flex items-center justify-end gap-2'>
            <button
              type='button'
              className='h-11 px-5 rounded-lg border border-[#C5CED8] text-sm font-semibold text-[#344054] hover:bg-[#F8FAFC] transition-colors'
              onClick={() => setCropState(null)}
            >
              Cancel
            </button>
            <button
              type='button'
              disabled={isApplying}
              className='h-11 px-5 rounded-lg bg-[#BE244A] text-white text-sm font-semibold hover:bg-[#A91F42] transition-colors'
              onClick={applyCrop}
            >
              {isApplying ? 'Uploading...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      ) : (
        <div className='rounded-xl border border-[#D0D5DD] bg-white p-4'>
          <h4 className='text-base font-semibold text-[#111827]'>{spec.title}</h4>
          <p className='text-xs text-[#667085] mt-1'>
            Minimum: {spec.minWidth}x{spec.minHeight} | Output: {spec.outputWidth}x{spec.outputHeight}
          </p>

          <label className='mt-4 inline-flex h-12 px-5 rounded-xl border border-[#C5CED8] bg-white text-[#344054] text-sm font-semibold cursor-pointer hover:bg-[#F8FAFC] transition-colors items-center justify-center'>
            <input
              type='file'
              accept='image/png,image/jpeg,image/webp'
              className='hidden'
              onChange={(event) => onFileSelected(event.target.files?.[0])}
            />
            Upload Image
          </label>

          {error ? <p className='text-xs text-[#B42318] mt-2'>{error}</p> : null}

          {value ? (
            <div className='mt-4 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] p-2'>
              <img src={value} alt={`${spec.title} preview`} className='w-full rounded-md object-contain max-h-32' />
              <button
                type='button'
                className='mt-2 h-9 px-3 rounded-lg border border-[#C5CED8] text-xs font-semibold text-[#344054] hover:bg-white hover:cursor-pointer transition-colors'
                onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
              >
                Open image URL
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default ImageUploadCropper;
