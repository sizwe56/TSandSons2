import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Lock, ShieldCheck, AlertCircle, X, Smartphone, Loader2, CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react';
import { CalloutRequest } from '../types';

interface PaymentModalProps {
  request: CalloutRequest;
  onClose: () => void;
  onPaymentSuccess: (method: string, totalAmount: number, additionalCosts: number) => void;
}

export default function PaymentModal({ request, onClose, onPaymentSuccess }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'capitec' | 'card' | 'eft' | 'scan'>('capitec');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  // Form states
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('FNB');

  const generateLegalPDFBlob = (requestData: Partial<CalloutRequest>) => {
    const content = `%PDF-1.4
%
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 595 842] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 1500 >>
stream
BT
/F1 18 Tf
50 800 Td
(T&S RAPID-RESPONSE PLUMBING SERVICE AGREEMENT) Tj
/F1 12 Tf
0 -30 Td
(Invoice Number: ${requestData.invoiceNumber || 'N/A'}) Tj
0 -20 Td
(Created Date: ${requestData.createdAt || new Date().toISOString()}) Tj
0 -20 Td
(Client Name: ${requestData.clientName || 'N/A'}) Tj
0 -20 Td
(Property Location: ${requestData.clientAddress || 'N/A'}, ${requestData.clientCity || 'N/A'}, ${requestData.clientProvince || 'N/A'}) Tj
0 -30 Td
/F1 14 Tf
(1. SERVICE CLASSIFICATION AND BILLING) Tj
/F2 10 Tf
0 -15 Td
(Service Level Chosen: ${requestData.isEmergency ? 'EMERGENCY DISPATCH' : 'STANDARD WORK ORDER'}) Tj
0 -15 Td
(Expected Response Window: ${requestData.responsePeriod || 'N/A'}) Tj
0 -15 Td
(Base Call-out Fee: R${requestData.baseFee || '1,000.00'}) Tj
0 -15 Td
(Location Surcharge: R${requestData.surcharge || '0.00'}) Tj
0 -15 Td
(Grand Total Dispatch Amount: R${requestData.totalAmount || '1,000.00'}) Tj
0 -30 Td
/F1 14 Tf
(2. CONSUMER PROTECTION ACT (CPA) SECTION 54 AND POPIA DISCLAIMER) Tj
/F2 10 Tf
0 -15 Td
(Pursuant to Section 54 of the South African Consumer Protection Act, 68 of 2008, emergency dispatches) Tj
0 -15 Td
(are classified as instant, time-critical service solutions. Due to the immediate deployment of vehicles,) Tj
0 -15 Td
(tools, and specialized personnel, emergency dispatch call-out fees are strictly NON-REFUNDABLE once) Tj
0 -15 Td
(accepted by a certified plumber. Standard services carry a standard 48-hour response window and are) Tj
0 -15 Td
(subject to general standard cancellation and refund policies.) Tj
0 -20 Td
(All client personal identifiable information (PII) is handled in strict compliance with the Protection) Tj
0 -15 Td
(of Personal Information Act (POPIA), Act 4 of 2013. Client data is hidden from non-participating actors) Tj
0 -15 Td
(and is only unlocked for the assigned plumber upon formal dispatch confirmation.) Tj
0 -30 Td
/F1 14 Tf
(3. CLIENT SIGN-OFF AND PROJECT COMPLETION) Tj
/F2 10 Tf
0 -15 Td
(Plumbers will remain active and locked into the active state until the client performs a digital sign-off,) Tj
0 -15 Td
(submitting rating scores and surveys. Any subsequent queries or adjustments must be recorded on) Tj
0 -15 Td
(the rapid-response ledger.) Tj
0 -40 Td
(___________________________                         ___________________________) Tj
0 -12 Td
(Resident Client Signature                           Authorized T&S Plumber Sign-off) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000018 00000 n 
0000000067 00000 n 
0000000121 00000 n 
0000000227 00000 n 
0000000354 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
1950
%%EOF`;
    return new Blob([content], { type: 'application/pdf' });
  };

  const handleDownloadLegalPDF = () => {
    const blob = generateLegalPDFBlob(request);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rapid_Response_Plumbing_Agreement_${request.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
    if (request.status === 'COMPLETED' || request.status === 'IN_PROGRESS') {
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
    if (request.isEmergency && !legalAccepted) {
      alert("❌ You must explicitly accept the emergency non-refundable terms and download the SLA Agreement PDF before proceeding to secure checkout.");
      return;
    }
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

              {request.isEmergency && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl space-y-3">
                  <div className="flex items-start space-x-2">
                    <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-800 text-[11px] block">EMERGENCY DISPATCH WARRANTY DISCLAIMER</span>
                      <p className="leading-relaxed text-[10px] text-amber-700 mt-0.5">
                        Pursuant to Consumer Protection Act (CPA) Section 54, instant emergency mobilizations are final, critical, and <strong>strictly non-refundable</strong>.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      id="download-payment-pdf-btn"
                      onClick={handleDownloadLegalPDF}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1 transition flex-1"
                    >
                      <span>📄 Pre-Download Legal SLA PDF</span>
                    </button>

                    <label className="flex items-center space-x-2 cursor-pointer bg-white px-2.5 py-1.5 border border-amber-200 rounded-lg hover:bg-amber-50 transition flex-1">
                      <input
                        type="checkbox"
                        checked={legalAccepted}
                        onChange={(e) => setLegalAccepted(e.target.checked)}
                        className="h-3.5 w-3.5 rounded text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-[9.5px] font-bold text-amber-900">Accept Non-Refundable SLA</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-full">
                {[
                  { id: 'capitec', label: 'Capitec', icon: ShieldCheck },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'eft', label: 'EFT', icon: Lock },
                  { id: 'scan', label: 'Scan', icon: Smartphone }
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`flex items-center justify-center space-x-1 py-2 px-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
                        paymentMethod === m.id
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Form Renderers */}
              <AnimatePresence mode="wait">
                {paymentMethod === 'capitec' && (
                  <motion.div
                    key="capitec-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Capitec Bank Info Banner */}
                    <div className="bg-gradient-to-r from-teal-550 to-teal-650 bg-teal-600 text-white rounded-2xl p-4 border border-teal-500 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-teal-100">Preferred Partner Portal</span>
                        <span className="bg-white/20 text-[9px] font-bold px-2 py-0.5 rounded-full">Instant EFT</span>
                      </div>
                      <h4 className="font-display font-black text-base">Capitec Bank PayMe</h4>
                      <p className="text-[11px] text-teal-50/90 leading-relaxed">
                        Settle your call-out or repair invoice instantly via Capitec's safe peer-to-peer payment gateway.
                      </p>
                    </div>

                    {/* Step-by-step Instructions */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
                      <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">How to pay:</span>
                      
                      <ul className="space-y-2.5 text-slate-600 text-[11px]">
                        <li className="flex items-start">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mr-2 mt-0.5">1</span>
                          <span>Click the secure button below to launch the official Capitec PayMe portal in a new tab.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mr-2 mt-0.5">2</span>
                          <span>Enter your banking credentials or scan the screen to authorize the exact amount of <strong>R{getFinalTotal().toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</strong>.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mr-2 mt-0.5">3</span>
                          <span>Once finished, click <strong>Confirm Settle</strong> below to automatically update your invoice and notify dispatch.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Direct External Link to Capitec PayMe */}
                    <div className="pt-2">
                      <a
                        href="https://pay.capitecbank.co.za/payme/2QI6HM"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-3.5 px-4 rounded-full flex items-center justify-center space-x-2 transition shadow-md hover:shadow-lg text-sm text-center"
                      >
                        <span>Open Capitec PayMe Portal</span>
                        <ExternalLink className="w-4 h-4 shrink-0" />
                      </a>
                      <span className="text-[10px] text-slate-400 text-center block mt-1.5 font-mono">
                        Secure Link: pay.capitecbank.co.za/payme/2QI6HM
                      </span>
                    </div>

                    {/* Simulation Confirmation Button */}
                    <button
                      type="button"
                      disabled={request.isEmergency && !legalAccepted}
                      onClick={() => {
                        setIsProcessing(true);
                        setProcessingStatus('Verifying transaction on Capitec Network...');
                        setTimeout(() => {
                          setIsProcessing(false);
                          setPaymentSuccess(true);
                          setTimeout(() => {
                            onPaymentSuccess(
                              'Capitec PayMe (Instant)',
                              getFinalTotal(),
                              getExtraCostTotal()
                            );
                          }, 1500);
                        }, 1800);
                      }}
                      className={`w-full border-2 border-slate-900 text-slate-900 font-black py-3 rounded-full hover:bg-slate-50 transition text-sm flex items-center justify-center space-x-1.5 mt-2 ${
                        request.isEmergency && !legalAccepted ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span>I Have Paid (Confirm Settle)</span>
                    </button>
                  </motion.div>
                )}

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
                      disabled={request.isEmergency && !legalAccepted}
                      className={`w-full bg-slate-900 text-white font-bold py-3.5 rounded-full hover:bg-slate-800 transition shadow-md hover:shadow-lg mt-6 text-sm ${
                        request.isEmergency && !legalAccepted ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
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
                      disabled={request.isEmergency && !legalAccepted}
                      className={`w-full bg-slate-900 text-white font-bold py-3.5 rounded-full hover:bg-slate-800 transition shadow-md hover:shadow-lg mt-4 text-sm ${
                        request.isEmergency && !legalAccepted ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
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
                      disabled={request.isEmergency && !legalAccepted}
                      className={`w-full bg-slate-900 text-white font-bold py-3.5 rounded-full hover:bg-slate-800 transition shadow-md hover:shadow-lg mt-4 text-sm flex items-center justify-center space-x-1.5 ${
                        request.isEmergency && !legalAccepted ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
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
