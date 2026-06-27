import React, { useState, useEffect } from 'react';
import { User, JobCategory, CalloutRequest } from '../types';
import { PLUMBING_CATEGORIES } from '../data';
import { X, Wrench, MapPin, Phone, ShieldAlert, CreditCard, CheckCircle, AlertOctagon } from 'lucide-react';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  selectedCategory: JobCategory | null;
  onDispatchConfirmed: (request: CalloutRequest) => void;
}

export default function DispatchModal({
  isOpen,
  onClose,
  currentUser,
  selectedCategory,
  onDispatchConfirmed,
}: DispatchModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Sync default selected category
  useEffect(() => {
    if (selectedCategory) {
      setCategoryId(selectedCategory.id);
    } else {
      setCategoryId(PLUMBING_CATEGORIES[0].id);
    }
    setDescription('');
    setError('');
  }, [selectedCategory, isOpen]);

  if (!isOpen || !currentUser) return null;

  const currentCategory = PLUMBING_CATEGORIES.find(c => c.id === categoryId) || PLUMBING_CATEGORIES[0];

  // Pricing calculations
  const baseFee = 1000;
  const surcharge = currentUser.isPretoriaGauteng ? 0 : 3000;
  const totalAmount = baseFee + surcharge;

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a brief description of the plumbing emergency.');
      return;
    }

    const invoiceNumber = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    const newRequest: CalloutRequest = {
      id: 'req_' + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      jobCategoryId: categoryId,
      issueDescription: description.trim(),
      status: 'Pending Dispatch',
      createdAt: new Date().toISOString(),
      baseFee,
      surcharge,
      totalAmount,
      invoiceNumber,
      clientName: currentUser.fullName,
      clientPhone: currentUser.phone,
      clientAddress: `${currentUser.streetAddress}, ${currentUser.suburb}`,
      clientCity: currentUser.city,
      clientProvince: currentUser.province,
    };

    onDispatchConfirmed(newRequest);
    onClose();
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
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 bg-red-600 rounded-full animate-ping" />
            <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900">
              Confirm 24/7 Call Out
            </h3>
          </div>
          <button 
            id="close-dispatch-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleDispatch} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start space-x-2">
              <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Plumbing Emergency Type
            </label>
            <select
              id="dispatch-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition"
            >
              {PLUMBING_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5 italic">
              Selected: {currentCategory.description}
            </p>
          </div>

          {/* 2. Emergency Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              What is the plumbing emergency?
            </label>
            <textarea
              id="dispatch-description"
              placeholder="e.g., Burst geyser spraying water from the ceiling, or water main line leaking in the garden."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition resize-none"
              required
            />
          </div>

          {/* 3. Address and Dispatch Target Confirmation */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Dispatch Destination & Contact
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start space-x-2">
                <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-700">Property Address:</span>
                  <p className="text-slate-600 mt-0.5">
                    {currentUser.streetAddress}, {currentUser.suburb}<br />
                    {currentUser.city}, {currentUser.province}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-700">Resident Contact:</span>
                  <p className="text-slate-600 mt-0.5">
                    {currentUser.fullName}<br />
                    {currentUser.phone}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Automated Fee Calculations */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Automated Service Billing
              </span>
              <span className="text-[10px] font-semibold bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase">
                Tax Invoice Pending
              </span>
            </div>

            <div className="p-4 bg-white space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Standard R1000 Emergency Call-out:</span>
                <span className="font-mono text-slate-900 font-semibold">R1,000.00</span>
              </div>

              {surcharge > 0 ? (
                <>
                  <div className="flex justify-between text-red-600 font-semibold bg-red-50/50 p-2 rounded-lg border border-red-100/50">
                    <div className="flex items-center space-x-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                      <span>Long-distance travel surcharge ({currentUser.province}):</span>
                    </div>
                    <span className="font-mono">R3,000.00</span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic pl-1">
                    * Surcharge calculated dynamically for registered coordinates outside of primary Pretoria (GP) operations.
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-emerald-600 font-semibold bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Pretoria Local Coverage Surcharge Discount:</span>
                  </div>
                  <span className="font-mono">R0.00 (Waived)</span>
                </div>
              )}

              <div className="border-t border-slate-200 my-2 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span className="text-base font-display">Grand Total Invoice:</span>
                <span className="font-mono text-base text-red-600">R{totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              id="confirm-dispatch-btn"
              type="submit"
              className="w-full bg-red-600 text-white font-display font-black py-3.5 rounded-full hover:bg-red-700 transition shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-base active:scale-[0.99]"
            >
              <Wrench className="h-5 w-5 animate-bounce" />
              <span>CONFIRM EMERGENCY DISPATCH</span>
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-2">
              By confirming, a highly specialized Pretoria plumber will be dispatched immediately. A South African standard VAT invoice will be generated and saved to your account profile.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
