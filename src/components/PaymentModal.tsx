import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Lock, ShieldCheck, AlertCircle, X, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { CalloutRequest } from '../types';

interface PaymentModalProps {
  request: CalloutRequest;
  onClose: () => void;
  onPaymentSuccess: (method: string, totalAmount: number, additionalCosts: number) => void;
}

export default function PaymentModal({ request, onClose, onPaymentSuccess }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'eft' | 'scan'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Form states
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('FNB');

  // Let's compute potential additional service costs
  // If the status is 'Completed' or 'In Progress', there might have been additional plumbing work
  // Let's seed an additional service cost dynamically if the user chooses to pay for extra repairs,
  // or define some based on the job type.
  const [additionalRepairs, setAdditionalRepairs] = useState<{name: string, cost: number}[]>([]);
  const [addExtraRepairs, setAddExtraRepairs] = useState(false);

  useEffect(() => {
    // Generate typical extra services based on category
    const catId = request.jobCategoryId;
    let extraTasks: {name: string, cost: number}[] = [];
    if (catId === 'blocked-toilets') {
      extraTasks = [
        { name: 'High-pressure sewer rod clearing service', cost: 850.00 },
        { name: 'Heavy-duty wax ring replacement & sanitation sealing', cost: 450.00 }
      ];
    } else if (catId === 'pipe-repairs') {
      extraTasks = [
        { name: 'Emergency copper pipe splicing & soldering materials', cost: 1200.00 },
        { name: 'Pressure-regulating safety valve replacement', cost: 950.00 }
      ];
    } else if (catId === 'bathroom-kitchen') {
      extraTasks = [
        { name: 'Premium brass mixer tap replacement', cost: 1100.00 },
        { name: 'Under-sink water feed flexi-hoses', cost: 350.00 }
      ];
    } else if (catId === 'leak-detection') {
      extraTasks = [
        { name: 'Acoustic pipeline mapping & chemical tracer fee', cost: 1450.00 }
      ];
    } else if (catId === 'water-pumps') {
      extraTasks = [
        { name: 'Submersible float switch rewiring', cost: 750.00 },
        { name: 'Stainless steel impellor seal replacement', cost: 950.00 }
      ];
    } else {
      extraTasks = [
        { name: 'Materials call-out allowance (fittings, gaskets, washers)', cost: 350.00 },
        { name: 'Additional hourly technical rate (1.5 hours)', cost: 750.00 }
      ];
    }
    setAdditionalRepairs(extraTasks);
    // If the request is Completed, we automatically add the repairs to represent the final bill
    if (request.status === 'Completed' || request.status === 'In Progress') {
      setAddExtraRepairs(true);
    }
  }, [request]);

  const getExtraCostTotal = () => {
    if (!addExtraRepairs) return 0;
    return additionalRepairs.reduce((acc, r) => acc + r.cost, 0);
  };

  const getFinalTotal = () => {
    return request.totalAmount + getExtraCostTotal();
  };

  const handleCardNumberChange = (val: string) => {
    // Format card number with spaces every 4 digits
    const clean = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = clean.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(clean);
    }
  };

  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (clean.length >= 2) {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2, 4)}`);
    } else {
      setCardExpiry(clean);
    }
  };

  const startPaymentProcess = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setProcessingStatus('Connecting to secure banking gate...');

    setTimeout(() => {
      setProcessingStatus('Verifying 3D-Secure credentials...');
      
      setTimeout(() => {
        if (paymentMethod === 'card' || paymentMethod === 'eft') {
          setProcessingStatus('Awaiting bank verification...');
          setIsProcessing(false);
          setShowOtp(true);
        } else {
          // Scan QR code directly triggers success after a short simulator
          setProcessingStatus('Authorized by SnapScan API!');
          setTimeout(() => {
            setIsProcessing(false);
            setPaymentSuccess(true);
            setTimeout(() => {
              onPaymentSuccess(
                'SnapScan/Zapper QR',
                getFinalTotal(),
                getExtraCostTotal()
              );
            }, 1500);
          }, 800);
        }
      }, 1200);
    }, 1000);
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '12345' && otpCode.trim().length < 5) {
      setOtpError('Invalid authorization PIN. Please enter "12345" or any 5 digit code.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Settling funds with gateway...');

    setTimeout(() => {
      setIsProcessing(false);
      setShowOtp(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        onPaymentSuccess(
          paymentMethod === 'card' ? 'Visa/Mastercard Credit' : `Instant EFT (${selectedBank})`,
          getFinalTotal(),
          getExtraCostTotal()
        );
      }, 1500);
    }, 1500);
  };

  const banks = [
    { name: 'FNB', logoBg: 'bg-teal-600' },
    { name: 'Standard Bank', logoBg: 'bg-blue-800' },
    { name: 'Capitec Bank', logoBg: 'bg-rose-600' },
    { name: 'Nedbank', logoBg: 'bg-emerald-800' },
    { name: 'ABSA', logoBg: 'bg-red-700' },
    { name: 'TymeBank', logoBg: 'bg-yellow-500' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-3xl shadow-high w-full max-w-lg overflow-hidden border-2 border-slate-200 z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span className="font-display font-black text-sm tracking-tight uppercase">Plumb-TS SecurePay</span>
          </div>
          <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {paymentSuccess ? (
            /* SUCCESS PANEL */
            <div className="py-12 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="font-display font-black text-xl text-slate-800">Payment Authorized!</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Your transaction of <strong className="text-slate-900">R{getFinalTotal().toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</strong> was successfully processed. Tax invoice has been updated.
              </p>
              <div className="text-[10px] font-mono text-slate-400">
                Gateway Ref: SOS-PAY-{Math.floor(Math.random() * 900000 + 100000)}
              </div>
            </div>
          ) : showOtp ? (
            /* OTP OTP VERIFICATION SCREEN */
            <form onSubmit={submitOtp} className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6 animate-bounce" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-800">3D-Secure Verification</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  We have simulated sending a secure 5-digit OTP code to your registered mobile device.
                </p>
              </div>

              <div className="max-w-xs mx-auto space-y-3">
                <div className="text-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Enter SMS One-Time PIN
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/\D/g, ''));
                      setOtpError('');
                    }}
                    placeholder="e.g. 12345"
                    className="w-36 tracking-[0.5em] text-center font-mono font-bold text-lg bg-slate-50 border-2 border-slate-200 rounded-xl py-2 focus:outline-none focus:border-red-600 focus:bg-white transition"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Hint: Type <strong>12345</strong> to unlock</span>
                </div>

                {otpError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-bold rounded-lg flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{otpError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white font-bold py-3 rounded-full hover:bg-slate-800 transition text-sm flex items-center justify-center space-x-2"
                >
                  <span>Submit Code & Pay</span>
                </button>
              </div>
            </form>
          ) : isProcessing ? (
            /* PROCESSING LOADER */
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
              <p className="text-xs font-bold text-slate-700">{processingStatus}</p>
              <span className="text-[10px] text-slate-400 font-mono">Secured SSL Connection Active</span>
            </div>
          ) : (
            /* MAIN PAYMENT SELECTION FORM */
            <div className="space-y-6">
              {/* Payment Summary Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                  <span className="text-xs text-slate-500 font-medium">Invoice reference:</span>
                  <span className="font-mono text-xs font-bold text-slate-800">{request.invoiceNumber}</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Base Call-out Settle:</span>
                    <span>R1,000.00</span>
                  </div>
                  {request.surcharge > 0 && (
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>Long-distance Travel Fee:</span>
                      <span>R3,000.00</span>
                    </div>
                  )}

                  {/* Dynamic toggle of additional completed plumbing services */}
                  {additionalRepairs.length > 0 && (
                    <div className="pt-2 border-t border-dashed border-slate-200">
                      <label className="flex items-center space-x-2 cursor-pointer pb-1.5">
                        <input
                          type="checkbox"
                          checked={addExtraRepairs}
                          onChange={(e) => setAddExtraRepairs(e.target.checked)}
                          className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                        />
                        <span className="text-[11px] font-bold text-slate-700">Include On-Site Repair Charges</span>
                      </label>

                      {addExtraRepairs && (
                        <div className="pl-6 space-y-1 text-[11px] text-slate-500">
                          {additionalRepairs.map((rep, idx) => (
                            <div key={idx} className="flex justify-between italic">
                              <span>• {rep.name}:</span>
                              <span>R{rep.cost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 text-slate-900 font-display">
                  <span className="text-sm font-black uppercase">Outstanding Total:</span>
                  <strong className="text-lg font-black text-red-600">
                    R{getFinalTotal().toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-full">
                {[
                  { id: 'card', label: 'Credit Card', icon: CreditCard },
                  { id: 'eft', label: 'Instant EFT', icon: ShieldCheck },
                  { id: 'scan', label: 'Scan To Pay', icon: Smartphone }
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
                        paymentMethod === m.id
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Form Renderers */}
              <AnimatePresence mode="wait">
                {paymentMethod === 'card' && (
                  <motion.form
                    key="card-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={startPaymentProcess}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sipho Khumalo"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:border-red-600 focus:bg-white transition font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        maxLength={19}
                        placeholder="4000 1234 5678 9010"
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:border-red-600 focus:bg-white transition font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Expiry Date (MM/YY)
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="12/28"
                          value={cardExpiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:border-red-600 focus:bg-white transition font-mono font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          CVV/CVC Code
                        </label>
                        <input
                          type="password"
                          maxLength={3}
                          placeholder="***"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none focus:border-red-600 focus:bg-white transition font-mono font-bold"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-full hover:bg-slate-800 transition shadow-md hover:shadow-lg mt-6 text-sm"
                    >
                      Authorize Card: R{getFinalTotal().toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </button>
                  </motion.form>
                )}

                {paymentMethod === 'eft' && (
                  <motion.form
                    key="eft-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={startPaymentProcess}
                    className="space-y-4"
                  >
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Choose South African Bank
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {banks.map((b) => (
                        <div
                          key={b.name}
                          onClick={() => setSelectedBank(b.name)}
                          className={`cursor-pointer border-2 rounded-xl p-3 flex items-center justify-between transition-all duration-200 ${
                            selectedBank === b.name
                              ? 'border-slate-900 bg-slate-50/50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`w-3.5 h-3.5 rounded-full ${b.logoBg} shrink-0`} />
                            <span className="text-xs font-bold text-slate-800">{b.name}</span>
                          </div>
                          {selectedBank === b.name && (
                            <div className="w-2.5 h-2.5 bg-slate-900 rounded-full" />
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-slate-500 italic pt-1 leading-relaxed">
                      * You will be safely connected with <strong>{selectedBank}</strong> to authorize an instant electronic funds transfer. No bank credentials will be stored.
                    </p>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-full hover:bg-slate-800 transition shadow-md hover:shadow-lg mt-4 text-sm"
                    >
                      Proceed to {selectedBank} Portal
                    </button>
                  </motion.form>
                )}

                {paymentMethod === 'scan' && (
                  <motion.div
                    key="scan-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 text-center py-2"
                  >
                    <div className="mx-auto w-36 h-36 bg-slate-100 rounded-2xl border-2 border-slate-300 p-2.5 flex items-center justify-center relative">
                      {/* Fake QR representation */}
                      <svg className="w-full h-full text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125v-3.75zM3.75 14.25c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 4.875c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 14.25c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 01-1.125-1.125v-3.75z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h.008v.008H9V9zM9 15h.008v.008H9V15zM15 9h.008v.008H15V9zM15 15h.008v.008H15V15z" />
                      </svg>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800">Scan to Pay via SnapScan / Zapper</span>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Open your SnapScan, Zapper, or mobile banking application and scan the QR code to clear the billing.
                      </p>
                    </div>

                    <button
                      onClick={startPaymentProcess}
                      className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-full hover:bg-slate-800 transition shadow-md hover:shadow-lg mt-4 text-sm flex items-center justify-center space-x-1.5"
                    >
                      <span>Simulate QR Code Scan</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Secure SSL Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-center space-x-2 text-[9px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>PCI-DSS Secured 256-bit AES SSL Encrypted Network</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
