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
  const initialValues = useMemo(() => createInitialRcsForm(prefill), [
    prefill?.brandName,
    prefill?.email,
    prefill?.phone,
    prefill?.fullName,
  ]);
  const { register, control, reset, getValues, setValue } = useForm({
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
    reset(createInitialRcsForm(prefill));
  }, [prefill?.brandName, prefill?.email, prefill?.phone, prefill?.fullName, reset]);

  const logUploadIntent = (key) => {
    console.log(
      '[RCS Demo] Upload placeholder clicked:',
      key,
      'current value:',
      getValues(key) || '(empty)'
    );
  };

  const handleSubmitFinal = async () => {
    try {
      setIsSubmittingFinal(true);
      const formValues = getValues();

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
        <div className='space-y-4'>
          <SectionCard
            title='Business Profile'
            subtitle='Configure your business info and preview before final submission.'
          >
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <FieldLabel required>Business Name</FieldLabel>
                <TextInput
                  placeholder='Enter business name'
                  registerProps={register('businessName')}
                />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Short Description</FieldLabel>
                <TextInput
                  placeholder='Add short business description'
                  registerProps={register('shortDescription')}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <FieldLabel>Logo URL (PNG)</FieldLabel>
              <InputWithActionButton
                placeholder='https://example.com/logo.png'
                registerProps={register('logoUrl')}
                onAction={() => {
                  logUploadIntent('logoUrl');
                  setActiveUploadKey('logoUrl');
                }}
              />
            </div>

            <div className='space-y-2'>
              <FieldLabel>Header Image URL (PNG)</FieldLabel>
              <InputWithActionButton
                placeholder='https://example.com/header.png'
                registerProps={register('headerImageUrl')}
                onAction={() => {
                  logUploadIntent('headerImageUrl');
                  setActiveUploadKey('headerImageUrl');
                }}
              />
            </div>
          </SectionCard>

          <SectionCard title='Contact Info'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <FieldLabel required>Phone Number</FieldLabel>
                <TextInput
                  placeholder='+1 415 555 0142'
                  registerProps={register('phoneNumber')}
                />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Website URL</FieldLabel>
                <TextInput
                  type='url'
                  placeholder='https://example.com'
                  registerProps={register('websiteUrl')}
                />
              </div>
            </div>

            <div className='space-y-2 md:max-w-[50%]'>
              <FieldLabel required>Email Address</FieldLabel>
              <TextInput
                type='email'
                placeholder='example@gamil.com'
                registerProps={register('emailAddress')}
              />
            </div>
          </SectionCard>

          <SectionCard title='Info Tab Content'>
            <div className='space-y-2'>
              <FieldLabel>Info Summary</FieldLabel>
              <textarea
                placeholder='Write how your business helps users'
                {...register('infoSummary')}
                className='w-full min-h-28 rounded-2xl border border-[#C5CED8] bg-white p-4 text-[#111827] text-base placeholder:text-[#667085] outline-none focus:ring-2 focus:ring-[#BE244A]/20 focus:border-[#BE244A] transition-all resize-none'
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <FieldLabel>Support Start Time</FieldLabel>
                <TextInput
                  type='time'
                  registerProps={register('supportStartTime')}
                />
              </div>
              <div className='space-y-2'>
                <FieldLabel>Support End Time</FieldLabel>
                <TextInput
                  type='time'
                  registerProps={register('supportEndTime')}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <FieldLabel>Support Address</FieldLabel>
              <TextInput
                placeholder='Add your support address'
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
              onClick={handleSubmitFinal}
              disabled={isSubmittingFinal}
              className='h-12 w-full rounded-xl bg-[#BE244A] text-white text-base font-semibold hover:bg-[#A91F42] hover:cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {isSubmittingFinal ? 'Submitting...' : 'Submit Final Payload'}
            </button>
          </div>
        </div>

        <div className='lg:sticky lg:top-20 lg:self-start h-fit'>
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
