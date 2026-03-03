import { useEffect, useMemo, useState } from 'react';
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

function TextInput({ type = 'text', value, placeholder, onChange }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      className='w-full h-14 rounded-2xl border border-[#C5CED8] bg-white px-4 text-[#111827] text-base placeholder:text-[#667085] outline-none focus:ring-2 focus:ring-[#BE244A]/20 focus:border-[#BE244A] transition-all'
    />
  );
}

function InputWithActionButton({ value, placeholder, onChange, onAction }) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3'>
      <TextInput value={value} placeholder={placeholder} onChange={onChange} />
      <button
        type='button'
        onClick={onAction}
        className='h-14 px-5 rounded-2xl border border-[#C5CED8] bg-white text-[#344054] text-base font-semibold hover:bg-[#F8FAFC] transition-colors flex items-center justify-center gap-2'
      >
        <Upload className='w-4 h-4' />
        Upload &amp; Crop
      </button>
    </div>
  );
}

function CreateRCSUser({ prefill, onReset }) {
  const [form, setForm] = useState(() => createInitialRcsForm(prefill));
  const [activeUploadKey, setActiveUploadKey] = useState(null);
  const activeUploadSpec = useMemo(
    () => UPLOAD_SPECS.find((uploadSpec) => uploadSpec.key === activeUploadKey) || null,
    [activeUploadKey]
  );

  useEffect(() => {
    setForm(createInitialRcsForm(prefill));
  }, [prefill?.brandName, prefill?.email, prefill?.phone, prefill?.fullName]);

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const logUploadIntent = (key) => {
    console.log('[RCS Demo] Upload placeholder clicked:', key, 'current value:', form[key] || '(empty)');
  };

  const logSectionThreeData = () => {
    console.log('[RCS Demo] Section 3 payload:', form);
  };

  const onToggleOption = (key) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
                  value={form.businessName}
                  placeholder='Enter business name'
                  onChange={(event) => updateField('businessName', event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Short Description</FieldLabel>
                <TextInput
                  value={form.shortDescription}
                  placeholder='Add short business description'
                  onChange={(event) => updateField('shortDescription', event.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <FieldLabel>Logo URL (PNG)</FieldLabel>
              <InputWithActionButton
                value={form.logoUrl}
                placeholder='https://example.com/logo.png'
                onChange={(event) => updateField('logoUrl', event.target.value)}
                onAction={() => {
                  logUploadIntent('logoUrl');
                  setActiveUploadKey('logoUrl');
                }}
              />
            </div>

            <div className='space-y-2'>
              <FieldLabel>Header Image URL (PNG)</FieldLabel>
              <InputWithActionButton
                value={form.headerImageUrl}
                placeholder='https://example.com/header.png'
                onChange={(event) => updateField('headerImageUrl', event.target.value)}
                onAction={() => {
                  logUploadIntent('headerImageUrl');
                  setActiveUploadKey('headerImageUrl');
                }}
              />
            </div>
          </SectionCard>

          <SectionCard title='Contact Actions'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <FieldLabel required>Phone Number</FieldLabel>
                <TextInput
                  value={form.phoneNumber}
                  placeholder='+1 415 555 0142'
                  onChange={(event) => updateField('phoneNumber', event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <FieldLabel required>Website URL</FieldLabel>
                <TextInput
                  type='url'
                  value={form.websiteUrl}
                  placeholder='https://engati.com'
                  onChange={(event) => updateField('websiteUrl', event.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2 md:max-w-[50%]'>
              <FieldLabel required>Email Address</FieldLabel>
              <TextInput
                type='email'
                value={form.emailAddress}
                placeholder='hello@engati.com'
                onChange={(event) => updateField('emailAddress', event.target.value)}
              />
            </div>
          </SectionCard>

          <SectionCard title='Info Tab Content'>
            <div className='space-y-2'>
              <FieldLabel>Info Summary</FieldLabel>
              <textarea
                value={form.infoSummary}
                placeholder='Write how your business helps users'
                onChange={(event) => updateField('infoSummary', event.target.value)}
                className='w-full min-h-28 rounded-2xl border border-[#C5CED8] bg-white p-4 text-[#111827] text-base placeholder:text-[#667085] outline-none focus:ring-2 focus:ring-[#BE244A]/20 focus:border-[#BE244A] transition-all resize-none'
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <FieldLabel>Support Start Time</FieldLabel>
                <TextInput
                  type='time'
                  value={form.supportStartTime}
                  onChange={(event) => updateField('supportStartTime', event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <FieldLabel>Support End Time</FieldLabel>
                <TextInput
                  type='time'
                  value={form.supportEndTime}
                  onChange={(event) => updateField('supportEndTime', event.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <FieldLabel>Support Address</FieldLabel>
              <TextInput
                value={form.supportAddress}
                placeholder='Add your support address'
                onChange={(event) => updateField('supportAddress', event.target.value)}
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
                    checked={Boolean(form[option.key])}
                    onChange={() => onToggleOption(option.key)}
                    className='h-5 w-5 accent-[#BE244A]'
                  />
                </label>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className='lg:sticky lg:top-24 lg:self-start h-fit'>
          <RcsPhonePreview form={form} />
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-end gap-3'>
        {onReset ? (
          <button
            type='button'
            onClick={onReset}
            className='h-11 px-4 rounded-xl border border-[#C5CED8] bg-white text-[#344054] text-sm font-semibold hover:bg-[#F8FAFC] transition-colors'
          >
            Restart Funnel
          </button>
        ) : null}
        <button
          type='button'
          onClick={logSectionThreeData}
          className='h-11 px-4 rounded-xl bg-[#111827] text-white text-sm font-semibold hover:bg-[#1F2937] transition-colors'
        >
          Log Section 3 Data
        </button>
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
              <h4 className='text-lg font-semibold text-[#111827]'>Upload &amp; Crop {activeUploadSpec.title}</h4>
              <button
                type='button'
                className='h-9 px-3 rounded-lg border border-[#C5CED8] text-sm font-semibold text-[#344054] hover:bg-white transition-colors'
                onClick={() => setActiveUploadKey(null)}
              >
                Close
              </button>
            </div>

            <ImageUploadCropper
              spec={activeUploadSpec}
              value={form[activeUploadSpec.key]}
              onChange={(nextValue) => updateField(activeUploadSpec.key, nextValue)}
              onDone={() => setActiveUploadKey(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CreateRCSUser;
