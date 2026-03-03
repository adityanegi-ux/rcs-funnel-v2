/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Mic, Camera, MoreVertical, MessageCircle, ChevronRight,
    Home, User, Settings, ChevronLeft, ShieldCheck, Sparkles, Plus,
    Wifi, Battery, ArrowRight, MapPin
} from 'lucide-react';
import axios from 'axios';
import CreateRCSUser from './components/CreateRCSUser';
import debounce from './utils/lodashDebounce';
import {
    capturePage1Journey,
    capturePage2Journey,
    capturePage3Journey
} from './services/engatiJourneyApi';

// --- LIVE DATA ENGINE ---

const INITIAL_BRAND_DATA = {
    logo: null,
    description: null,
    industry: 'General',
    sitelinks: [],
    offer: 'Get 20% off your first query',
    isLoading: false,
    isLoaded: false
};

const BLOCKED_BRAND_TERMS = [
    'fuck',
    'shit',
    'bitch',
    'asshole',
    'bastard',
    'dick',
    'porn',
    'sex',
    'xxx',
    'nude',
    'nsfw',
    'nigga',
    'cunt',
    'whore',
    'slut'
];

const BLOCKED_BRAND_REGEX = new RegExp(
    `\\b(${BLOCKED_BRAND_TERMS.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'i'
);

const hasBlockedBrandTerm = (value) => BLOCKED_BRAND_REGEX.test(String(value || '').trim());

const useBrandData = (companyName, shouldFetchPreview) => {
    const [data, setData] = useState(INITIAL_BRAND_DATA);
    const normalizedCompanyName = companyName.trim();
    const hasSearchableCompanyName = shouldFetchPreview && normalizedCompanyName.length >= 2;

    const getSitelinks = (industry) => {
        switch (industry) {
            case 'Finance': return ['Login', 'Credit Cards', 'Loans', 'Find ATM', 'Support', 'Rates'];
            case 'Hospitality': return ['Book Room', 'Suites', 'Offers', 'Dining', 'Spa', 'Gallery'];
            case 'Food': return ['Order Online', 'Menu', 'Track Order', 'Locations', 'Deals', 'Nutrition'];
            case 'Retail': return ['Men', 'Women', 'New', 'Sale', 'Stores', 'Track'];
            case 'Healthcare': return ['Appointments', 'Doctors', 'Specialties', 'Locations', 'Portal', 'Services'];
            case 'Tech': return ['Products', 'Solutions', 'Pricing', 'Developers', 'Support', 'Login'];
            default: return ['About Us', 'Services', 'Contact', 'Careers', 'Blog', 'Support'];
        }
    };

    const determineIndustry = (name, text = '') => {
        const lower = (name + ' ' + text).toLowerCase();
        if (lower.match(/bank|finance|capital|credit|invest/)) return 'Finance';
        if (lower.match(/hotel|resort|travel|stay|vacation/)) return 'Hospitality';
        if (lower.match(/food|pizza|burger|cafe|restaurant/)) return 'Food';
        if (lower.match(/shop|store|retail|fashion|wear|shoe/)) return 'Retail';
        if (lower.match(/health|doctor|clinic|care|medical/)) return 'Healthcare';
        if (lower.match(/tech|software|app|data|cloud|cyber/)) return 'Tech';
        return 'General';
    };

    const getOffer = (industry, name) => {
        switch (industry) {
            case 'Finance': return `Special Low Interest Personal Loan for you!`;
            case 'Hospitality': return `Get 25% off your next stay at ${name}`;
            case 'Food': return `Free delivery on your first order`;
            case 'Retail': return `Flash Sale! Extra 20% off today`;
            case 'Healthcare': return `Free consultation for new patients`;
            case 'Tech': return `Start your 14-day free trial`;
            default: return `Get 20% off your first order with ${name}`;
        }
    };

    useEffect(() => {
        if (!hasSearchableCompanyName) {
            return;
        }

        let isCurrentRequest = true;
        const cleanName = normalizedCompanyName;

        const debouncedBrandFetch = debounce(async () => {
            setData(prev => ({ ...prev, isLoading: true, isLoaded: false }));

            try {
                const domainSlug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const domain = `${domainSlug}.com`;

                // 1. Google Favicon API
                const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

                // 2. Wikipedia Summary
                let description = '';
                const preferredWikiQueries = [
                    `${cleanName} (India)`,
                    `${cleanName} India`,
                    cleanName
                ];

                for (const query of preferredWikiQueries) {
                    try {
                        const wikiRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
                        if (wikiRes.data?.extract) {
                            description = wikiRes.data.extract.split('.')[0] + '.';
                            break;
                        }
                    } catch (error) {
                        // Try next query preference.
                    }
                }

                if (!description) {
                    description = `Official verified business account for ${cleanName}. Connect with us for the best experience.`;
                }

                const industry = determineIndustry(cleanName, description);

                if (!isCurrentRequest) {
                    return;
                }

                setData({
                    logo: logoUrl,
                    description: description,
                    industry: industry,
                    sitelinks: getSitelinks(industry),
                    offer: getOffer(industry, cleanName),
                    isLoading: false,
                    isLoaded: true
                });

            } catch (error) {
                console.error("Fetch error", error);
                if (isCurrentRequest) {
                    setData(prev => ({ ...prev, isLoading: false, isLoaded: true }));
                }
            }
        }, 600);

        debouncedBrandFetch();

        return () => {
            isCurrentRequest = false;
            debouncedBrandFetch.cancel();
        };
    }, [hasSearchableCompanyName, normalizedCompanyName]);

    return hasSearchableCompanyName ? data : INITIAL_BRAND_DATA;
};


// --- MAIN APP COMPONENT ---

function AppV2() {
    const [page, setPage] = useState(1);
    const [companyName, setCompanyName] = useState('');
    const [isPreviewActivated, setIsPreviewActivated] = useState(false);
    const [leadDetails, setLeadDetails] = useState({ fullName: '', email: '', phone: '' });

    const brandData = useBrandData(companyName, isPreviewActivated);

    const handlePage1Submit = () => {
        const normalizedBrandName = companyName.trim();
        if (!normalizedBrandName) {
            return;
        }

        if (hasBlockedBrandTerm(normalizedBrandName)) {
            alert('Please enter a valid brand name.');
            return;
        }

        setIsPreviewActivated(true);

        capturePage1Journey({ brandName: normalizedBrandName })
            .then((response) => {
                console.log('[Engati Flow] Page 1 captured:', response);
            })
            .catch((error) => {
                console.error('[Engati Flow] Page 1 capture failed:', error);
            });

        setPage(2);
    };

    const handlePage2Submit = (nextLeadDetails) => {
        const normalizedBrandName = companyName.trim();
        const stepOneTwoPayload = {
            brandName: normalizedBrandName,
            lead: nextLeadDetails
        };

        console.log('[RCS Demo] Section 1 + Section 2 payload:', stepOneTwoPayload);

        capturePage2Journey({
            fullName: nextLeadDetails.fullName,
            email: nextLeadDetails.email,
            phoneNumber: nextLeadDetails.phone
        })
            .then((response) => {
                console.log('[Engati Flow] Page 2 captured:', response);
            })
            .catch((error) => {
                console.error('[Engati Flow] Page 2 capture failed:', error);
            });

        setLeadDetails(nextLeadDetails);
        setPage(3);
    };

    const handlePage3Submit = async (formValues) => {
        console.log('[RCS Demo] Section 3 payload:', formValues);
        const response = await capturePage3Journey({ formValues });
        console.log('[Engati Flow] Page 3 captured:', response);
        return response;
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] antialiased font-sans overflow-x-hidden relative flex flex-col">

            {/* MESH GRADIENT */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ x: [0, 100, 0], y: [0, -50, 0], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-br from-purple-200/40 to-blue-200/40 rounded-full blur-3xl"
                />
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#DDDDDD] transition-all duration-200">
                <div className="max-w-7xl mx-auto px-8 h-16 flex items-center">
                    <div
                        className="flex items-center select-none cursor-pointer pl-1"
                        onClick={() => {
                            setPage(1);
                            setCompanyName('');
                            setIsPreviewActivated(false);
                            setLeadDetails({ fullName: '', email: '', phone: '' });
                        }}
                    >
                        <svg width="150" height="44" viewBox="0 0 870 247" fill="none" className="h-8 w-auto block overflow-visible" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M110.262 153.305C109.688 145.274 108.567 138.676 108.567 132.403C108.811 128.89 109.795 125.468 111.455 122.363C114.897 115.459 118.913 108.867 121.75 102.026C124.074 96.3147 127.2 93.7389 132.045 94.869C133.216 95.1681 134.305 95.7276 135.23 96.506C136.155 97.2843 136.892 98.2614 137.387 99.3643C137.881 100.467 138.121 101.668 138.087 102.876C138.053 104.084 137.747 105.269 137.191 106.343C134.303 113.801 130.287 120.972 127.152 128.375C125.862 131.166 125.075 134.163 124.828 137.228C125.402 146.957 126.523 156.446 127.41 166.165C127.983 174.451 121.96 178.467 114.542 174.451C106.51 170.183 99.1009 165.272 91.0635 161.257C87.7668 159.668 84.0776 159.079 80.4502 159.561C71.2321 161.107 61.7951 160.748 52.7213 158.506C43.6475 156.263 35.1294 152.185 27.6927 146.523C20.256 140.861 14.0583 133.735 9.48217 125.586C4.90602 117.436 2.04845 108.434 1.08575 99.1373C-3.18251 60.155 27.4497 22.931 65.5543 21.8009C73.807 21.5656 82.0119 23.1318 89.5977 26.3904C105.919 33.5472 111.63 52.7544 104.801 71.9644C100.502 83.7613 93.3157 94.2929 83.8981 102.597C79.3086 106.613 73.8585 106.865 71.0302 103.17C67.588 98.5808 69.0222 94.3183 73.0381 90.8675C81.6435 82.8359 88.7945 73.6568 90.8025 61.6093C93.3841 48.1132 86.5342 39.2612 73.0381 38.131C47.2392 35.5494 22.0656 56.4604 17.4847 83.9546C13.4689 110.006 30.9808 137.248 56.1515 142.397C64.0854 143.912 72.2243 144.018 80.1949 142.709C86.2187 141.831 91.0549 141.831 95.9513 145.291C100.217 147.855 104.548 150.173 110.262 153.305Z" fill="#AE1536" />
                            <path d="M157.026 102.591C156.963 102.47 157.216 91.9776 157.216 91.9776C156.933 87.5715 157.125 83.1477 157.789 78.7827C159.224 67.3089 162.058 59.0104 166.395 53.8616C170.144 49.5848 174.609 45.9935 179.59 43.2483C187.696 40.0412 196.36 38.481 205.076 38.6588C212.35 38.662 219.487 40.6356 225.729 44.3698C231.779 47.8127 236.523 53.1569 239.225 59.5727C241.806 65.8489 243.241 75.8942 243.241 89.3903V140.363H230.619V93.1107C230.871 85.4447 230.39 77.7723 229.185 70.1974C228.205 64.5277 225.023 59.4754 220.333 56.142C215.744 53.2535 209.473 52.1262 200.561 52.1262C193.152 52.0871 185.922 54.3968 179.908 58.7236C173.884 63.3132 172.048 70.4499 171.128 76.5597C170.099 85.6631 169.697 94.8265 169.926 103.985V140.394H157.026V102.591Z" fill="#403F42" />
                            <path d="M442.013 36.4272C449.149 36.2431 456.237 37.6391 462.77 40.5153C469.303 43.3915 475.119 47.6768 479.802 53.0643C488.827 62.7727 493.752 75.5919 493.551 88.8454V141.008H480.055V118.347C473.15 131.542 460.282 138.685 441.95 140.38C435.038 140.628 428.154 139.377 421.771 136.711C415.388 134.046 409.658 130.03 404.976 124.939C395.919 115.209 390.817 102.451 390.666 89.1593C390.516 75.8675 395.327 62.9972 404.161 53.0643C408.86 47.6803 414.689 43.3982 421.231 40.5227C427.773 37.6472 434.869 36.2488 442.013 36.4272V36.4272ZM442.013 48.73C436.909 48.7164 431.857 49.7512 427.17 51.7703C422.482 53.7893 418.259 56.7497 414.763 60.4678C411.061 64.1974 408.139 68.6278 406.169 73.4998C404.199 78.3718 403.22 83.5877 403.289 88.8425C403.251 95.8493 405.023 102.747 408.435 108.867C411.664 114.878 416.54 119.843 422.49 123.181C428.32 126.587 434.958 128.365 441.709 128.327C464.37 126.003 476.925 112.886 479.498 88.7794C479.62 83.5427 478.694 78.3345 476.772 73.4615C474.851 68.5884 471.974 64.149 468.311 60.4047C465.013 56.697 460.96 53.7372 456.425 51.7237C451.889 49.7102 446.975 48.6895 442.013 48.73V48.73Z" fill="#403F42" />
                            <path d="M557.77 136.737C552.152 139.106 546.102 140.278 540.006 140.179C530.276 139.605 522.554 134.468 517.092 124.976C513.417 119.067 511.703 112.146 512.196 105.204V2.34126H525.064V50.1756H548.542V61.0987H525.064V103.216C526.498 116.411 530.21 124.119 535.359 127.26C538.238 128.679 541.431 129.344 544.637 129.19C547.843 129.036 550.958 128.07 553.688 126.382C555.447 130.713 556.577 134.416 557.77 136.737Z" fill="#403F42" />
                            <path d="M582.381 0.333374C585.188 0.360289 587.872 1.48711 589.856 3.47169C591.841 5.45626 592.968 8.14018 592.995 10.9467C592.995 13.7615 591.876 16.461 589.886 18.4514C587.896 20.4418 585.196 21.5599 582.381 21.5599C579.566 21.5599 576.867 20.4418 574.877 18.4514C572.886 16.461 571.768 13.7615 571.768 10.9467C571.709 9.54904 571.959 8.15558 572.502 6.86618C573.044 5.57679 573.865 4.42339 574.906 3.48868C575.881 2.49311 577.043 1.70141 578.327 1.15969C579.61 0.617973 580.988 0.337079 582.381 0.333374V0.333374ZM576.105 41.3236H588.726V140.443H576.105V41.3236Z" fill="#403F42" />
                            <path d="M316.785 137.305C306.771 137.336 296.973 134.393 288.634 128.849C280.294 123.305 273.789 115.409 269.942 106.163C266.095 96.9174 265.081 86.7375 267.027 76.9141C268.973 67.0908 273.792 58.0664 280.873 50.9853C287.954 43.9041 296.978 39.0851 306.802 37.139C316.625 35.193 326.805 36.2076 336.051 40.0543C345.297 43.901 353.193 50.4065 358.737 58.746C364.281 67.0856 367.224 76.8836 367.193 86.8978C367.172 100.26 361.855 113.07 352.406 122.519C342.957 131.967 330.148 137.285 316.785 137.305V137.305ZM316.785 48.733C309.311 48.733 302.005 50.9492 295.791 55.1015C289.576 59.2539 284.733 65.1557 281.873 72.0608C279.013 78.9658 278.264 86.5639 279.722 93.8943C281.181 101.225 284.78 107.958 290.064 113.243C295.349 118.528 302.083 122.127 309.413 123.585C316.743 125.043 324.342 124.295 331.247 121.435C338.152 118.574 344.054 113.731 348.206 107.516C352.358 101.302 354.574 93.996 354.574 86.522C354.58 81.5579 353.607 76.6414 351.709 72.0541C349.812 67.4667 347.029 63.2986 343.519 59.7885C340.009 56.2783 335.841 53.495 331.253 51.5979C326.666 49.7009 321.749 48.7273 316.785 48.733V48.733Z" fill="#403F42" />
                        </svg>
                    </div>
                </div>
            </header>

            {/* Main Content - Centered */}
            <main className="flex-1 pt-24 pb-10 relative z-10 w-full">
                <div className="max-w-7xl mx-auto px-8 w-full">
                    {page !== 3 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                            {/* LEFT: Wizard Form */}
                            <div className="z-20">
                                <AnimatePresence mode="wait">
                                    {page === 1 && (
                                        <Page1
                                            key="p1"
                                            companyName={companyName}
                                            setCompanyName={setCompanyName}
                                            onNext={handlePage1Submit}
                                        />
                                    )}
                                    {page === 2 && (
                                        <Page2
                                            key="p2"
                                            onBack={() => setPage(1)}
                                            initialForm={leadDetails}
                                            onSubmit={handlePage2Submit}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* RIGHT: Phone Studio */}
                            <div className="flex justify-center lg:block origin-top lg:scale-[0.78] xl:scale-[0.86]">
                                <PhoneStudio
                                    companyName={companyName}
                                    brandData={brandData}
                                />
                            </div>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <Page3
                                key="p3"
                                companyName={companyName}
                                leadDetails={leadDetails}
                                onBack={() => setPage(2)}
                                onSubmitFinal={handlePage3Submit}
                            />
                        </AnimatePresence>
                    )}
                </div>
            </main>
        </div>
    );
}

const DynamicIsland = ({ active }) => (
    <motion.div
        initial={{ width: 100, height: 28 }}
        animate={{ width: active ? 120 : 100, height: 28 }}
        transition={{ type: "spring", stiffness: 120, damping: 15 }}
        className="absolute top-7 left-1/2 -translate-x-1/2 bg-black rounded-[20px] z-50 flex items-center justify-center overflow-hidden shadow-sm"
    >
        <div className="flex gap-2 opacity-40">
            <div className="w-3 h-3 rounded-full bg-[#1a1a1a]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a]" />
        </div>
    </motion.div>
);


function PhoneStudio({ companyName, brandData }) {
    const normalizedCompanyName = companyName.trim();
    const [rcsReadyBrand, setRcsReadyBrand] = useState('');
    const [cursorState, setCursorState] = useState({ brandKey: '', value: 'hidden' }); // value: 'hidden' | 'waiting' | 'moving'

    const phoneContainerRef = useRef(null);
    const chatButtonRef = useRef(null);
    const [cursorTarget, setCursorTarget] = useState({ x: 0, y: 0 });
    const [isClicking, setIsClicking] = useState(false);
    const isRcsScene =
        Boolean(normalizedCompanyName) &&
        !brandData.isLoading &&
        rcsReadyBrand === normalizedCompanyName;
    const shouldAnimateToRcs =
        Boolean(normalizedCompanyName) &&
        !brandData.isLoading &&
        brandData.isLoaded &&
        !isRcsScene;
    const activeScene = isRcsScene ? 'rcs' : 'google';
    const activeCursorState =
        shouldAnimateToRcs && cursorState.brandKey === normalizedCompanyName
            ? cursorState.value
            : 'hidden';

    useEffect(() => {
        if (!shouldAnimateToRcs) {
            return;
        }

        const targetBrand = normalizedCompanyName;
        let t1;
        let t2;

        t1 = setTimeout(() => {
            setCursorState({ brandKey: targetBrand, value: 'waiting' });
            t2 = setTimeout(() => {
                setCursorState({ brandKey: targetBrand, value: 'moving' });
            }, 100);
        }, 2000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [normalizedCompanyName, shouldAnimateToRcs]);

    useLayoutEffect(() => {
        if (activeCursorState === 'moving' && chatButtonRef.current && phoneContainerRef.current) {
            const btnRect = chatButtonRef.current.getBoundingClientRect();
            const containerRect = phoneContainerRef.current.getBoundingClientRect();

            setCursorTarget({
                x: btnRect.left - containerRect.left + (btnRect.width / 2),
                y: btnRect.top - containerRect.top + (btnRect.height / 2)
            });
        }
    }, [activeCursorState]);


    return (
        <div className="relative mx-auto w-full max-w-[340px] perspective-1000">

            <motion.div
                ref={phoneContainerRef}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative bg-[#1F1F1F] rounded-[56px] p-3 shadow-2xl ring-1 ring-white/10"
            >
                <DynamicIsland active={activeScene === 'rcs'} />
                <div
                    className="relative bg-white rounded-[44px] overflow-hidden flex flex-col w-full h-full backface-hidden"
                    style={{ aspectRatio: '9/19.5' }}
                >
                    <div className="h-12 bg-white flex items-center justify-between px-8 text-xs font-medium z-30 flex-shrink-0 select-none relative">
                        <span className="text-[#000000]">9:41</span>
                        <div className="flex items-center gap-1.5">
                            <Wifi className="w-4 h-4 text-[#000000]" />
                            <Battery className="w-5 h-5 text-[#000000]" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative z-10">
                        <AnimatePresence mode="wait">
                            {activeScene === 'google' && <GoogleSearchScene key="google" companyName={companyName} brandData={brandData} chatButtonRef={chatButtonRef} />}
                            {activeScene === 'rcs' && <RCSChatScene key="rcs" companyName={companyName} brandData={brandData} />}
                        </AnimatePresence>
                        <AnimatePresence>
                            {brandData.isLoading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6 space-y-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-4 border-[#F1F3F4] border-t-[#1A73E8] animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-6 h-6 text-[#1A73E8] animate-pulse" /></div>
                                    </div>
                                    <div><h3 className="text-lg font-semibold text-gray-900">Scanning Brand Assets...</h3><p className="text-sm text-gray-500">Fetching Logo & Context</p></div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Cursor Overlay - Ref Based */}
                        <AnimatePresence>
                            {activeCursorState !== 'hidden' && (
                                <motion.div
                                    initial={{ top: '110%', left: '90%', opacity: 0 }}
                                    animate={activeCursorState === 'moving' ? {
                                        top: cursorTarget.y,
                                        left: cursorTarget.x,
                                        opacity: 1
                                    } : {
                                        top: '80%', // Waiting state
                                        left: '80%',
                                        opacity: 1
                                    }}
                                    transition={{
                                        type: "spring", stiffness: 100, damping: 20
                                    }}
                                    onAnimationComplete={() => {
                                        if (activeCursorState === 'moving') {
                                            setIsClicking(true);
                                            setTimeout(() => {
                                                setIsClicking(false);
                                                setRcsReadyBrand(normalizedCompanyName);
                                                setCursorState({ brandKey: normalizedCompanyName, value: 'hidden' });
                                            }, 200);
                                        }
                                    }}
                                    className="absolute z-[60] pointer-events-none"
                                    style={{ x: "-30%", y: "-10%" }} // Offset for pointer tip
                                >
                                    <motion.div animate={{ scale: isClicking ? 0.8 : 1 }}>
                                        <div className="relative drop-shadow-2xl">
                                            {isClicking && <div className="absolute -inset-4 bg-white/30 rounded-full animate-ping" />}
                                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M6 3L23 18.5L15 19.5L19.5 28L16.5 29.5L11.5 20.5L6 26V3Z" fill="black" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Glass Reflection */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none z-40 mix-blend-overlay rounded-[44px]" />

                </div>
            </motion.div>
        </div>
    );
}


// --- SCENES ---

function GoogleSearchScene({ companyName, brandData, chatButtonRef }) {
    const brandName = companyName || 'Your Brand';
    const brandUrl = brandName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }} className="h-full bg-white flex flex-col overflow-hidden">
            <div className="p-4 flex-shrink-0">
                <div className="bg-[#F8F9FA] rounded-full px-4 py-2.5 flex items-center gap-3 shadow-sm border border-transparent">
                    <Search className="w-4 h-4 text-[#5F6368]" /><span className="text-sm text-[#5F6368] flex-1 truncate font-normal">{brandName.toLowerCase()}</span><Mic className="w-4 h-4 text-[#1A73E8]" /><Camera className="w-4 h-4 text-[#1A73E8]" />
                </div>
            </div>
            <div className="px-4 pb-2 flex gap-6 border-b border-[#DADCE0] overflow-x-hidden text-sm font-medium text-[#5F6368]">
                <span className="text-[#1A73E8] pb-2 border-b-2 border-[#1A73E8]">All</span><span className="pb-2">Images</span><span className="pb-2">News</span><span className="pb-2">Maps</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar pb-6 relative">
                <div className="mb-3 pb-3 border-b border-[#DADCE0]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full bg-[#F1F3F4] border border-[#DADCE0] flex items-center justify-center overflow-hidden flex-shrink-0 p-0.5">
                            {brandData.logo ? <img src={brandData.logo} alt="logo" className="w-full h-full object-contain" /> : <span className="text-[#1A73E8] text-xs font-bold">{brandName[0]?.toUpperCase() || 'C'}</span>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col"><div className="font-normal text-sm text-[#202124] truncate leading-tight">{brandName}</div><div className="text-xs text-[#5F6368] truncate leading-tight">https://www.{brandUrl}</div></div><MoreVertical className="w-5 h-5 text-[#5F6368] flex-shrink-0" />
                    </div>
                    <h2 className="text-xl font-normal text-[#1A73E8] mb-1 cursor-pointer hover:underline leading-snug">{brandName} - Official Site</h2>
                    <div className="text-sm text-[#4D5156] leading-relaxed mb-4 min-h-[40px]">{brandData.description || 'Loading brand description...'}</div>
                    <div className="space-y-0 mb-4 border-t border-[#F1F3F4]">{brandData.sitelinks.map((link, idx) => <ExpandableOption key={idx} text={link} />)}</div>
                    <motion.button ref={chatButtonRef} whileTap={{ scale: 0.95 }} className="w-full bg-white border border-[#DADCE0] rounded-lg py-3 px-4 flex items-center gap-3 hover:bg-[#F8F9FA] transition-colors shadow-sm mb-4 group relative overflow-hidden">
                        <div className="w-9 h-9 rounded-full bg-[#1A73E8] flex items-center justify-center flex-shrink-0 z-10"><MessageCircle className="w-5 h-5 text-white" /></div>
                        <div className="flex-1 text-left z-10"><div className="text-sm font-medium text-[#202124]">Chat with {brandName}</div><div className="text-xs text-[#5F6368]">On Google Messages</div></div><ChevronRight className="w-5 h-5 text-[#5F6368] z-10" />
                    </motion.button>
                    <div className="pt-3 border-t border-[#DADCE0]">
                        <h3 className="text-lg font-normal text-[#202124] mb-2">Locations</h3>
                        <div className="h-24 bg-gray-100 rounded-lg w-full flex items-center justify-center gap-2"><MapPin className="w-4 h-4 text-[#5F6368]" /><span className="text-[#5F6368] text-xs">View on Map</span></div>
                    </div>
                </div>
            </div>
            <div className="h-14 bg-white border-t border-[#DADCE0] flex items-center justify-around px-4 flex-shrink-0 pb-1">
                <NavIcon icon="home" active /><NavIcon icon="search" /><NavIcon icon="profile" /><NavIcon icon="settings" />
            </div>
        </motion.div>
    );
}

function RCSChatScene({ companyName, brandData }) {
    const brandName = companyName || 'Your Brand';
    const brandInitial = brandName[0]?.toUpperCase() || 'Y';

    const [showUserMessage, setShowUserMessage] = useState(false);
    const [showTyping, setShowTyping] = useState(false);
    const [showBotMessage, setShowBotMessage] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setShowUserMessage(true), 400);
        const t2 = setTimeout(() => setShowTyping(true), 1000);
        const t3 = setTimeout(() => {
            setShowTyping(false);
            setShowBotMessage(true);
        }, 2200);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.4 }} className="h-full bg-[#F5F7FA] flex flex-col">
            <div className="bg-white border-b border-[#DADCE0] px-4 py-2.5 flex items-center gap-3 flex-shrink-0 shadow-sm z-10">
                <button className="p-1 -ml-1 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-6 h-6 text-[#5F6368]" /></button>
                <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm p-0.5">
                    {brandData.logo ? <img src={brandData.logo} alt="av" className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">{brandInitial}</div>}
                </div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><h3 className="font-medium text-[#202124] text-sm truncate">{brandName}</h3><ShieldCheck className="w-3.5 h-3.5 text-[#1A73E8]" fill="#1A73E8" color="white" /></div><p className="text-xs text-[#5F6368] truncate">Verified Business Account</p></div>
                <button className="p-2 hover:bg-gray-100 rounded-full"><MoreVertical className="w-5 h-5 text-[#5F6368]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#FFFFFF] pb-20">
                <div className="flex justify-center"><span className="text-[10px] font-medium text-[#5F6368] bg-[#F1F3F4] px-3 py-1 rounded-full">Today</span></div>

                <AnimatePresence>
                    {showUserMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="flex justify-end group"
                        >
                            <div className="bg-[#1A73E8] text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm shadow-sm max-w-[80%]">
                                <p className="leading-relaxed">Hi, I'm interested in learning more about {brandName}.</p>
                                <span className="text-[10px] text-white/70 mt-1 block">Sent • 9:42 AM</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex gap-2.5 items-start"
                        >
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm p-0.5">
                                {brandData.logo ? <img src={brandData.logo} alt="av" className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">{brandInitial}</div>}
                            </div>
                            <div className="bg-[#F1F3F4] px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
                                <div className="w-1.5 h-1.5 bg-[#5F6368] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-[#5F6368] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-[#5F6368] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showBotMessage && (
                        <>
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className="flex gap-2.5 items-end group"
                            >
                                <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm p-0.5">
                                    {brandData.logo ? <img src={brandData.logo} alt="av" className="w-full h-full object-contain" /> : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">{brandInitial}</div>}
                                </div>
                                <div className="bg-[#F1F3F4] rounded-2xl rounded-bl-sm p-3 max-w-[78%]">
                                    <p className="text-sm text-[#202124] leading-relaxed">Hi there! 👋 Welcome to {brandName}. How can we help you today?</p>
                                    <span className="text-[10px] text-[#5F6368] mt-1 block opacity-70">Read • 9:42 AM</span>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex gap-2.5"
                            >
                                <div className="w-8 h-8 flex-shrink-0" />
                                <div className="bg-white border border-[#DADCE0] rounded-2xl shadow-sm overflow-hidden max-w-[85%]">
                                    <div className="aspect-video bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
                                        <Sparkles className="w-10 h-10 text-purple-400" />
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-[#202124] text-sm mb-1">Special {brandData.industry} Offer 🎉</h4>
                                            <p className="text-xs text-[#5F6368] leading-relaxed">{brandData.offer}</p>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button className="flex-1 bg-[#F1F3F4] text-[#1A73E8] rounded-full py-2 px-3 text-xs font-medium hover:bg-[#E8F0FE] transition-colors">Claim</button>
                                            <button className="flex-1 border border-[#DADCE0] text-[#1A73E8] rounded-full py-2 px-3 text-xs font-medium hover:bg-[#F8F9FA] transition-colors">Details</button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
            <div className="bg-white border-t border-[#DADCE0] p-3 flex items-center gap-2 flex-shrink-0 pb-6">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors bg-[#F1F3F4]"><Plus className="w-5 h-5 text-[#444746]" /></button><div className="flex-1 bg-[#F1F3F4] rounded-full px-4 py-2.5 text-sm text-[#5F6368] cursor-text">Type a message...</div><button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Mic className="w-5 h-5 text-[#444746]" /></button>
            </div>
        </motion.div>
    );
}

// --- WIZARD PAGES ---

function Page1({ companyName, setCompanyName, onNext }) {
    const hasProfanity = hasBlockedBrandTerm(companyName);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="space-y-8 max-w-lg">
            <div className="h-6"></div>
            <div className="space-y-6">
                <h1 className="text-5xl font-bold text-[#000000] leading-[1.15] tracking-tight">
                    Turn Google Brand Searches into Qualified Leads
                    <span className="inline-block align-middle ml-3 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold tracking-wide border border-blue-200">Limited Access</span>
                </h1>
                <p className="text-lg text-[#666666] leading-relaxed">Turn brand search clicks into leads on chat - no extra ad or setup spend</p>
            </div>
            <div className="space-y-4 pt-2">
                <label className="block">
                    <span className="text-sm font-semibold text-[#000000] mb-2 block">Brand Name</span>
                    <input
                        type="text"
                        placeholder="Enter your brand name"
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#BD2949]/20 focus:border-[#BD2949] transition-all shadow-sm text-base text-[#000000] placeholder:text-[#999999] focus:outline-none"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && companyName.trim() && !hasProfanity && onNext()}
                        autoFocus
                    />
                </label>
                {hasProfanity ? (
                    <p className="text-xs text-[#BD2949]">Please enter a clean business/brand name.</p>
                ) : null}
                <div>
                    <button onClick={onNext} disabled={!companyName.trim() || hasProfanity} className="w-full py-4 bg-[#BD2949] text-white rounded-lg font-semibold text-base hover:bg-[#A02340] disabled:bg-[#F1F3F4] disabled:text-[#999999] disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:hover:translate-y-0 disabled:shadow-none">
                        Enable it for free <ArrowRight className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-gray-400 text-center mt-3">Instant preview. No signup.</p>
                </div>
            </div>
            <p className="text-xs text-[#666666]">By continuing, you agree to Engati’s Terms of Use. <a href="https://www.engati.ai/termsofuse" className="text-[#BD2949] hover:underline ml-1 font-medium" target="_blank" rel="noreferrer">View terms</a></p>
        </motion.div>
    );
}

function Page2({ onBack, onSubmit, initialForm }) {
    const [form, setForm] = useState(initialForm);

    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isValidIndianMobileInput = (value) => {
        const digits = String(value || '').replace(/\D/g, '');
        return digits.length === 10;
    };

    const handleContinue = () => {
        const normalizedForm = {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.replace(/\D/g, '')
        };

        // 1. Basic Validation
        if (!normalizedForm.fullName || !normalizedForm.email || !normalizedForm.phone) {
            alert("Please fill in your contact details first.");
            return;
        }

        if (!isValidEmail(normalizedForm.email)) {
            alert('Please enter a valid work email address.');
            return;
        }

        if (!isValidIndianMobileInput(normalizedForm.phone)) {
            alert('Please enter a valid 10-digit mobile number.');
            return;
        }

        if (onSubmit) {
            onSubmit(normalizedForm);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }} className="space-y-6 max-w-lg">
            <button onClick={onBack} className="flex items-center gap-2 text-[#666666] hover:text-[#000000] transition-colors group">
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> <span className="text-sm font-medium">Back</span>
            </button>
            <div className="space-y-2">
                <h2 className="text-4xl font-bold text-[#000000] leading-tight tracking-tight">Enable Search-to-Chat for your brand (30 days free)</h2>
                <p className="text-base text-[#666666] leading-relaxed">Share your details to unlock the setup flow and claim your 30-day free enablement. We’ll use this only for setup updates and access - no spam.</p>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-[#000000] mb-1.5 block">Full Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#BD2949]/20 focus:border-[#BD2949] transition-all shadow-sm focus:outline-none font-medium text-[#000000]"
                            value={form.fullName}
                            onChange={e => setForm({ ...form, fullName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[#000000] mb-1.5 block">Work Email</label>
                        <input
                            type="email"
                            placeholder="Enter your work email ID"
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#BD2949]/20 focus:border-[#BD2949] transition-all shadow-sm focus:outline-none font-medium text-[#000000]"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-[#000000] mb-1.5 block">Phone Number</label>
                    <div className="flex items-stretch rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#BD2949]/20 focus-within:border-[#BD2949]">
                        <span className="px-4 flex items-center text-[#344054] font-semibold bg-[#F9FAFB] border-r border-gray-200">+91</span>
                        <input
                            type="tel"
                            placeholder="Enter 10-digit mobile number"
                            className="w-full p-4 bg-white transition-all focus:outline-none font-medium text-[#000000]"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        />
                    </div>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={handleContinue}
                        className="w-full py-4 bg-[#BD2949] hover:bg-[#a3223e] text-white rounded-xl font-semibold shadow-lg shadow-red-900/10 transition-all mt-6 flex items-center justify-center gap-2"
                    >
                        <ArrowRight className="w-5 h-5" />
                        Claim free setup
                    </button>
                    <p className="text-xs text-gray-400 text-center mt-3">Takes 2 minutes. Your details are used only for enablement and updates.</p>
                </div>
            </div>
        </motion.div >
    );
}
function Page3({ companyName, leadDetails, onBack, onSubmitFinal }) {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }} className="space-y-5 w-full">
            <button onClick={onBack} className="flex items-center gap-2 text-[#666666] hover:text-[#000000] transition-colors group">
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> <span className="text-sm font-medium">Back</span>
            </button>
            <CreateRCSUser
                prefill={{
                    fullName: leadDetails.fullName,
                    brandName: companyName,
                    email: leadDetails.email,
                    phone: leadDetails.phone
                }}
                onSubmitFinal={onSubmitFinal}
            />
        </motion.div>
    );
}

function ExpandableOption({ text }) {
    return (
        <div className="py-2.5 border-b border-[#F1F3F4] flex items-center justify-between hover:bg-[#F8F9FA] -mx-4 px-4 cursor-pointer transition-colors group">
            <span className="text-sm text-[#202124] group-hover:text-[#1A73E8]">{text}</span><ChevronRight className="w-4 h-4 text-[#70757A] flex-shrink-0" />
        </div>
    );
}

function NavIcon({ icon, active }) {
    const icons = { home: Home, search: Search, profile: User, settings: Settings };
    const Icon = icons[icon];
    return <div className="flex flex-col items-center gap-1 cursor-pointer"><div className={`p-0.5 rounded-full`}><Icon className="w-6 h-6" style={{ color: active ? '#1A73E8' : '#5F6368' }} /></div></div>;
}

export default AppV2;
