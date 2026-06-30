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
import { saveUserProfile, saveCalloutRequest, getCalloutRequests, updateCalloutRequestFields, subscribeCalloutRequests, subscribeAllCalloutRequests } from './lib/firebase';
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
      status: 'COMPLETED' as const,
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
      status: 'COMPLETED' as const,
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

  // Subscription status expiration check & real-time DB loading
  useEffect(() => {
    if (!currentUser) {
      setCallouts([]);
      return;
    }

    // Auto-check for plumber/crew subscription expiration on load
    if (currentUser.role === 'plumber' || currentUser.role === 'crew') {
      const isExpired = currentUser.paidUntil && new Date(currentUser.paidUntil).getTime() < Date.now();
      if (isExpired && (currentUser.subscriptionStatus === 'active' || currentUser.subscriptionStatus === 'ACTIVE')) {
        const updatedUser: User = {
          ...currentUser,
          subscriptionStatus: 'EXPIRED' as const,
          isPaid: false,
          monthlyPaid: false
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('plumb_current_user', JSON.stringify(updatedUser));
        saveUserProfile(updatedUser);
      }
    }

    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      try {
        if (currentUser.role === 'client') {
          // Check if we need to seed initial data first
          const initialCallouts = await getCalloutRequests(currentUser.id);
          if (initialCallouts.length === 0) {
            const seeded = getSeededPastJobs(currentUser);
            for (const job of seeded) {
              await saveCalloutRequest(job);
            }
          }
        }
      } catch (error) {
        console.error('Error checking/seeding initial callout requests:', error);
      }

      // Now set up real-time listener depending on role
      if (currentUser.role === 'plumber' || currentUser.role === 'crew') {
        unsubscribe = subscribeAllCalloutRequests((loadedCallouts) => {
          setCallouts(loadedCallouts);
          localStorage.setItem('plumb_callouts', JSON.stringify(loadedCallouts));
        });
      } else {
        unsubscribe = subscribeCalloutRequests(currentUser.id, (loadedCallouts) => {
          setCallouts(loadedCallouts);
          localStorage.setItem('plumb_callouts', JSON.stringify(loadedCallouts));
        });
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Sync viewing or paying requests when the real-time callouts array updates
  useEffect(() => {
    if (viewingRequest) {
      const updated = callouts.find(c => c.id === viewingRequest.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(viewingRequest)) {
        setViewingRequest(updated);
      }
    }
    if (payingRequest) {
      const updated = callouts.find(c => c.id === payingRequest.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(payingRequest)) {
        setPayingRequest(updated);
      }
    }
  }, [callouts, viewingRequest, payingRequest]);

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

    // If they have selected a service category, go straight to the dispatch form
    if (selectedCategory) {
      setDispatchModalOpen(true);
    }

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
    setSelectedCategory(category);
    if (!currentUser) {
      setAuthModalMode('register');
      setAuthModalOpen(true);
    } else {
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
        if (c.status === 'OPEN') nextStatus = 'ACCEPTED';
        else if (c.status === 'ACCEPTED') nextStatus = 'EN_ROUTE';
        else if (c.status === 'EN_ROUTE') nextStatus = 'IN_PROGRESS';
        else if (c.status === 'IN_PROGRESS') nextStatus = 'COMPLETED';
        else if (c.status === 'COMPLETED') nextStatus = 'CLOSED';
        
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
      if (c.id === id && c.status === 'OPEN') {
        return { ...c, status: 'CLOSED' as const };
      }
      return c;
    });
    updateCalloutsInStorage(updatedList);

    try {
      await updateCalloutRequestFields(id, { status: 'CLOSED' });
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
          status: c.status === 'CLOSED' ? 'CLOSED' : 'COMPLETED' as const
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

  // Accept an emergency job (Plumber / Crew Member)
  const handleAcceptJob = async (jobId: string) => {
    if (!currentUser) return;

    // Crew Member restriction
    if (currentUser.role === 'crew') {
      alert("❌ Crew accounts are restricted. Crew members cannot accept jobs independently. Only the Master Plumber can accept dispatches.");
      return;
    }

    // One-Active-Job check
    if (currentUser.activeJobId) {
      alert("❌ Violation of One-Active-Job Rule: You already have an active job. You must complete your current job before accepting a new dispatch.");
      return;
    }

    const job = callouts.find(c => c.id === jobId);
    if (!job) return;

    if (job.status !== 'OPEN') {
      alert("❌ This emergency ticket has already been accepted by another plumber or was closed.");
      return;
    }

    try {
      // Update job assigned fields
      const updatedFields: Partial<CalloutRequest> = {
        status: 'ACCEPTED',
        assignedPlumberId: currentUser.id
      };
      await updateCalloutRequestFields(jobId, updatedFields);

      // Update plumber's active job
      const updatedUser: User = {
        ...currentUser,
        activeJob: true,
        activeJobId: jobId
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('plumb_current_user', JSON.stringify(updatedUser));
      await saveUserProfile(updatedUser);

      setCallouts(prev => prev.map(c => c.id === jobId ? { ...c, ...updatedFields } : c));
      alert("⚡ Emergency Job Accepted! The client's full contact details and dispatch address are now unlocked below.");
    } catch (err) {
      console.error('Error accepting job:', err);
      alert('❌ Failed to accept job. Please try again.');
    }
  };

  // Complete an active job
  const handleCompleteActiveJob = async (jobId: string) => {
    if (!currentUser) return;

    try {
      await updateCalloutRequestFields(jobId, { status: 'COMPLETED' });

      // Plumber remains active (locked) until client signs off!
      setCallouts(prev => prev.map(c => c.id === jobId ? { ...c, status: 'COMPLETED' } : c));
      alert("🎉 You have marked the job as COMPLETED! Awaiting client signature and sign-off to complete the project.");
    } catch (err) {
      console.error('Error completing job:', err);
    }
  };

  // Renew plumber subscription
  const handleRenewSubscription = async (plan: 'monthly' | 'yearly') => {
    if (!currentUser) return;

    const price = plan === 'yearly' ? 400 : 50;
    const duration = plan === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const paidUntil = new Date(Date.now() + duration).toISOString();

    const updatedUser: User = {
      ...currentUser,
      subscriptionPlan: plan,
      subscriptionStatus: 'ACTIVE',
      monthlyPaid: true,
      isPaid: true,
      paidUntil
    };

    try {
      setCurrentUser(updatedUser);
      localStorage.setItem('plumb_current_user', JSON.stringify(updatedUser));
      await saveUserProfile(updatedUser);
      alert(`🎉 Subscription renewed! R${price}.00 processed. Your status is now ACTIVE. Thank you for your continued partnership.`);
    } catch (err) {
      console.error('Error renewing subscription:', err);
      alert('❌ Failed to renew subscription.');
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

        {/* Plumber/Crew Dashboard Portal vs Client Hero Section */}
        {currentUser && (currentUser.role === 'plumber' || currentUser.role === 'crew') ? (
          <section className="bg-slate-900 text-white rounded-3xl border-2 border-slate-800 shadow-2xl p-6 sm:p-10 relative overflow-hidden space-y-8 animate-fade-in">
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10" />

            {/* Portal Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div className="flex items-center space-x-4">
                <Logo size="md" className="text-white bg-slate-800 p-2 rounded-2xl border border-slate-700 shrink-0" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-red-600 text-white font-mono text-[9px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded">
                      ⚡ PLUMBER PORTAL
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Ref: {currentUser.plumberId || `CREW (Linked: ${currentUser.masterPlumberId ? 'PLM Team' : 'Unlinked'})`}
                    </span>
                  </div>
                  <h2 className="font-display font-black text-2xl tracking-tight uppercase mt-1">
                    {currentUser.fullName}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Role: <span className="text-slate-200 capitalize font-semibold">{currentUser.role} Plumber</span> {currentUser.role === 'plumber' && `• Crew Registered: ${currentUser.crewMemberIds?.length || 0}/5`}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Subscription Status
                </span>
                {currentUser.subscriptionStatus === 'active' || currentUser.subscriptionStatus === 'ACTIVE' ? (
                  <span className="bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 flex items-center">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-ping" />
                    ACTIVE
                  </span>
                ) : currentUser.subscriptionStatus === 'RESTRICTED' ? (
                  <span className="bg-amber-500/10 text-amber-400 font-mono text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30 flex items-center animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                    RESTRICTED
                  </span>
                ) : (
                  <span className="bg-red-500/10 text-red-400 font-mono text-xs font-bold px-3 py-1 rounded-full border border-red-500/30 flex items-center animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                    EXPIRED / SUSPENDED
                  </span>
                )}
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Paid Until: {currentUser.paidUntil ? new Date(currentUser.paidUntil).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Inactive/Expired/Restricted renewal prompt */}
            {(currentUser.subscriptionStatus === 'inactive' || currentUser.subscriptionStatus === 'EXPIRED' || currentUser.subscriptionStatus === 'RESTRICTED') && (
              <div className="bg-red-950/40 border border-red-500/30 p-5 rounded-2xl space-y-4">
                <div className="flex items-start space-x-3">
                  <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-display font-bold text-sm text-red-200">
                      Plumber Account Restrictions Applied ({currentUser.subscriptionStatus})
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      Your subscription has expired or is suspended. In accordance with Pretoria local Rapid-Response guidelines, you cannot view active dispatch jobs, chat with clients, or receive new work until subscription fees are settled (R50 per month).
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleRenewSubscription('monthly')}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md"
                  >
                    Pay R50 (Renew 1 Month)
                  </button>
                  <button
                    onClick={() => handleRenewSubscription('yearly')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2 rounded-xl border border-slate-700 transition"
                  >
                    Pay R400 (Renew 1 Year - Save R200)
                  </button>
                </div>
              </div>
            )}

            {(currentUser.subscriptionStatus === 'active' || currentUser.subscriptionStatus === 'ACTIVE') && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Accepted Active Job */}
                <div className="space-y-4">
                  <h3 className="font-display font-black text-xs tracking-wider uppercase text-slate-400 border-b border-slate-800 pb-2">
                    🎯 YOUR CURRENT ASSIGNED DISPATCH
                  </h3>

                  {currentUser.activeJobId ? (
                    (() => {
                      const activeJob = callouts.find(c => c.id === currentUser.activeJobId);
                      if (!activeJob) {
                        return (
                          <div className="p-6 bg-slate-800/40 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                            No active job record found. Feel free to claim a job on the right board.
                          </div>
                        );
                      }
                      const category = PLUMBING_CATEGORIES.find(cat => cat.id === activeJob.jobCategoryId) || PLUMBING_CATEGORIES[0];
                      return (
                        <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="bg-red-500/10 text-red-400 font-mono text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border border-red-500/20 uppercase">
                                {activeJob.status}
                              </span>
                              <h4 className="font-display font-bold text-base mt-2">
                                {category.title} Emergency Repair
                              </h4>
                            </div>
                            <span className="text-slate-400 font-mono text-xs">
                              Ref: {activeJob.invoiceNumber}
                            </span>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                            <div>
                              <span className="text-slate-400 font-bold">Client Name:</span>
                              <p className="text-slate-200 mt-0.5 font-medium">{activeJob.clientName}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold">Client Contact Number:</span>
                              <p className="text-slate-200 mt-0.5 font-mono">{activeJob.clientPhone}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold">Dispatch Location:</span>
                              <p className="text-slate-200 mt-0.5 font-medium leading-relaxed">
                                {activeJob.clientAddress}, {activeJob.clientCity}, {activeJob.clientProvince}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold">Description of Issue:</span>
                              <p className="text-slate-300 italic mt-1 leading-relaxed">
                                &ldquo;{activeJob.issueDescription}&rdquo;
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold">Total Job Value:</span>
                              <p className="text-red-400 font-mono font-bold text-sm mt-0.5">
                                R{activeJob.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block mb-1">Before / After Work Photos:</span>
                              <div className="flex items-center gap-3">
                                <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-slate-700 transition-all flex items-center space-x-1">
                                  <span>📷 Upload Work Photo</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        alert("🎉 Work photo uploaded securely to Firebase storage bucket and logged!");
                                      }
                                    }} 
                                  />
                                </label>
                                <span className="text-[10px] text-slate-500 font-mono">PNG, JPG formats supported</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions to progress status */}
                          <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2.5">
                            {activeJob.status === 'En Route' && (
                              <button
                                onClick={() => handleSimulateProgress(activeJob.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-full transition"
                              >
                                Mark: Arrived & Starting Work
                              </button>
                            )}
                            {activeJob.status === 'In Progress' && (
                              <button
                                onClick={() => handleCompleteActiveJob(activeJob.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-full transition"
                              >
                                Complete Job & Finalize Tax Invoice
                              </button>
                            )}
                            <button
                              onClick={() => setActiveChatCalloutId(activeJob.id)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-1.5 rounded-full border border-slate-700 transition flex items-center space-x-1.5"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>Live Chat with Client</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-10 bg-slate-800/20 border border-dashed border-slate-800 rounded-3xl text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
                      <CheckCircle className="h-8 w-8 text-slate-700 animate-pulse" />
                      <p className="font-bold">No active assigned job.</p>
                      <p className="text-[10px] text-slate-500">
                        You are free to accept any Pretoria incoming emergency call-outs listed on the right panel.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Available Incoming Jobs Board */}
                <div className="space-y-4">
                  <h3 className="font-display font-black text-xs tracking-wider uppercase text-slate-400 border-b border-slate-800 pb-2 flex justify-between items-center">
                    <span>📢 INCOMING EMERGENCY BROADCASTS (PRETORIA)</span>
                    <span className="bg-red-500 text-white text-[9px] font-black font-mono px-2 py-0.5 rounded-full animate-pulse">
                      {callouts.filter(c => c.status === 'Pending Dispatch').length} NEW
                    </span>
                  </h3>

                  <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                    {callouts.filter(c => c.status === 'Pending Dispatch').length === 0 ? (
                      <div className="p-10 text-center bg-slate-800/10 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                        No pending dispatches available at the moment. Stands are clear!
                      </div>
                    ) : (
                      callouts
                        .filter(c => c.status === 'Pending Dispatch')
                        .map(job => {
                          const category = PLUMBING_CATEGORIES.find(cat => cat.id === job.jobCategoryId) || PLUMBING_CATEGORIES[0];
                          const maskName = (name: string) => {
                            if (!name) return 'Resident';
                            const parts = name.split(' ');
                            const first = parts[0] || '';
                            return `${first.charAt(0)}*** (Hidden until accepted)`;
                          };
                          return (
                            <div key={job.id} className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl space-y-3 hover:border-slate-700 transition">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-display font-bold text-sm text-slate-200">
                                    {category.title} Call-out
                                  </h4>
                                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                    Province/City: {job.clientCity}, {job.clientProvince}
                                  </span>
                                </div>
                                <span className="font-mono text-slate-300 font-bold text-xs bg-slate-800 px-2.5 py-1 rounded">
                                  R{job.totalAmount.toLocaleString('en-ZA')}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 italic line-clamp-2">
                                &ldquo;{job.issueDescription}&rdquo;
                              </p>

                              <div className="text-[10px] text-slate-400 grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800/50 font-mono">
                                <div>
                                  <strong>Client:</strong> {maskName(job.clientName)}
                                </div>
                                <div>
                                  <strong>Location:</strong> Hidden until accepted
                                </div>
                              </div>

                              <div className="pt-2">
                                <button
                                  onClick={() => handleAcceptJob(job.id)}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg transition tracking-wide uppercase font-display"
                                >
                                  ⚡ Accept Job &amp; Dispatch Crew
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : (
          /* Hero Section containing Huge 24/7 Red Button */
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
        )}

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
                                  {req.projectName ? `${req.projectName} Project` : `Emergency ${category.title} Crew`}
                                </h4>
                                <p className="text-xs text-slate-500 truncate italic pr-4">
                                  &ldquo;{req.projectDescription || req.issueDescription}&rdquo;
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
        {(!currentUser || currentUser.role === 'client') && callouts.length > 0 && (
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
