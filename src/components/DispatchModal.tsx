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
  const [isEmergency, setIsEmergency] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Sync default selected category
  useEffect(() => {
    if (selectedCategory) {
      setCategoryId(selectedCategory.id);
    } else {
      setCategoryId(PLUMBING_CATEGORIES[0].id);
    }
    setDescription('');
    setError('');
    setIsEmergency(true);
    setTermsAccepted(false);
  }, [selectedCategory, isOpen]);

  if (!isOpen || !currentUser) return null;

  const currentCategory = PLUMBING_CATEGORIES.find(c => c.id === categoryId) || PLUMBING_CATEGORIES[0];

  // Pricing calculations
  const baseFee = 1000;
  const surcharge = currentUser.isPretoriaGauteng ? 0 : 3000;
  const totalAmount = baseFee + surcharge;

  const generateLegalPDFBlob = (request: Partial<CalloutRequest>) => {
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
(Invoice Number: ${request.invoiceNumber || 'N/A'}) Tj
0 -20 Td
(Created Date: ${request.createdAt || new Date().toISOString()}) Tj
0 -20 Td
(Client Name: ${request.clientName || 'N/A'}) Tj
0 -20 Td
(Property Location: ${request.clientAddress || 'N/A'}, ${request.clientCity || 'N/A'}, ${request.clientProvince || 'N/A'}) Tj
0 -30 Td
/F1 14 Tf
(1. SERVICE CLASSIFICATION AND BILLING) Tj
/F2 10 Tf
0 -15 Td
(Service Level Chosen: ${request.isEmergency ? 'EMERGENCY DISPATCH' : 'STANDARD WORK ORDER'}) Tj
0 -15 Td
(Expected Response Window: ${request.responsePeriod || 'N/A'}) Tj
0 -15 Td
(Base Call-out Fee: R${request.baseFee || '1,000.00'}) Tj
0 -15 Td
(Location Surcharge: R${request.surcharge || '0.00'}) Tj
0 -15 Td
(Grand Total Dispatch Amount: R${request.totalAmount || '1,000.00'}) Tj
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

  const handleDownloadPDF = (invoiceNum: string) => {
    const blob = generateLegalPDFBlob({
      invoiceNumber: invoiceNum,
      createdAt: new Date().toISOString(),
      clientName: currentUser?.fullName || '',
      clientAddress: `${currentUser?.streetAddress || ''}, ${currentUser?.suburb || ''}`,
      clientCity: currentUser?.city || '',
      clientProvince: currentUser?.province || '',
      isEmergency,
      responsePeriod: isEmergency ? 'Instant' : '48-hours',
      baseFee,
      surcharge,
      totalAmount
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rapid_Response_Plumbing_Contract_${invoiceNum}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmergency && !termsAccepted) {
      setError('You must accept the Rapid-Response Dispatch Terms and Conditions for Emergency Call-outs.');
      return;
    }

    // Description is optional for free clients/general users
    const finalDescription = description.trim() || 'No specific plumbing issues reported.';

    const invoiceNumber = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    const newRequest: CalloutRequest = {
      id: 'req_' + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      jobCategoryId: categoryId,
      issueDescription: finalDescription,
      projectName: currentCategory.title,
      projectDescription: description.trim(),
      status: 'OPEN',
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
      isEmergency,
      termsAccepted: isEmergency ? termsAccepted : true,
      responsePeriod: isEmergency ? 'Instant' : '48-hours',
      pdfUrl: `/docs/contracts/${invoiceNumber}.pdf`
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

          {/* Service Classification Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Service Response Tier
            </label>
            <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200 flex gap-2">
              <button
                type="button"
                id="select-emergency-service"
                onClick={() => {
                  setIsEmergency(true);
                  setError('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-display uppercase tracking-wide transition-all ${
                  isEmergency 
                    ? 'bg-red-600 text-white shadow-sm' 
                    : 'bg-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                ⚡ Emergency (Instant)
              </button>
              <button
                type="button"
                id="select-standard-service"
                onClick={() => {
                  setIsEmergency(false);
                  setError('');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-display uppercase tracking-wide transition-all ${
                  !isEmergency 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                🕒 Standard (48h Window)
              </button>
            </div>
          </div>

          {/* Legal Non-Refundability Warning Bar */}
          {isEmergency ? (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start space-x-2 animate-fade-in">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-800">CPA Section 54 Legal Disclaimer (Emergency)</span>
                <p className="leading-relaxed text-[11px] text-amber-700">
                  By selecting Emergency response, T&S dispatches vehicles and crews immediately. Due to instant mobilization, this service is <strong>strictly non-refundable</strong> once claimed by a Pretoria plumber.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-100 text-blue-900 rounded-xl text-xs flex items-start space-x-2 animate-fade-in">
              <CheckCircle className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-blue-800">Standard SLA Response Tier</span>
                <p className="leading-relaxed text-[11px] text-blue-700">
                  Standard dispatches are completed within 48 hours of assignment. Standard cancellations and refund policies apply prior to plumber arrival.
                </p>
              </div>
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex justify-between">
              <span>What is the plumbing emergency?</span>
              <span className="text-slate-400 normal-case font-normal">(Optional)</span>
            </label>
            <textarea
              id="dispatch-description"
              placeholder="e.g., Burst geyser spraying water from the ceiling, or water main line leaking in the garden (optional)."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 focus:bg-white transition resize-none"
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
                <span>Standard R1000 Call-out Fee:</span>
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

          {/* Terms Agreement Checkbox & Download PDF Contract Button */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              id="download-pre-arrival-pdf-btn"
              onClick={() => handleDownloadPDF('PRE-CONTRACT')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-200 transition flex items-center justify-center space-x-1.5"
            >
              <span>📄 Pre-Download SLA Legal Agreement PDF</span>
            </button>

            <label className="flex items-start space-x-2.5 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/50 transition">
              <input
                type="checkbox"
                id="dispatch-terms-checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-red-600 border-slate-300 focus:ring-red-500 cursor-pointer shrink-0"
                required={isEmergency}
              />
              <span className="text-[10.5px] text-slate-600 leading-relaxed">
                I accept the Rapid-Response SLA Terms and Conditions. I authorize Pretoria Rapid Plumbing to release my contact info to the assigned plumber in compliance with POPIA, and I acknowledge that emergency dispatches are <strong>strictly non-refundable</strong> once accepted by a plumber.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              id="confirm-dispatch-btn"
              type="submit"
              className="w-full bg-red-600 text-white font-display font-black py-3.5 rounded-full hover:bg-red-700 transition shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-base active:scale-[0.99]"
            >
              <Wrench className="h-5 w-5 animate-bounce" />
              <span>CONFIRM {isEmergency ? 'EMERGENCY' : 'STANDARD'} DISPATCH</span>
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
