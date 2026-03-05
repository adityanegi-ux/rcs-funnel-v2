import { useMemo, useState } from 'react';
import { Check, ChevronLeft, EllipsisVertical, Globe, Mail, Phone } from 'lucide-react';

import {
  getActionLabel,
  getEnabledOptions,
  getSubmissionReadiness,
} from '../helpers/rcsFormHelpers';

const engatiLogo = 'https://s3.ap-south-1.amazonaws.com/file-upload-public/prod/117384/ENGATI_PUBLIC/139971_03032026_123838_Screenshot_2026_03_03_at_18.08.26.png-tReBC.png'
const STATIC_SUPPORT_HOURS = 'Mon-Fri, 9 AM - 6 PM';

function PreviewAction({ icon, label }) {
  const Icon = icon;

  return (
    <div className='text-center space-y-1'>
      <Icon className='w-3 h-3 text-[#5F6368] mx-auto' />
      <p className='text-[9px] text-[#667085] truncate max-w-[82px] mx-auto'>{label}</p>
    </div>
  );
}

function RcsPhonePreview({ form }) {
  const [activeTab, setActiveTab] = useState('info');
  const readiness = useMemo(() => getSubmissionReadiness(form), [form]);
  const enabledOptions = useMemo(() => getEnabledOptions(form), [form]);
  const brandInitial = form.businessName?.slice(0, 1)?.toUpperCase() || 'E';

  return (
    <aside className='w-full'>
      <h3 className='text-xl font-semibold text-[#111827] text-center mb-4'>Preview of Business info</h3>

      <div className='mx-auto w-full max-w-[300px]'>
        <div className='relative rounded-[42px] bg-[#050C1D] p-2.5 shadow-[0_20px_50px_rgba(2,8,23,0.35)]'>
          <div className='absolute left-1/2 top-5 -translate-x-1/2 h-6 w-30 rounded-full bg-black/80 border border-[#111827]'>
            <div className='h-2 w-2 rounded-full bg-[#1F2937] absolute right-4 top-2' />
          </div>

          <div className='bg-[#F8FAFC] rounded-[32px] overflow-hidden pt-11 min-h-[560px]'>
            <div className='px-3 pb-3'>
              <div className='h-10 rounded-t-2xl bg-white border border-[#E4E7EC] px-3 flex items-center justify-between'>
                <ChevronLeft className='w-4 h-4 text-[#1F2937]' />
                <p className='text-[11px] font-semibold text-[#111827]'>Info &amp; Options</p>
                <div className='flex items-center gap-2'>
                  <Check className='w-4 h-4 text-[#334155]' />
                  <EllipsisVertical className='w-4 h-4 text-[#334155]' />
                </div>
              </div>

              <div className='rounded-2xl border border-[#E4E7EC] border-t-0 bg-white px-3 py-3'>
                {form.headerImageUrl ? (
                  <div className='rounded-xl overflow-hidden border border-[#E4E7EC]'>
                    <img src={form.headerImageUrl} alt='Header' className='h-20 w-full object-cover' />
                  </div>
                ) : (
                  <div className='rounded-xl overflow-hidden border border-[#E4E7EC] bg-[#F5EBF0] p-2'>
                    <img src={engatiLogo} alt='Engati' className='h-20 w-full object-contain' />
                  </div>
                )}

                <div className='-mt-6 flex justify-center'>
                  {form.logoUrl ? (
                    <div className='h-12 w-12 rounded-full border-2 border-[#EEF2F6] bg-white overflow-hidden'>
                      <img src={form.logoUrl} alt='Logo' className='h-full w-full object-cover' />
                    </div>
                  ) : (
                    <div className='h-12 w-12 rounded-full border-2 border-[#EEF2F6] bg-gradient-to-br from-[#3BA9CF] to-[#67D0C5] flex items-center justify-center text-[#F6F2DD] text-base font-semibold'>
                      {brandInitial}
                    </div>
                  )}
                </div>

                <div className='text-center mt-2'>
                  <h4 className='text-2xl font-semibold text-[#111827]'>
                    {form.businessName || 'Business Name'}
                  </h4>
                  <p className='text-xs text-[#64748B] mt-1.5'>
                    {form.shortDescription || 'Short description'}
                  </p>
                </div>

                <div className='grid grid-cols-3 mt-4'>
                  <PreviewAction icon={Phone} label={getActionLabel(form.callValue, form.callLabel || 'Call')} />
                  <PreviewAction icon={Globe} label={getActionLabel(form.websiteValue, form.websiteLabel || 'Website')} />
                  <PreviewAction icon={Mail} label={getActionLabel(form.emailValue, form.emailLabel || 'Email')} />
                </div>

                <div className='grid grid-cols-2 border-b border-[#E2E8F0] mt-4'>
                  <button
                    type='button'
                    onClick={() => setActiveTab('info')}
                    className={`py-1.5 text-base hover:cursor-pointer font-semibold ${
                      activeTab === 'info' ? 'text-[#0F172A] border-b-2 border-[#0F172A]' : 'text-[#475467]'
                    }`}
                  >
                    Info
                  </button>
                  <button
                    type='button'
                    onClick={() => setActiveTab('options')}
                    className={`py-1.5 text-base hover:cursor-pointer font-semibold ${
                      activeTab === 'options' ? 'text-[#0F172A] border-b-2 border-[#0F172A]' : 'text-[#475467]'
                    }`}
                  >
                    Options
                  </button>
                </div>

                <div className='py-2 text-sm text-[#334155] border-b border-[#E2E8F0]'>
                  {activeTab === 'info' ? (
                    <div className='space-y-2'>
                      <p className='text-xs text-[#334155] leading-relaxed'>
                        {form.infoSummary?.trim() || 'No info summary added yet.'}
                      </p>
                      <div className='h-px bg-[#E2E8F0]' />
                      <p className='text-xs text-[#334155]'>
                        Support hours: {STATIC_SUPPORT_HOURS}
                      </p>
                      <div className='h-px bg-[#E2E8F0]' />
                      <p className='text-xs text-[#334155] leading-relaxed'>
                        Support email: {form.emailValue?.trim() || '--'}
                      </p>
                    </div>
                  ) : enabledOptions.length > 0 ? (
                    <div className='space-y-2'>
                      {enabledOptions.map((option, index) => (
                        <div key={option}>
                          <p className='text-xs text-[#334155]'>{option}</p>
                          {index < enabledOptions.length - 1 ? <div className='h-px bg-[#E2E8F0] mt-2' /> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    'Add privacy policy and terms links from the left form.'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='mt-4 rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3 shadow-sm'>
          <div className='flex items-center justify-between text-sm font-semibold text-[#334155]'>
            <span>Submission Readiness</span>
            <span>{readiness.percentage}%</span>
          </div>
          <div className='w-full h-2 bg-[#E4E7EC] rounded-full mt-2 overflow-hidden'>
            <div
              className='h-full bg-[#BE244A] rounded-full transition-all'
              style={{ width: `${readiness.percentage}%` }}
            />
          </div>
          <p className='text-sm text-[#475467] mt-2'>
            {readiness.completed}/{readiness.total} required fields complete
          </p>
        </div>
      </div>
    </aside>
  );
}

export default RcsPhonePreview;
