import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { SOUTH_AFRICAN_PROVINCES } from '../data';
import { X, Mail, Lock, User as UserIcon, Phone, MapPin, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { saveUserProfile, getUserProfileByEmail, getPlumberByPlumberId, generatePlumberIdWithTransaction } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'login' | 'register';
  onAuthSuccess: (user: User) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode,
  onAuthSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  
  // Registration States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [city, setCity] = useState('Pretoria');
  const [province, setProvince] = useState('Gauteng');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'plumber' | 'crew'>('client');
  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [masterPlumberCode, setMasterPlumberCode] = useState('');
  const [crewSpacesLeftMessage, setCrewSpacesLeftMessage] = useState('');
  
  // Forgot Password States
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  
  // Validation & Warnings
  const [error, setError] = useState('');
  const [isOutofArea, setIsOutofArea] = useState(false);

  // Sync mode with props
  useEffect(() => {
    setMode(initialMode);
    setError('');
    setResetSuccess(false);
    setResetUser(null);
    setResetEmail('');
  }, [initialMode, isOpen]);

  // Check if out of area (Pretoria Gauteng)
  useEffect(() => {
    const isPretoria = city.trim().toLowerCase() === 'pretoria';
    const isGauteng = province === 'Gauteng';
    
    if (province !== 'Gauteng' || !isPretoria) {
      setIsOutofArea(true);
    } else {
      setIsOutofArea(false);
    }
  }, [city, province]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      // First, try to lookup in Firestore
      let user = await getUserProfileByEmail(email);

      if (!user) {
        // Fallback: Lookup user in localStorage
        const storedUsers: User[] = JSON.parse(localStorage.getItem('plumb_users') || '[]');
        user = storedUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
      }

      if (user) {
        // Ensure user is in Firestore if they were only local
        await saveUserProfile(user);
        onAuthSuccess(user);
        onClose();
      } else {
        // Create a default demo user if not found to ensure smooth demo testing
        if (email === 'demo@pretoria.co.za') {
          const demoUser: User = {
            id: 'demo-pretoria',
            fullName: 'Sipho Ndlovu',
            email: 'demo@pretoria.co.za',
            phone: '0821234567',
            streetAddress: '123 Francis Baard Street',
            suburb: 'Pretoria Central',
            city: 'Pretoria',
            province: 'Gauteng',
            isPretoriaGauteng: true
          };
          await saveUserProfile(demoUser);
          onAuthSuccess(demoUser);
          onClose();
        } else if (email === 'demo@national.co.za') {
          const demoUser: User = {
            id: 'demo-national',
            fullName: 'Johan van der Merwe',
            email: 'demo@national.co.za',
            phone: '0719876543',
            streetAddress: '45 Long Street',
            suburb: 'Cape Town City Centre',
            city: 'Cape Town',
            province: 'Western Cape',
            isPretoriaGauteng: false
          };
          await saveUserProfile(demoUser);
          onAuthSuccess(demoUser);
          onClose();
        } else {
          setError('User not registered. Try signing up or logging in with "demo@pretoria.co.za" / "demo@national.co.za" (password can be anything).');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Database connection error. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !phone || !streetAddress || !suburb || !city || !province || !password) {
      setError('Please fill in all details, including address and contact details');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (phone.replace(/\s/g, '').length < 9) {
      setError('Please enter a valid South African contact number (min 9 digits)');
      return;
    }

    // Secure/Simulated Validation for Plumber subscriptions
    let masterPlumberObj: User | null = null;
    if (role === 'crew') {
      if (!masterPlumberCode) {
        setError('Please enter a Master Plumber ID Code to link your crew account');
        return;
      }
      const formattedCode = masterPlumberCode.toUpperCase().trim();
      if (!formattedCode.match(/^PLM-[0-9]{6}$/)) {
        setError('Please enter a valid Master Plumber ID (Format: PLM-000001)');
        return;
      }
      masterPlumberObj = await getPlumberByPlumberId(formattedCode);
      if (!masterPlumberObj) {
        setError('The entered Master Plumber ID does not exist. Please check with your supervisor.');
        return;
      }
      const currentCrewCount = masterPlumberObj.crewMemberIds?.length || 0;
      if (currentCrewCount >= 5) {
        setError('This Master Plumber has already registered the maximum limit of 5 crew members.');
        return;
      }
    }

    if (role === 'plumber') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 13 || cleanCard.length > 19 || !/^\d+$/.test(cleanCard)) {
        setError('Please enter a valid credit/debit card number');
        return;
      }

      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
        setError('Please enter a valid expiry date in MM/YY format');
        return;
      }

      const cleanCvv = cardCvv.trim();
      if (cleanCvv.length < 3 || cleanCvv.length > 4 || !/^\d+$/.test(cleanCvv)) {
        setError('Please enter a valid 3 or 4 digit card CVV');
        return;
      }
    }

    try {
      // Check if email already exists in Firestore or local
      const existingFirestoreUser = await getUserProfileByEmail(email);
      const storedUsers: User[] = JSON.parse(localStorage.getItem('plumb_users') || '[]');
      const existingLocalUser = storedUsers.some(u => u.email.toLowerCase() === email.toLowerCase());

      if (existingFirestoreUser || existingLocalUser) {
        setError('Email already registered');
        return;
      }

      const isPretoriaGauteng = province === 'Gauteng' && city.trim().toLowerCase() === 'pretoria';
      const newUserId = 'usr_' + Math.random().toString(36).substr(2, 9);

      let newUser: User = {
        id: newUserId,
        fullName,
        email,
        phone,
        streetAddress,
        suburb,
        city: city.trim(),
        province,
        isPretoriaGauteng,
        role
      };

      if (role === 'plumber') {
        const nextPlumberId = await generatePlumberIdWithTransaction();
        const paidDuration = subscriptionPlan === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        const paidUntil = new Date(Date.now() + paidDuration).toISOString();
        newUser = {
          ...newUser,
          plumberId: nextPlumberId,
          subscriptionPlan,
          subscriptionStatus: 'active',
          monthlyPaid: true,
          paidUntil,
          isMaster: true,
          crewMemberIds: [],
          activeJobId: null
        };
      } else if (role === 'crew' && masterPlumberObj) {
        newUser = {
          ...newUser,
          masterPlumberId: masterPlumberObj.id,
          restricted: true,
          subscriptionStatus: masterPlumberObj.subscriptionStatus || 'active',
          activeJobId: null
        };

        // Update Master Plumber's crew list in database
        const updatedCrewList = [...(masterPlumberObj.crewMemberIds || []), newUserId];
        await saveUserProfile({
          ...masterPlumberObj,
          crewMemberIds: updatedCrewList
        });
      } else {
        newUser = {
          ...newUser,
          role: 'client'
        };
      }

      // Save to Firestore & local storage
      await saveUserProfile(newUser);
      
      storedUsers.push(newUser);
      localStorage.setItem('plumb_users', JSON.stringify(storedUsers));
      
      onAuthSuccess(newUser);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Database error during registration. Please try again.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess(false);
    setResetUser(null);

    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    setIsSendingReset(true);
    try {
      // First, try to lookup in Firestore
      let user = await getUserProfileByEmail(resetEmail);

      if (!user) {
        // Fallback: Lookup user in localStorage
        const storedUsers: User[] = JSON.parse(localStorage.getItem('plumb_users') || '[]');
        user = storedUsers.find(u => u.email.toLowerCase() === resetEmail.toLowerCase()) || null;
      }

      // Add a slight realistic delay (750ms) to make it feel premium and genuine
      await new Promise(resolve => setTimeout(resolve, 750));

      if (user) {
        setResetUser(user);
        setResetSuccess(true);
      } else {
        setError('No emergency account registered with this email address. Please register a new account.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to database. Please try again.');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl shadow-high w-full max-w-lg max-h-[90vh] overflow-y-auto z-10 border-2 border-slate-200 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20">
          <div className="flex items-center space-x-3">
            <Logo size="sm" className="text-slate-900" />
            <div>
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900">
                {mode === 'login' ? 'Access Emergency Panel' : mode === 'forgot' ? 'Reset Emergency Password' : 'Emergency Registration'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'login' 
                  ? 'Enter your details to dispatch plumbers instantly' 
                  : mode === 'forgot'
                    ? 'Restore access to your rapid response plumbing profile'
                    : 'All South African citizens and properties welcome'}
              </p>
            </div>
          </div>
          <button 
            id="close-auth-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="e.g. sipho@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setResetSuccess(false); setResetUser(null); }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <button
                id="submit-login"
                type="submit"
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-full hover:bg-slate-800 transition shadow-sm mt-6 text-sm"
              >
                Log In
              </button>

              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600">
                <p className="font-semibold text-slate-700 mb-1 flex items-center">
                  <Info className="h-3.5 w-3.5 text-blue-600 mr-1 shrink-0" /> Quick Demo Accounts:
                </p>
                <ul className="list-disc pl-4 space-y-1 mt-1">
                  <li>
                    Pretoria (Gauteng): <strong className="text-slate-800">demo@pretoria.co.za</strong>
                  </li>
                  <li>
                    Other Provinces (Out of Area): <strong className="text-slate-800">demo@national.co.za</strong>
                  </li>
                  <span className="text-slate-400 italic">No password required. Simply click Login.</span>
                </ul>
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-slate-500">
                  New emergency?{' '}
                  <button
                    id="switch-to-register"
                    type="button"
                    onClick={() => { setMode('register'); setError(''); }}
                    className="text-red-600 font-semibold hover:underline"
                  >
                    Register an Account
                  </button>
                </p>
              </div>
            </form>
          ) : mode === 'forgot' ? (
            /* FORGOT PASSWORD FORM */
            <div className="space-y-6">
              {resetSuccess ? (
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 mb-2">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-950">Password Bypass Generated</h4>
                  <p className="text-sm text-slate-600">
                    Your account has been located for <strong className="text-slate-900">{resetUser?.fullName}</strong>.
                    Since passwords are used for rapid testing access, you can bypass entry and sign in instantly below.
                  </p>
                  
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (resetUser) {
                          onAuthSuccess(resetUser);
                          onClose();
                        }
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-full transition text-sm shadow-sm"
                    >
                      Instant Emergency Log In
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setResetSuccess(false);
                      setResetUser(null);
                      setResetEmail('');
                      setError('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 underline font-medium block mx-auto pt-2"
                  >
                    Back to Log In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                      <input
                        id="reset-email"
                        type="email"
                        placeholder="sipho@gmail.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-full hover:bg-slate-800 transition shadow-sm mt-4 text-sm flex items-center justify-center disabled:opacity-50"
                  >
                    {isSendingReset ? 'Verifying Account...' : 'Generate Bypass Code'}
                  </button>

                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(''); }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                    >
                      ← Back to Log In
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider border-b border-red-100 pb-1 mb-2">
                1. Account Type Selection
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                <div 
                  onClick={() => setRole('client')}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition text-left flex flex-col justify-between h-full ${
                    role === 'client' 
                      ? 'border-red-600 bg-red-50/20 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Client</span>
                    <span className="text-[10px] text-slate-500 mt-1 block leading-normal">
                      Need rapid emergency plumbing dispatches.
                    </span>
                  </div>
                  <span className="text-emerald-600 font-mono text-[9px] font-black mt-3 block uppercase tracking-wider">
                    FREE REGISTER
                  </span>
                </div>

                <div 
                  onClick={() => setRole('plumber')}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition text-left flex flex-col justify-between h-full ${
                    role === 'plumber' 
                      ? 'border-red-600 bg-red-50/20 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Plumber</span>
                    <span className="text-[10px] text-slate-500 mt-1 block leading-normal">
                      Get and accept active emergency tickets.
                    </span>
                  </div>
                  <span className="text-red-600 font-mono text-[9px] font-black mt-3 block uppercase tracking-wider">
                    R50 / MONTH
                  </span>
                </div>

                <div 
                  onClick={() => setRole('crew')}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition text-left flex flex-col justify-between h-full ${
                    role === 'crew' 
                      ? 'border-red-600 bg-red-50/20 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">Crew Member</span>
                    <span className="text-[10px] text-slate-500 mt-1 block leading-normal">
                      Link with an existing Pretoria plumbing team.
                    </span>
                  </div>
                  <span className="text-blue-600 font-mono text-[9px] font-black mt-3 block uppercase tracking-wider">
                    TEAM JOIN CODE
                  </span>
                </div>
              </div>

              {role === 'crew' && (
                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-3 animate-fade-in">
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Link with Master Plumber Account
                  </span>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Enter Master Plumber ID Code
                    </label>
                    <input
                      id="crew-plumber-code"
                      type="text"
                      placeholder="e.g. PLM-000001"
                      value={masterPlumberCode}
                      onChange={async (e) => {
                        const code = e.target.value.toUpperCase();
                        setMasterPlumberCode(code);
                        if (code.match(/^PLM-[0-9]{6}$/)) {
                          const master = await getPlumberByPlumberId(code);
                          if (master) {
                            const count = master.crewMemberIds?.length || 0;
                            if (count >= 5) {
                              setCrewSpacesLeftMessage('❌ This Plumber ID has already reached the maximum limit of 5 crew members.');
                            } else if (count === 4) {
                              setCrewSpacesLeftMessage('⚠️ One plumber space left');
                            } else {
                              const left = 5 - count;
                              setCrewSpacesLeftMessage(`✅ Linked! ${left} spaces remaining on this team.`);
                            }
                          } else {
                            setCrewSpacesLeftMessage('❌ Plumber ID not found. Please double check.');
                          }
                        } else {
                          setCrewSpacesLeftMessage('');
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500 font-mono"
                      required={role === 'crew'}
                    />
                    {crewSpacesLeftMessage && (
                      <p className={`text-xs mt-1.5 font-bold ${
                        crewSpacesLeftMessage.includes('❌') ? 'text-red-600' : 
                        crewSpacesLeftMessage.includes('One') ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {crewSpacesLeftMessage}
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 text-center italic leading-normal">
                    Crew members are added under a Master Plumber and cannot accept jobs independently or receive direct payments.
                  </p>
                </div>
              )}

              {role === 'plumber' && (
                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-3 animate-fade-in">
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Plumber Subscription Plan
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setSubscriptionPlan('monthly')}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition text-center ${
                        subscriptionPlan === 'monthly'
                          ? 'border-red-600 bg-white text-red-600 font-bold'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <span className="block text-[10px] uppercase tracking-wider font-semibold">Monthly Plan</span>
                      <span className="block text-base font-black font-mono mt-1">R50<span className="text-xs font-normal"> / mo</span></span>
                    </div>

                    <div
                      onClick={() => setSubscriptionPlan('yearly')}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition text-center relative ${
                        subscriptionPlan === 'yearly'
                          ? 'border-red-600 bg-white text-red-600 font-bold'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <span className="absolute -top-2.5 right-2 px-1.5 py-0.5 bg-red-600 text-[8px] text-white font-black rounded-full uppercase tracking-wider">
                        Save R200!
                      </span>
                      <span className="block text-[10px] uppercase tracking-wider font-semibold">Yearly Plan</span>
                      <span className="block text-base font-black font-mono mt-1">R400<span className="text-xs font-normal"> / yr</span></span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center italic">
                    Plumbers must maintain an active subscription to view available nearby emergency tickets.
                  </p>
                </div>
              )}

              <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider border-b border-red-100 pb-1 mb-2 pt-2">
                2. Account & Contact Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      id="reg-fullname"
                      type="text"
                      placeholder="Sipho Ndlovu"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      id="reg-phone"
                      type="tel"
                      placeholder="e.g. 082 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="sipho@example.co.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Account Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider border-b border-red-100 pb-1 pt-2 mb-2">
                3. Emergency Dispatch Address
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Street Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    id="reg-street"
                    type="text"
                    placeholder="e.g. 123 Francis Baard Street"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Suburb
                  </label>
                  <input
                    id="reg-suburb"
                    type="text"
                    placeholder="e.g. Hatfield"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    City / Town
                  </label>
                  <input
                    id="reg-city"
                    type="text"
                    placeholder="e.g. Pretoria"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Province
                </label>
                <select
                  id="reg-province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
                >
                  {SOUTH_AFRICAN_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              {role === 'plumber' && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider border-b border-red-100 pb-1 pt-2 mb-2">
                    4. Secure Subscription Billing
                  </h4>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200/60 font-mono">
                      <span>Plan Total Due Now:</span>
                      <strong className="text-slate-900 text-sm">
                        {subscriptionPlan === 'monthly' ? 'R50.00 / month' : 'R400.00 / year'}
                      </strong>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Credit / Debit Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="4000 1234 5678 9010"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const matches = val.match(/\d{4,16}/g);
                          const match = (matches && matches[0]) || '';
                          const parts = [];

                          for (let i = 0, len = match.length; i < len; i += 4) {
                            parts.push(match.substring(i, i + 4));
                          }

                          if (parts.length > 0) {
                            setCardNumber(parts.join(' '));
                          } else {
                            setCardNumber(val);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500 font-mono"
                        required={role === 'plumber'}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 2) {
                              val = val.substring(0, 2) + '/' + val.substring(2, 4);
                            }
                            setCardExpiry(val);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500 font-mono"
                          required={role === 'plumber'}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          CVV Security Code
                        </label>
                        <input
                          type="password"
                          placeholder="123"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-red-500 font-mono"
                          required={role === 'plumber'}
                        />
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-400 text-center leading-normal">
                      🔒 Secured via 256-bit encrypted simulated gate. Payments are processed immediately to grant instant responding status.
                    </p>
                  </div>
                </div>
              )}

              {/* DYNAMIC SURCHARGE WARNING / PREVIEW */}
              <AnimatePresence mode="wait">
                {isOutofArea ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-2 mt-2">
                      <div className="flex items-center space-x-2 font-bold text-amber-800 text-sm">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>⚠️ Surcharge Warning (Out of Pretoria Area)</span>
                      </div>
                      <p className="leading-relaxed">
                        Our primary emergency fleet is localized in <strong className="text-slate-900">Pretoria, Gauteng</strong>. 
                        Your registered location is detected as <strong className="text-slate-900">{city}, {province}</strong>.
                      </p>
                      <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-200/60 font-mono text-[11px] text-slate-800">
                        <div className="flex justify-between">
                          <span>Standard emergency call-out fee:</span>
                          <strong>R1,000.00</strong>
                        </div>
                        <div className="flex justify-between text-red-700 font-bold">
                          <span>Out-of-Province travel surcharge:</span>
                          <strong>+ R3,000.00</strong>
                        </div>
                        <div className="border-t border-amber-300 my-1 pt-1 flex justify-between font-bold text-slate-900 text-xs">
                          <span>Calculated Dispatch Invoice:</span>
                          <span>R4,000.00</span>
                        </div>
                      </div>
                      <p className="italic text-slate-600 text-[10px]">
                        * By registering, you agree to the R3,000 out-of-province travel charge to compile a total R4,000 call-out fee on dispatch.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-1 mt-2">
                      <div className="flex items-center space-x-2 font-bold text-emerald-800">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span>Pretoria Central Zone Confirmed</span>
                      </div>
                      <p>
                        Your address in <strong className="text-slate-900">{city}, Gauteng</strong> is within our direct coverage range.
                      </p>
                      <div className="font-mono text-[11px] text-emerald-800">
                        <strong>Standard Emergency Rate: R1,000.00 Flat Call-out</strong>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                id="submit-register"
                type="submit"
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-full hover:bg-slate-800 transition shadow-sm mt-6 text-sm"
              >
                Register & Approve Rates
              </button>

              <div className="text-center mt-6">
                <p className="text-sm text-slate-500">
                  Already registered?{' '}
                  <button
                    id="switch-to-login"
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-red-600 font-semibold hover:underline"
                  >
                    Log In instead
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
