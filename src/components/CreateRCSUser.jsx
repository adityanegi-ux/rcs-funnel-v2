import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ArrowRight, Check, Upload, X } from 'lucide-react';

import ImageUploadCropper from './rcs/components/ImageUploadCropper';
import RcsPhonePreview from './rcs/components/RcsPhonePreview';
import {
  UPLOAD_SPECS,
  createInitialRcsForm,
} from './rcs/helpers/rcsFormHelpers';

function SectionCard({ title, subtitle, children }) {
  return (
    <section className='rounded-3xl border border-[#D7DEE7] bg-[#F2F4F7] p-5'>
      <h3 className='text-2xl font-semibold text-[#111827]'>{title}</h3>
      {subtitle ? <p className='text-sm text-[#475467] mt-2'>{subtitle}</p> : null}
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
        Upload
      </button>
    </div>
  );
}

function WatchedPhonePreview({ control }) {
  const form = useWatch({ control });

  return <RcsPhonePreview form={form || {}} />;
}

function SubmissionSuccessModal({ isOpen, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className='fixed inset-0 z-[120] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4'
      onClick={onClose}
    >
      <div
        className='w-full max-w-3xl rounded-2xl overflow-hidden bg-white border border-[#E4E7EC] shadow-2xl'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='relative bg-gradient-to-r from-[#BE244A] to-[#8E1A37] px-6 py-10 flex justify-center'>
          <button
            type='button'
            className='absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20 hover:cursor-pointer transition-colors flex items-center justify-center'
            onClick={onClose}
            aria-label='Close success modal'
          >
            <X className='w-5 h-5' />
          </button>
          <div className='h-24 w-24 rounded-full border-4 border-white flex items-center justify-center'>
            <Check className='w-12 h-12 text-white' strokeWidth={3} />
          </div>
        </div>

        <div className='px-6 py-10 text-center'>
          <h3 className='text-5xl font-semibold text-[#101828]'>Great!</h3>
          <p className='mt-4 text-xl text-[#344054]'>
            Your RCS profile has been submitted successfully.
          </p>

          <a
            href='https://engati.ai/'
            target='_blank'
            rel='noopener noreferrer'
            className='mt-8 inline-flex h-14 px-8 rounded-full bg-[#BE244A] text-white text-xl font-semibold items-center gap-3 hover:bg-[#A91F42] hover:cursor-pointer transition-colors'
          >
            Visit engati.ai
            <ArrowRight className='w-6 h-6' />
          </a>
        </div>
      </div>
    </div>
  );
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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

      setShowSuccessModal(true);
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
            title='Complete your RCS Business Profile (Unlock 60 days free)'
            subtitle='These details appear in your RCS business card. Finish this step to claim 60-day free enablement. You can edit later.'
          >
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <FieldLabel required>Brand Name</FieldLabel>
                <TextInput
                  placeholder='Enter brand name'
                  registerProps={register('businessName', {
                    required: 'Business Name is required',
                    minLength: { value: 2, message: 'Use at least 2 characters' },
                    maxLength: { value: 60, message: 'Keep it within 60 characters' },
                  })}
                />
                <ValidationError message={errors.businessName?.message} />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Brand Details</FieldLabel>
                <TextInput
                  placeholder='Enter a short description about your brand'
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
              <FieldLabel>Logo URL</FieldLabel>
              <InputWithActionButton
                placeholder='Paste logo image URL'
                registerProps={register('logoUrl')}
                onAction={() => {
                  logUploadIntent('logoUrl');
                  setActiveUploadKey('logoUrl');
                }}
              />
              <ValidationError message={errors.logoUrl?.message} />
            </div>

            <div className='space-y-2'>
              <FieldLabel>Header Image URL</FieldLabel>
              <InputWithActionButton
                placeholder='Paste header image URL'
                registerProps={register('headerImageUrl')}
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
                <FieldLabel required>Customer Support Phone Number</FieldLabel>
                <TextInput
                  placeholder='919876543210'
                  registerProps={register('callValue', {
                    required: 'Customer Support Phone Number is required',
                    pattern: {
                      value: /^(\+91\d{10}|91\d{10}|0\d{10}|\d{10})$/,
                      message: 'Use 10 digits, 0+10, 91+10, or +91+10',
                    },
                  })}
                />
                <ValidationError message={errors.callValue?.message} />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Support email</FieldLabel>
                <TextInput
                  type='email'
                  placeholder='support@engati.com'
                  registerProps={register('emailValue', {
                    required: 'Support email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Use a valid email',
                    },
                  })}
                />
                <ValidationError message={errors.emailValue?.message} />
              </div>
            </div>

            <div className='gap-4 items-start'>
              <div className='space-y-2'>
                <FieldLabel required>Brand Website</FieldLabel>
                <TextInput
                  type='url'
                  placeholder='https://engati.ai'
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
          </SectionCard>

          <SectionCard title='Info tab (optional but recommended)'>
            <div className='space-y-2'>
              <FieldLabel>About your business</FieldLabel>
              <textarea
                placeholder='We help users order groceries and track delivery.'
                {...register('infoSummary')}
                className='w-full min-h-28 rounded-2xl border border-[#C5CED8] bg-white p-4 text-[#111827] text-base placeholder:text-[#667085] outline-none focus:ring-2 focus:ring-[#BE244A]/20 focus:border-[#BE244A] transition-all resize-none'
              />
            </div>
          </SectionCard>

          <SectionCard title=''>
            <div className='space-y-3'>
              <div className='space-y-2'>
                <FieldLabel required>Privacy Policy URL</FieldLabel>
                <TextInput
                  type='url'
                  placeholder='https://engati.ai/privacy-policy'
                  registerProps={register('privacyPolicyUrl', {
                    required: 'Privacy Policy URL is required',
                    pattern: {
                      value: /^https:\/\/.+/i,
                      message: 'Use a valid https:// URL',
                    },
                  })}
                />
                <ValidationError message={errors.privacyPolicyUrl?.message} />
              </div>

              <div className='space-y-2'>
                <FieldLabel required>Terms of Services URL</FieldLabel>
                <TextInput
                  type='url'
                  placeholder='https://engati.ai/terms-of-services'
                  registerProps={register('termsOfServicesUrl', {
                    required: 'Terms of Services URL is required',
                    pattern: {
                      value: /^https:\/\/.+/i,
                      message: 'Use a valid https:// URL',
                    },
                  })}
                />
                <ValidationError message={errors.termsOfServicesUrl?.message} />
              </div>
            </div>
          </SectionCard>

          <div className='rounded-3xl border border-[#D7DEE7] bg-[#F2F4F7] p-5 space-y-3'>
            <button
              type='button'
              onClick={handleSubmit(handleSubmitFinal)}
              disabled={isSubmittingFinal}
              className='h-12 w-full rounded-xl bg-[#BE244A] text-white text-base font-semibold hover:bg-[#A91F42] hover:cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {isSubmittingFinal ? 'Submitting...' : 'Submit & claim 60 days free'}
            </button>
          </div>
        </div>

        <div className='xl:sticky xl:top-20 pl-20 xl:self-start h-fit scale-0.8'>
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
              <h4 className='text-lg font-semibold text-[#111827] hover:cursor-pointer'>Upload {activeUploadSpec.title}</h4>
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

      <SubmissionSuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} />
    </div>
  );
}

export default CreateRCSUser;
