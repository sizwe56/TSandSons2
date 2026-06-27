import React from 'react';
import { CalloutRequest } from '../types';
import { X, Printer, ShieldCheck, CreditCard, Building, Info, Calendar } from 'lucide-react';
import Logo from './Logo';

interface InvoiceDetailProps {
  isOpen: boolean;
  onClose: () => void;
  request: CalloutRequest | null;
  onPayInvoice: (requestId: string) => void;
}

export default function InvoiceDetail({
  isOpen,
  onClose,
  request,
  onPayInvoice,
}: InvoiceDetailProps) {
  if (!isOpen || !request) return null;

  const isPaid = request.isPaid || request.status === 'Completed';
  const additionalCost = request.additionalAmount || 0;
  const billingTotal = request.totalAmount + additionalCost;
  
  // Calculate VAT (15% in South Africa, inclusive)
  const vatAmount = (billingTotal * 15) / 115;
  const subtotalExclVat = billingTotal - vatAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl shadow-high w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 border-2 border-slate-200 flex flex-col">
        {/* Actions bar */}
        <div className="sticky top-0 bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between z-20">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            South African Tax Invoice
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body (printable-invoice class for @media print) */}
        <div className="p-8 space-y-6 printable-invoice">
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
            <div className="flex items-start space-x-3">
              <Logo size="md" className="text-slate-900 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-red-600 text-white font-mono font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">
                    • 24H EMERGENCY •
                  </span>
                  <span className="font-display font-black text-xl tracking-tight text-slate-900">
                    PLUMB TS &amp; SONS (PTY) LTD
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  24/7 Rapid Response Emergency Plumbers<br />
                  156 Francis Baard St, Pretoria Central, 0002<br />
                  Gauteng, South Africa<br />
                  <span className="font-mono">VAT Reg No: 4910293847</span>
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-red-600 uppercase tracking-widest block">
                TAX INVOICE
              </span>
              <h4 className="font-mono font-bold text-lg text-slate-900 mt-1">
                {request.invoiceNumber}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Date: {new Date(request.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}<br />
                Due Date: Immediate / C.O.D
              </p>
            </div>
          </div>

          {/* Client Details Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-slate-200 pb-6">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-2">
                Billed To (Resident Details)
              </span>
              <p className="font-semibold text-sm text-slate-900">{request.clientName}</p>
              <p className="text-slate-600 mt-1 leading-relaxed">
                {request.clientAddress}<br />
                {request.clientCity}, {request.clientProvince}<br />
                South Africa
              </p>
              <p className="text-slate-500 mt-1.5 font-mono">{request.clientPhone}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Dispatch Region Tier
                </span>
                <p className="font-semibold text-slate-800 flex items-center">
                  <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${request.surcharge === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {request.surcharge === 0 ? 'Gauteng (Pretoria Central)' : 'Out-of-Area Surcharge Tier'}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 flex justify-between items-center">
                <span className="font-bold text-slate-700">Payment Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {isPaid ? `PAID via ${request.paymentMethod || 'Secure Gateway'}` : 'UNPAID / C.O.D'}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-4">
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-xs">
              Service Breakdown
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 uppercase font-semibold">
                    <th className="py-2.5">Description of Works</th>
                    <th className="py-2.5 text-center">Qty</th>
                    <th className="py-2.5 text-right">Unit Price</th>
                    <th className="py-2.5 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3">
                      <span className="font-bold text-slate-900 block">Standard 24/7 Rapid Emergency Call-out Fee</span>
                      <span className="text-slate-500 text-[10px] block mt-0.5">Crew dispatch, initial emergency assessment, and first hour diagnostics</span>
                    </td>
                    <td className="py-3 text-center font-mono">1</td>
                    <td className="py-3 text-right font-mono text-slate-700">R1,000.00</td>
                    <td className="py-3 text-right font-mono text-slate-900">R1,000.00</td>
                  </tr>

                  {request.surcharge > 0 && (
                    <tr>
                      <td className="py-3">
                        <span className="font-bold text-red-600 block">Out-of-Province Travel Surcharge</span>
                        <span className="text-slate-500 text-[10px] block mt-0.5">Long-distance rapid travel to {request.clientProvince} (Calculated 1,000 + 3,000)</span>
                      </td>
                      <td className="py-3 text-center font-mono">1</td>
                      <td className="py-3 text-right font-mono text-slate-700">R3,000.00</td>
                      <td className="py-3 text-right font-mono text-red-600 font-semibold">R3,000.00</td>
                    </tr>
                  )}

                  {additionalCost > 0 && (
                    <tr>
                      <td className="py-3">
                        <span className="font-bold text-slate-900 block">On-Site Emergency Technical Repairs</span>
                        <span className="text-slate-500 text-[10px] block mt-0.5">{request.additionalAmountDetails || 'Additional materials and technical labor on site'}</span>
                      </td>
                      <td className="py-3 text-center font-mono">1</td>
                      <td className="py-3 text-right font-mono text-slate-700">R{additionalCost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right font-mono text-slate-900 font-semibold">R{additionalCost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Totals block */}
          <div className="flex flex-col items-end pt-4 border-t border-slate-200">
            <div className="w-full sm:w-1/2 space-y-1.5 text-xs text-slate-600 font-mono">
              <div className="flex justify-between">
                <span>Subtotal (Excl. VAT):</span>
                <span>R{subtotalExclVat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (15% inclusive):</span>
                <span>R{vatAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
                <span className="font-sans">Grand Total (Incl. VAT):</span>
                <span className="text-red-600">R{billingTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Banking / EFT block */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800 mb-2">
              <Building className="h-4 w-4 text-slate-600" />
              <span>EFT Payment Remittance Details</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Bank</span>
                <strong className="text-slate-700">FNB South Africa</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Account Number</span>
                <strong className="text-slate-700 font-mono">62901928374</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Branch Code</span>
                <strong className="text-slate-700 font-mono">250655</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Payment Ref</span>
                <strong className="text-red-600 font-mono">{request.invoiceNumber}</strong>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic mt-2">
              * Immediate payment is required on site upon completion of emergency works. Proof of payment can be sent to dispatch@plumb-tsandsons.co.za.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        {!request.isPaid && request.status !== 'Cancelled' && (
          <div className="sticky bottom-0 bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between z-20">
            <div className="flex items-center space-x-2 text-xs text-amber-800">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Secure gateway authorization compiles immediate South African Tax Remittance.</span>
            </div>
            <button
              onClick={() => onPayInvoice(request.id)}
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-5 py-2.5 rounded-full text-xs flex items-center space-x-2 transition shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 duration-150"
            >
              <CreditCard className="h-4 w-4" />
              <span>Pay Online via Plumb-TS SecurePay</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
