import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Upload } from 'lucide-react';

import ImageUploadCropper from './rcs/components/ImageUploadCropper';
import RcsPhonePreview from './rcs/components/RcsPhonePreview';
import {
  OPTION_TOGGLE_FIELDS,
  UPLOAD_SPECS,
  createInitialRcsForm,
} from './rcs/helpers/rcsFormHelpers';

function SectionCard({ title, subtitle, children }) {
  return (
    <section className='rounded-3xl border border-[#D7DEE7] bg-[#F2F4F7] p-5'>
      <h3 className='text-4xl font-semibold text-[#111827]'>{title}</h3>
      {subtitle ? <p className='text-base text-[#475467] mt-2'>{subtitle}</p> : null}
      <div className='mt-5 space-y-4'>{children}</div>
    </section>
  );
}

function FieldLabel({ children, required }) {
  return (
    <p className='text-base font-semibold text-[#1F2937]'>
      {children}
      {required ? <span className='text-[#BE244A] ml-1'>*</span> : null}
    </p>
  );
}

function ValidationError({ message }) {
  if (!message) {
    return null;
  }

  return <p className='text-xs text-[#BE244A] mt-1'>{message}</p>;
}

function TextInput({ type = 'text', placeholder, registerProps }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      {...registerProps}
      className='w-full h-14 rounded-2xl border border-[#C5CED8] bg-white px-4 text-[#111827] text-base placeholder:text-[#667085] outline-none focus:ring-2 focus:ring-[#BE244A]/20 focus:border-[#BE244A] transition-all'
    />
  );
}

function InputWithActionButton({ type = 'text', placeholder, registerProps, onAction }) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3'>
      <TextInput type={type} placeholder={placeholder} registerProps={registerProps} />
      <button
        type='button'
        onClick={onAction}
        className='h-14 px-5 rounded-2xl border border-[#C5CED8] bg-white text-[#344054] text-base font-semibold hover:bg-[#F8FAFC] hover:cursor-pointer transition-colors flex items-center justify-center gap-2'
      >
        <Upload className='w-4 h-4' />
        Upload &amp; Crop
      </button>
    </div>
  );
}

function WatchedPhonePreview({ control }) {
  const form = useWatch({ control });

  return <RcsPhonePreview form={form || {}} />;
}

function CreateRCSUser({ prefill, onSubmitFinal }) {
  const initialValues = useMemo(() => createInitialRcsForm(prefill), [prefill]);
  const {
    register,
    control,
    reset,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues,
  });
  const [activeUploadKey, setActiveUploadKey] = useState(null);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [logoUrlValue = '', headerImageUrlValue = ''] = useWatch({
    control,
    name: ['logoUrl', 'headerImageUrl'],
  });
  const activeUploadSpec = useMemo(
    () => UPLOAD_SPECS.find((uploadSpec) => uploadSpec.key === activeUploadKey) || null,
    [activeUploadKey]
  );
  const activeUploadValue =
    activeUploadSpec?.key === 'headerImageUrl' ? headerImageUrlValue : logoUrlValue;

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const logUploadIntent = (key) => {
    console.log(
      '[RCS Demo] Upload placeholder clicked:',
      key,
      'current value:',
      getValues(key) || '(empty)'
    );
  };

  const handleSubmitFinal = async (formValues) => {
    try {
      setIsSubmittingFinal(true);

      if (onSubmitFinal) {
        await onSubmitFinal(formValues);
      } else {
        console.log('[RCS Demo] Section 3 payload:', formValues);
      }
    } catch (error) {
      console.error('[RCS Demo] Section 3 submit failed:', error);
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start'>
        <div className='space-y-4 xl:max-h-[calc(100vh-120px)] xl:overflow-y-auto xl:pr-2'>
          <SectionCard
            title='Business Profile'
            subtitle='Configure your business info and preview before final submission.'
          >
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <FieldLabel required>Business Name</FieldLabel>
                <TextInput
                  placeholder='Acme Foods'
                  registerProps={register('businessName', {
                    required: 'Business Name is required',
                    minLength: { value: 2, message: 'Use at least 2 characters' },
                    maxLength: { value: 60, message: 'Keep it within 60 characters' },
                  })}
                />
                <ValidationError message={errors.businessName?.message} />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Short Description</FieldLabel>
                <TextInput
                  placeholder='Fresh groceries delivered in 30 minutes.'
                  registerProps={register('shortDescription', {
                    required: 'Short Description is required',
                    minLength: { value: 5, message: 'Use at least 5 characters' },
                    maxLength: { value: 120, message: 'Keep it within 120 characters' },
                  })}
                />
                <ValidationError message={errors.shortDescription?.message} />
              </div>
            </div>

            <div className='space-y-2'>
              <FieldLabel>Logo URL (PNG)</FieldLabel>
              <InputWithActionButton
                placeholder='https://cdn.yourdomain.com/assets/logo.png'
                registerProps={register('logoUrl', {
                  pattern: {
                    value: /^https:\/\/.+\.png$/i,
                    message: 'Use a valid https://...png URL',
                  },
                })}
                onAction={() => {
                  logUploadIntent('logoUrl');
                  setActiveUploadKey('logoUrl');
                }}
              />
              <ValidationError message={errors.logoUrl?.message} />
            </div>

            <div className='space-y-2'>
              <FieldLabel>Header Image URL (PNG)</FieldLabel>
              <InputWithActionButton
                placeholder='https://cdn.yourdomain.com/assets/header.png'
                registerProps={register('headerImageUrl', {
                  pattern: {
                    value: /^https:\/\/.+\.png$/i,
                    message: 'Use a valid https://...png URL',
                  },
                })}
                onAction={() => {
                  logUploadIntent('headerImageUrl');
                  setActiveUploadKey('headerImageUrl');
                }}
              />
              <ValidationError message={errors.headerImageUrl?.message} />
            </div>
          </SectionCard>

          <SectionCard title='Contact Actions'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
              <div className='space-y-2'>
                <FieldLabel>Call Label</FieldLabel>
                <TextInput
                  placeholder='Call'
                  registerProps={register('callLabel', {
                    maxLength: { value: 30, message: 'Keep it within 30 characters' },
                  })}
                />
                <ValidationError message={errors.callLabel?.message} />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Call Value</FieldLabel>
                <TextInput
                  placeholder='919876543210'
                  registerProps={register('callValue', {
                    required: 'Call Value is required',
                    pattern: {
                      value: /^(\+91\d{10}|91\d{10}|0\d{10}|\d{10})$/,
                      message: 'Use 10 digits, 0+10, 91+10, or +91+10',
                    },
                  })}
                />
                <ValidationError message={errors.callValue?.message} />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
              <div className='space-y-2'>
                <FieldLabel>Website Label</FieldLabel>
                <TextInput
                  placeholder='Website'
                  registerProps={register('websiteLabel', {
                    maxLength: { value: 30, message: 'Keep it within 30 characters' },
                  })}
                />
                <ValidationError message={errors.websiteLabel?.message} />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Website Value</FieldLabel>
                <TextInput
                  type='url'
                  placeholder='https://acme.com'
                  registerProps={register('websiteValue', {
                    required: 'Website Value is required',
                    pattern: {
                      value: /^https:\/\/.+/i,
                      message: 'Use a valid https:// URL',
                    },
                  })}
                />
                <ValidationError message={errors.websiteValue?.message} />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
              <div className='space-y-2'>
                <FieldLabel>Email Label</FieldLabel>
                <TextInput
                  placeholder='Email'
                  registerProps={register('emailLabel', {
                    maxLength: { value: 30, message: 'Keep it within 30 characters' },
                  })}
                />
                <ValidationError message={errors.emailLabel?.message} />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Email Value</FieldLabel>
                <TextInput
                  type='email'
                  placeholder='hello@acme.com'
                  registerProps={register('emailValue', {
                    required: 'Email Value is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Use a valid email',
                    },
                  })}
                />
                <ValidationError message={errors.emailValue?.message} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title='Info Tab Content'>
            <div className='space-y-2'>
              <FieldLabel>Info Summary</FieldLabel>
              <textarea
                placeholder='We help users order groceries and track delivery.'
                {...register('infoSummary')}
                className='w-full min-h-28 rounded-2xl border border-[#C5CED8] bg-white p-4 text-[#111827] text-base placeholder:text-[#667085] outline-none focus:ring-2 focus:ring-[#BE244A]/20 focus:border-[#BE244A] transition-all resize-none'
              />
            </div>

            <div className='space-y-2'>
              <FieldLabel>Support Hours</FieldLabel>
              <TextInput
                placeholder='Mon-Fri, 9 AM - 6 PM'
                registerProps={register('supportHours')}
              />
            </div>

            <div className='space-y-2'>
              <FieldLabel>Support Address</FieldLabel>
              <TextInput
                placeholder='2nd Floor, MG Road, Bengaluru 560001'
                registerProps={register('supportAddress')}
              />
            </div>
          </SectionCard>

          <SectionCard title='Options Tab Toggles'>
            <div className='space-y-3'>
              {OPTION_TOGGLE_FIELDS.map((option) => (
                <label
                  key={option.key}
                  className='flex items-center justify-between rounded-2xl border border-[#C5CED8] bg-[#F9FAFB] px-4 py-3 cursor-pointer hover:bg-white transition-colors'
                >
                  <span className='text-base font-semibold text-[#344054]'>{option.label}</span>
                  <input
                    type='checkbox'
                    {...register(option.key)}
                    className='h-5 w-5 accent-[#BE244A]'
                  />
                </label>
              ))}
            </div>
          </SectionCard>

          <div className='rounded-3xl border border-[#D7DEE7] bg-[#F2F4F7] p-5 space-y-3'>
            <button
              type='button'
              onClick={handleSubmit(handleSubmitFinal)}
              disabled={isSubmittingFinal}
              className='h-12 w-full rounded-xl bg-[#BE244A] text-white text-base font-semibold hover:bg-[#A91F42] hover:cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {isSubmittingFinal ? 'Submitting...' : 'Submit Final Payload'}
            </button>
          </div>
        </div>

        <div className='xl:sticky xl:top-20 xl:self-start h-fit'>
          <WatchedPhonePreview control={control} />
        </div>
      </div>

      {activeUploadSpec ? (
        <div
          className='fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4'
          onClick={() => setActiveUploadKey(null)}
        >
          <div
            className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#D0D5DD] bg-[#F8FAFC] p-4'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='flex items-center justify-between mb-3'>
              <h4 className='text-lg font-semibold text-[#111827] hover:cursor-pointer'>Upload &amp; Crop {activeUploadSpec.title}</h4>
              <button
                type='button'
                className='h-9 px-3 rounded-lg border border-[#C5CED8] text-sm font-semibold text-[#344054] hover:bg-white  transition-colors'
                onClick={() => setActiveUploadKey(null)}
              >
                Close
              </button>
            </div>

            <ImageUploadCropper
              spec={activeUploadSpec}
              value={activeUploadValue || ''}
              onChange={(nextValue) =>
                setValue(activeUploadSpec.key, nextValue, { shouldDirty: true, shouldTouch: true })
              }
              onDone={() => setActiveUploadKey(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CreateRCSUser;
