import { useMemo, useState } from 'react';

import {
  cropImageDataUrl,
  getImageDimensions,
  readFileAsDataUrl,
  validateImageDimensions,
} from '../helpers/imageUploadHelpers';

function ImageUploadCropper({ spec, value, onChange, onDone }) {
  const [cropState, setCropState] = useState(null);
  const [error, setError] = useState('');

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
    if (!cropState) {
      return;
    }

    try {
      const croppedDataUrl = await cropImageDataUrl({
        source: cropState.source,
        outputWidth: spec.outputWidth,
        outputHeight: spec.outputHeight,
        zoom: cropState.zoom,
        offsetX: cropState.offsetX,
        offsetY: cropState.offsetY,
      });

      onChange(croppedDataUrl);
      setCropState(null);
      onDone?.();
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : 'Unable to apply crop.');
    }
  };

  return (
    <div className='space-y-4'>
      <div className='rounded-xl border border-[#D0D5DD] bg-white p-4'>
        <h4 className='text-base font-semibold text-[#111827]'>{spec.title}</h4>
        <p className='text-sm text-[#475467] mt-1'>
          Minimum: {spec.minWidth}x{spec.minHeight} | Output: {spec.outputWidth}x{spec.outputHeight}
        </p>

        <label className='mt-4 inline-flex h-11 px-4 rounded-xl border border-[#C5CED8] bg-white text-[#344054] text-sm font-semibold cursor-pointer hover:bg-[#F8FAFC] transition-colors items-center'>
          <input
            type='file'
            accept='image/png,image/jpeg,image/webp'
            className='hidden'
            onChange={(event) => onFileSelected(event.target.files?.[0])}
          />
          Upload Image
        </label>

        {error ? <p className='text-sm text-[#B42318] mt-3'>{error}</p> : null}

        {value ? (
          <div className='mt-4 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] p-2'>
            <img src={value} alt={`${spec.title} preview`} className='w-full rounded-md object-contain max-h-32' />
          </div>
        ) : null}
      </div>

      {cropState ? (
        <div className='rounded-xl border border-[#D0D5DD] bg-white p-4 space-y-4'>
          <div className='rounded-lg border border-[#EAECF0] bg-[#F8FAFC] overflow-hidden'>
            <div className='relative w-full' style={{ aspectRatio: `${spec.outputWidth} / ${spec.outputHeight}` }}>
              <img
                src={cropState.source}
                alt='Crop source'
                className='absolute inset-0 w-full h-full object-cover'
                style={previewStyle}
              />
            </div>
          </div>

          <div className='space-y-3'>
            <label className='block text-sm font-medium text-[#344054]'>
              Zoom
              <input
                type='range'
                min='1'
                max='3'
                step='0.1'
                value={cropState.zoom}
                onChange={(event) =>
                  setCropState((previous) =>
                    previous
                      ? {
                          ...previous,
                          zoom: Number(event.target.value),
                        }
                      : previous
                  )
                }
                className='w-full mt-1'
              />
            </label>

            <label className='block text-sm font-medium text-[#344054]'>
              Horizontal
              <input
                type='range'
                min='-1'
                max='1'
                step='0.01'
                value={cropState.offsetX}
                onChange={(event) =>
                  setCropState((previous) =>
                    previous
                      ? {
                          ...previous,
                          offsetX: Number(event.target.value),
                        }
                      : previous
                  )
                }
                className='w-full mt-1'
              />
            </label>

            <label className='block text-sm font-medium text-[#344054]'>
              Vertical
              <input
                type='range'
                min='-1'
                max='1'
                step='0.01'
                value={cropState.offsetY}
                onChange={(event) =>
                  setCropState((previous) =>
                    previous
                      ? {
                          ...previous,
                          offsetY: Number(event.target.value),
                        }
                      : previous
                  )
                }
                className='w-full mt-1'
              />
            </label>
          </div>

          <div className='flex items-center justify-end gap-2'>
            <button
              type='button'
              className='h-10 px-4 rounded-lg border border-[#C5CED8] text-sm font-semibold text-[#344054] hover:bg-[#F8FAFC] transition-colors'
              onClick={() => setCropState(null)}
            >
              Cancel
            </button>
            <button
              type='button'
              className='h-10 px-4 rounded-lg bg-[#BE244A] text-white text-sm font-semibold hover:bg-[#A91F42] transition-colors'
              onClick={applyCrop}
            >
              Apply Crop
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ImageUploadCropper;
