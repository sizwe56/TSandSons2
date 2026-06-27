import React, { useState, useEffect } from 'react';
import { User, JobCategory, CalloutRequest } from './types';
import { PLUMBING_CATEGORIES, SOUTH_AFRICAN_PROVINCES } from './data';
import Header from './components/Header';
import JobCategories from './components/JobCategories';
import AuthModal from './components/AuthModal';
import DispatchModal from './components/DispatchModal';
import ActiveCallouts from './components/ActiveCallouts';
import InvoiceDetail from './components/InvoiceDetail';
import PlumberChat from './components/PlumberChat';
import PaymentModal from './components/PaymentModal';
import Logo from './components/Logo';
import { saveUserProfile, saveCalloutRequest, getCalloutRequests, updateCalloutRequestFields } from './lib/firebase';
import { 
  PhoneCall, 
  MapPin, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Check, 
  HelpCircle, 
  Info, 
  FileText, 
  LogOut,
  ChevronRight,
  User as UserIcon,
  Home,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Seeding helper to create realistic SA plumbing past requests
function getSeededPastJobs(user: User): CalloutRequest[] {
  return [
    {
      id: `seeded-1-${user.id}`,
      userId: user.id,
      jobCategoryId: 'bathroom-kitchen',
      issueDescription: 'Kitchen mixer tap dripping continuously from the handle, wasting hot water.',
      status: 'Completed' as const,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      baseFee: 1000,
      surcharge: user.isPretoriaGauteng ? 0 : 3000,
      totalAmount: user.isPretoriaGauteng ? 1000 : 4000,
      invoiceNumber: `INV-${user.id.slice(0, 3).toUpperCase()}-2026-904`,
      clientName: user.fullName,
      clientPhone: user.phone,
      clientAddress: user.streetAddress,
      clientCity: user.city,
      clientProvince: user.province,
      additionalAmount: 450,
      additionalAmountDetails: 'Replacement of solid brass cartridges & high-temp seal washers',
      paymentMethod: 'Visa Debit Card',
      isPaid: true
    },
    {
      id: `seeded-2-${user.id}`,
      userId: user.id,
      jobCategoryId: 'blocked-toilets',
      issueDescription: 'Main master toilet blocked and backing up near to overflow.',
      status: 'Completed' as const,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      baseFee: 1000,
      surcharge: user.isPretoriaGauteng ? 0 : 3000,
      totalAmount: user.isPretoriaGauteng ? 1000 : 4000,
      invoiceNumber: `INV-${user.id.slice(0, 3).toUpperCase()}-2026-815`,
      clientName: user.fullName,
      clientPhone: user.phone,
      clientAddress: user.streetAddress,
      clientCity: user.city,
      clientProvince: user.province,
      additionalAmount: 850,
      additionalAmountDetails: 'High-pressure mechanical drainage rod clearance of grease plug',
      paymentMethod: 'Instant EFT (FNB)',
      isPaid: true
    }
  ];
}

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Dispatch States
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null);
  
  // Callouts Database
  const [callouts, setCallouts] = useState<CalloutRequest[]>([]);
  
  // Invoice Viewer State
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<CalloutRequest | null>(null);

  // Address Editor State
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editStreet, setEditStreet] = useState('');
  const [editSuburb, setEditSuburb] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editProvince, setEditProvince] = useState('');

  // Interactive Hub States
  const [profileActiveTab, setProfileActiveTab] = useState<'details' | 'history'>('details');
  const [activeChatCalloutId, setActiveChatCalloutId] = useState<string | null>(null);
  const [payingRequest, setPayingRequest] = useState<CalloutRequest | null>(null);

  // Initial Data Synchronization
  useEffect(() => {
    // Check for saved user session
    const savedUser = localStorage.getItem('plumb_current_user');
    if (savedUser) {
      const loadedUser = JSON.parse(savedUser);
      setCurrentUser(loadedUser);
      // Initialize edit fields
      setEditStreet(loadedUser.streetAddress);
      setEditSuburb(loadedUser.suburb);
      setEditCity(loadedUser.city);
      setEditProvince(loadedUser.province);
    }
  }, []);

  // Load real user callout requests from Firestore when current user changes
  useEffect(() => {
    if (!currentUser) {
      setCallouts([]);
      return;
    }

    const fetchUserCallouts = async () => {
      try {
        let loadedCallouts = await getCalloutRequests(currentUser.id);
        
        // If there are no callout requests in Firestore yet, seed the initial past jobs
        if (loadedCallouts.length === 0) {
          const seeded = getSeededPastJobs(currentUser);
          // Save each seeded job to Firestore
          for (const job of seeded) {
            await saveCalloutRequest(job);
          }
          loadedCallouts = seeded;
        }
        
        setCallouts(loadedCallouts);
        localStorage.setItem('plumb_callouts', JSON.stringify(loadedCallouts));
      } catch (error) {
        console.error('Error fetching callout requests from Firestore:', error);
        // Fallback to local storage
        const savedCallouts = localStorage.getItem('plumb_callouts');
        if (savedCallouts) {
          const parsed = JSON.parse(savedCallouts);
          setCallouts(parsed.filter((c: CalloutRequest) => c.userId === currentUser.id));
        }
      }
    };

    fetchUserCallouts();
  }, [currentUser]);

  // Save changes helper
  const updateCalloutsInStorage = (updatedList: CalloutRequest[]) => {
    setCallouts(updatedList);
    localStorage.setItem('plumb_callouts', JSON.stringify(updatedList));
  };

  // Auth triggers
  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('plumb_current_user', JSON.stringify(user));
    // Initialize edit fields
    setEditStreet(user.streetAddress);
    setEditSuburb(user.suburb);
    setEditCity(user.city);
    setEditProvince(user.province);
    setIsEditingAddress(false);

    try {
      await saveUserProfile(user);
    } catch (error) {
      console.error('Error saving user profile on login success:', error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('plumb_current_user');
    setIsEditingAddress(false);
  };

  // Primary 24/7 Callout Handler
  const handleHugeCalloutClick = () => {
    if (!currentUser) {
      setAuthModalMode('register');
      setAuthModalOpen(true);
    } else {
      setSelectedCategory(null); // defaults to generic "Plumber"
      setDispatchModalOpen(true);
    }
  };

  // Select specific category card
  const handleSelectCategory = (category: JobCategory) => {
    if (!currentUser) {
      setAuthModalMode('register');
      setAuthModalOpen(true);
    } else {
      setSelectedCategory(category);
      setDispatchModalOpen(true);
    }
  };

  // Confirm Dispatch
  const handleDispatchConfirmed = async (newRequest: CalloutRequest) => {
    const updatedList = [newRequest, ...callouts];
    updateCalloutsInStorage(updatedList);
    
    // Auto-view the newly created invoice to satisfy user visual expectation
    setViewingRequest(newRequest);
    setInvoiceModalOpen(true);

    try {
      await saveCalloutRequest(newRequest);
    } catch (error) {
      console.error('Error saving new dispatch to Firestore:', error);
    }
  };

  // Simulate progress steps
  const handleSimulateProgress = async (id: string) => {
    let nextStatus: CalloutRequest['status'] | null = null;
    const updatedList = callouts.map((c) => {
      if (c.id === id) {
        if (c.status === 'Pending Dispatch') nextStatus = 'En Route';
        else if (c.status === 'En Route') nextStatus = 'In Progress';
        else if (c.status === 'In Progress') nextStatus = 'Completed';
        
        return { ...c, status: nextStatus || c.status };
      }
      return c;
    });
    updateCalloutsInStorage(updatedList);
    
    // Sync active invoice if viewing it
    if (viewingRequest && viewingRequest.id === id) {
      const current = updatedList.find(x => x.id === id);
      if (current) setViewingRequest(current);
    }

    if (nextStatus) {
      try {
        await updateCalloutRequestFields(id, { status: nextStatus });
      } catch (error) {
        console.error('Error updating progress in Firestore:', error);
      }
    }
  };

  // Cancel Pending Callout
  const handleCancelCallout = async (id: string) => {
    const updatedList = callouts.map((c) => {
      if (c.id === id && c.status === 'Pending Dispatch') {
        return { ...c, status: 'Cancelled' as const };
      }
      return c;
    });
    updateCalloutsInStorage(updatedList);

    try {
      await updateCalloutRequestFields(id, { status: 'Cancelled' });
    } catch (error) {
      console.error('Error cancelling callout in Firestore:', error);
    }
  };

  // Settle invoice via Plumb-TS SecurePay Gateway
  const handlePayInvoice = (id: string) => {
    const target = callouts.find(c => c.id === id);
    if (target) {
      setPayingRequest(target);
      setInvoiceModalOpen(false); // Hide invoice viewer temporarily to render checkout
    }
  };

  const handlePaymentSuccess = async (method: string, totalAmount: number, additionalCosts: number) => {
    if (!payingRequest) return;

    let updatedFields: Partial<CalloutRequest> = {};
    const updatedList = callouts.map((c) => {
      if (c.id === payingRequest.id) {
        updatedFields = {
          isPaid: true,
          paymentMethod: method,
          additionalAmount: additionalCosts,
          additionalAmountDetails: additionalCosts > 0 ? 'On-site emergency technical repairs and materials replacement' : undefined,
          status: c.status === 'Cancelled' ? 'Cancelled' : 'Completed' as const
        };
        return {
          ...c,
          ...updatedFields
        };
      }
      return c;
    });

    updateCalloutsInStorage(updatedList);
    setPayingRequest(null);

    // Sync active invoice if viewing it
    const updatedViewer = updatedList.find(x => x.id === payingRequest.id);
    if (updatedViewer) {
      setViewingRequest(updatedViewer);
      setInvoiceModalOpen(true); // Open invoice back up to show PAID badge
    }

    try {
      await updateCalloutRequestFields(payingRequest.id, updatedFields);
    } catch (error) {
      console.error('Error updating payment in Firestore:', error);
    }
  };

  // Save address/province alterations
  const handleSaveAddressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const isPretoria = editCity.trim().toLowerCase() === 'pretoria';
    const isGauteng = editProvince === 'Gauteng';
    const isPretoriaGauteng = isPretoria && isGauteng;

    const updatedUser: User = {
      ...currentUser,
      streetAddress: editStreet,
      suburb: editSuburb,
      city: editCity.trim(),
      province: editProvince,
      isPretoriaGauteng,
    };

    setCurrentUser(updatedUser);
    localStorage.setItem('plumb_current_user', JSON.stringify(updatedUser));
    setIsEditingAddress(false);

    try {
      await saveUserProfile(updatedUser);
    } catch (error) {
      console.error('Error saving updated address to Firestore:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 1. Brand Header */}
      <Header
        currentUser={currentUser}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenProfile={() => setIsEditingAddress(true)}
      />

      {/* 2. Main Content Wrapper */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Dynamic Warning Alert for Out-of-Area logged-in users */}
        {currentUser && !currentUser.isPretoriaGauteng && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs sm:text-sm flex items-start space-x-3 shadow-sm animate-fade-in">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-800">
                Out-of-Area Surcharge Activated ({currentUser.city}, {currentUser.province})
              </span>
              <p className="leading-relaxed">
                Emergency plumbing dispatches to locations outside our core <strong className="text-slate-900">Pretoria, Gauteng</strong> hub are subject to a mandatory R3,000 travel surcharge. Active callouts will compile a total tax invoice of <strong className="text-red-700">R4,000.00 (R1,000 standard + R3,000 surcharge)</strong>.
              </p>
              <button
                onClick={() => setIsEditingAddress(true)}
                className="text-xs font-bold text-slate-800 underline hover:text-slate-950 block mt-1"
              >
                Change Address or Test Pretoria Rates
              </button>
            </div>
          </div>
        )}

        {/* Hero Section containing Huge 24/7 Red Button */}
        <section className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-8 sm:p-10 lg:p-12 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10" />

          {/* Left info column */}
          <div className="space-y-4 max-w-xl text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="flex items-center space-x-4 mb-2 self-center lg:self-start">
              <Logo size="md" className="text-slate-900 shrink-0 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner" />
              <div className="text-left">
                <span className="bg-red-100 text-red-800 font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full inline-block mb-1.5">
                  ⚡ LIVE DISPATCH HUB
                </span>
                <h3 className="font-display font-black text-xl tracking-tight text-slate-900 uppercase leading-none">
                  Plumb Ts &amp; Sons
                </h3>
              </div>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight text-slate-800 underline decoration-red-200 underline-offset-8">
              Emergency Dispatch
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed pt-2">
              Our 24/7 rapid-response plumbing crews are on standby. Within Pretoria, Gauteng, pay a flat-rate R1,000 call-out. Other South African provinces are served with a R3,000 long-distance dispatch surcharge. Average response: 24hrs.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold pt-4 text-slate-700">
              <span className="flex items-center space-x-1.5">
                <Check className="h-4 w-4 text-red-500" />
                <span>Pretoria Local: R1,000</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Check className="h-4 w-4 text-red-500" />
                <span>Other Provinces: R1,000 + R3,000</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Check className="h-4 w-4 text-red-500" />
                <span>Immediate SA VAT Invoice</span>
              </span>
            </div>
          </div>

          {/* Right Button Column */}
          <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 w-full sm:w-auto min-w-[320px]">
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              TAP BUTTON FOR IMMEDIATE RESPONSE
            </span>

            {/* THE HUGE RED CALL OUT BUTTON */}
            <div className="relative">
              <div className="absolute -inset-4 bg-red-100 rounded-full animate-ping opacity-25"></div>
              <button
                id="huge-red-call-out"
                onClick={handleHugeCalloutClick}
                className="relative w-44 h-44 sm:w-48 sm:h-48 bg-red-600 hover:bg-red-700 text-white rounded-full flex flex-col items-center justify-center border-8 border-red-100 shadow-2xl transition-transform active:scale-95"
              >
                <PhoneCall className="h-8 w-8 animate-bounce mb-1" />
                <span className="font-display font-black text-xl sm:text-2xl leading-none tracking-tight uppercase">
                  24/7
                </span>
                <span className="font-display font-black text-sm sm:text-base leading-none tracking-tight uppercase mt-0.5">
                  CALL OUT
                </span>
                <span className="text-[9px] font-mono tracking-widest text-red-200 uppercase mt-1">
                  DISPATCH NOW
                </span>
              </button>
            </div>

            {/* Logged in target display */}
            {currentUser ? (
              <p className="text-center text-xs text-slate-600 pt-2">
                Targeting: <strong className="text-slate-800">{currentUser.fullName}</strong><br />
                <span className="text-slate-500">{currentUser.streetAddress}, {currentUser.city}</span>
              </p>
            ) : (
              <button
                onClick={() => {
                  setAuthModalMode('register');
                  setAuthModalOpen(true);
                }}
                className="text-xs text-slate-500 font-bold hover:text-red-600 underline pt-2"
              >
                Register address to prepare dispatch
              </button>
            )}
          </div>
        </section>

        {/* 3. Interactive Profile & Dispatch History Hub */}
        {currentUser && (
          <section className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 sm:p-8">
            {/* Tab navigation headers */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                onClick={() => setProfileActiveTab('details')}
                className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-display font-bold text-sm transition-colors ${
                  profileActiveTab === 'details'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Property & Profile</span>
              </button>
              <button
                id="profile-history-tab"
                onClick={() => setProfileActiveTab('history')}
                className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-display font-bold text-sm transition-colors ${
                  profileActiveTab === 'history'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Job Request History</span>
                <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-100">
                  {callouts.filter(c => c.userId === currentUser.id).length}
                </span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {profileActiveTab === 'details' ? (
                <motion.div
                  key="tab-details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900">
                        Registered Property & Contact Details
                      </h3>
                      <p className="text-xs text-slate-400">
                        Modify details here to test how the R3,000 travel surcharge compiles R4,000 invoices dynamically.
                      </p>
                    </div>
                    <button
                      id="edit-profile-btn"
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                      className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition"
                    >
                      {isEditingAddress ? 'Cancel' : 'Edit Address Details'}
                    </button>
                  </div>

                  {isEditingAddress ? (
                    /* Edit address form */
                    <form onSubmit={handleSaveAddressUpdate} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Street Address
                          </label>
                          <input
                            id="edit-street-input"
                            type="text"
                            value={editStreet}
                            onChange={(e) => setEditStreet(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-red-500 focus:bg-white transition"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Suburb
                          </label>
                          <input
                            id="edit-suburb-input"
                            type="text"
                            value={editSuburb}
                            onChange={(e) => setEditSuburb(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-red-500 focus:bg-white transition"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            City / Town
                          </label>
                          <input
                            id="edit-city-input"
                            type="text"
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            placeholder="Type 'Pretoria' for local rates"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-red-500 focus:bg-white transition"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Province
                          </label>
                          <select
                            id="edit-province-select"
                            value={editProvince}
                            onChange={(e) => setEditProvince(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-red-500 focus:bg-white transition"
                          >
                            {SOUTH_AFRICAN_PROVINCES.map((prov) => (
                              <option key={prov} value={prov}>
                                {prov}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          id="save-address-btn"
                          type="submit"
                          className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition"
                        >
                          Save Address & Verify Rates
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Static details display */
                    <div className={`grid grid-cols-1 ${currentUser.role === 'plumber' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-6 text-xs sm:text-sm`}>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {currentUser.role === 'plumber' ? 'Plumber Name & Contact' : 'Resident Name & Contact'}
                        </span>
                        <strong className="text-slate-800 font-display block">{currentUser.fullName}</strong>
                        <span className="text-slate-500 mt-0.5 block">{currentUser.phone}</span>
                        <span className="text-slate-400 text-xs block">{currentUser.email}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Registered Address
                        </span>
                        <p className="text-slate-700 leading-relaxed">
                          {currentUser.streetAddress}, {currentUser.suburb}<br />
                          <strong className="text-slate-900">{currentUser.city}</strong>, {currentUser.province}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/40 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Active Rate Tier
                          </span>
                          {currentUser.isPretoriaGauteng ? (
                            <span className="text-emerald-700 font-bold flex items-center text-xs">
                              <CheckCircle className="h-4 w-4 mr-1 shrink-0" />
                              <span>Pretoria Local Rate (R1,000 call-out)</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold flex items-center text-xs">
                              <ShieldAlert className="h-4 w-4 mr-1 shrink-0 animate-pulse" />
                              <span>National Travel Rate (R4,000 call-out)</span>
                            </span>
                          )}
                        </div>
                        
                        <span className="text-[10px] text-slate-400 mt-1">
                          {currentUser.isPretoriaGauteng 
                            ? 'No long-distance travel fees applied.' 
                            : 'Surcharge of R3,000 added dynamically.'}
                        </span>
                      </div>

                      {currentUser.role === 'plumber' && (
                        <div className="bg-red-50/30 p-3 rounded-xl border border-red-200/40 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block mb-0.5">
                              Plumber Subscription
                            </span>
                            <span className="text-slate-800 font-bold block capitalize">
                              {currentUser.subscriptionPlan} Plan (R{currentUser.subscriptionPlan === 'yearly' ? '400.00 / yr' : '50.00 / mo'})
                            </span>
                            <span className="text-emerald-700 font-semibold text-[11px] flex items-center mt-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
                              <span>Status: Active</span>
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Next renews: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="tab-history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-display font-bold text-base text-slate-900">
                      Past Emergency Job Requests
                    </h3>
                    <p className="text-xs text-slate-400">
                      A complete history of all dispatches linked securely to your account, including South African Tax Invoices and online payment receipts.
                    </p>
                  </div>

                  {callouts.filter(c => c.userId === currentUser.id).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 space-y-2">
                      <FileText className="h-8 w-8 mx-auto text-slate-300" />
                      <p className="text-xs font-bold">No dispatch requests found linked to this account.</p>
                      <p className="text-[10px] text-slate-400">Trigger a live emergency call-out above to start tracking real-time repairs.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
                      {callouts
                        .filter(c => c.userId === currentUser.id)
                        .map((req) => {
                          const category = PLUMBING_CATEGORIES.find(x => x.id === req.jobCategoryId) || PLUMBING_CATEGORIES[0];
                          const additionalCost = req.additionalAmount || 0;
                          const totalPaid = req.totalAmount + additionalCost;
                          const reqPaid = req.isPaid || req.status === 'Completed';

                          return (
                            <div 
                              key={req.id} 
                              className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition-all duration-150"
                            >
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="bg-slate-100 text-slate-700 text-[9px] font-mono font-bold px-2 py-0.5 rounded tracking-wide border border-slate-200">
                                    Ref: {req.invoiceNumber}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {new Date(req.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <h4 className="font-display font-black text-sm text-slate-800">
                                  Emergency {category.title} Crew
                                </h4>
                                <p className="text-xs text-slate-500 truncate italic pr-4">
                                  &ldquo;{req.issueDescription}&rdquo;
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end shrink-0">
                                <div className="text-left md:text-right shrink-0">
                                  <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Billing Total</span>
                                  <span className="text-xs font-black text-slate-800">
                                    R{totalPaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                <div className="shrink-0">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border block ${
                                    req.status === 'Completed' || req.isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                    req.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                    'bg-amber-100 text-amber-800 border-amber-200 animate-pulse'
                                  }`}>
                                    {req.isPaid || req.status === 'Completed' ? 'PAID' : req.status === 'Cancelled' ? 'CANCELLED' : 'UNPAID'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0">
                                  {/* INVOICE BUTTON */}
                                  <button
                                    onClick={() => {
                                      setViewingRequest(req);
                                      setInvoiceModalOpen(true);
                                    }}
                                    className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-full text-[10px] flex items-center space-x-1 transition shadow-sm"
                                    title="View South African tax invoice details"
                                  >
                                    <FileText className="h-3 h-3 text-slate-500" />
                                    <span>Tax Invoice</span>
                                  </button>

                                  {/* PAY OUTSTANDING BUTTON */}
                                  {!reqPaid && req.status !== 'Cancelled' && (
                                    <button
                                      onClick={() => {
                                        setPayingRequest(req);
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-full text-[10px] flex items-center space-x-1 transition shadow-sm hover:scale-105"
                                      title="Secure online gateway payment"
                                    >
                                      <CreditCard className="h-3 w-3" />
                                      <span>Pay Fee</span>
                                    </button>
                                  )}

                                  {/* CHAT BUTTON IF ACTIVE */}
                                  {req.status !== 'Completed' && req.status !== 'Cancelled' && (
                                    <button
                                      onClick={() => setActiveChatCalloutId(req.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-full text-[10px] flex items-center space-x-1 transition shadow-sm animate-pulse"
                                      title="Live chat with assigned emergency plumber"
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                      <span>Chat</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* 4. Active Emergency Board */}
        {callouts.length > 0 && (
          <ActiveCallouts
            callouts={callouts}
            onViewInvoice={(req) => {
              setViewingRequest(req);
              setInvoiceModalOpen(true);
            }}
            onSimulateProgress={handleSimulateProgress}
            onCancelCallout={handleCancelCallout}
            onOpenChat={(id) => setActiveChatCalloutId(id)}
          />
        )}

        {/* 5. Services Catalog Grid */}
        <JobCategories
          onSelectCategory={handleSelectCategory}
          currentUser={currentUser}
        />
      </main>

      {/* 6. Professional Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center space-x-3 text-left">
              <Logo size="sm" className="text-white bg-slate-800/60 p-1 rounded-xl shrink-0 border border-slate-700/50" />
              <div>
                <div className="flex items-center space-x-2 text-white">
                  <span className="bg-red-600 text-white font-mono font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                    • 24H EMERGENCY •
                  </span>
                  <span className="font-display font-black text-lg tracking-tight">
                    PLUMB TS &amp; SONS
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  24/7/365 Pretoria Gauteng & National Out-of-Area Plumbing Response.
                </p>
              </div>
            </div>
            <div className="flex space-x-4 text-slate-400">
              <span className="hover:text-white transition cursor-pointer">Terms & Conditions</span>
              <span>•</span>
              <span className="hover:text-white transition cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-white transition cursor-pointer">South African Plumbing Guild</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between text-[11px] text-slate-500">
            <p>
              &copy; {new Date().getFullYear()} RapidPlumb (Pty) Ltd. All rights reserved. Registered VAT compliance entity.
            </p>
            <p className="mt-1 sm:mt-0 font-mono">
              Emergency Hotlines: 0800-RAPIDPLUMB (727-437)
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal layer */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Dispatch Modal layer */}
      <DispatchModal
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        currentUser={currentUser}
        selectedCategory={selectedCategory}
        onDispatchConfirmed={handleDispatchConfirmed}
      />

      {/* Invoice Modal viewer */}
      <InvoiceDetail
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        request={viewingRequest}
        onPayInvoice={handlePayInvoice}
      />

      {/* Plumber Chat Modal */}
      <AnimatePresence>
        {activeChatCalloutId && (
          <PlumberChat
            calloutId={activeChatCalloutId}
            onClose={() => setActiveChatCalloutId(null)}
          />
        )}
      </AnimatePresence>

      {/* Payment Gateway Modal */}
      <AnimatePresence>
        {payingRequest && (
          <PaymentModal
            request={payingRequest}
            onClose={() => setPayingRequest(null)}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
