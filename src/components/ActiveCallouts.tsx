import React from 'react';
import { CalloutRequest, JobCategory } from '../types';
import { PLUMBING_CATEGORIES } from '../data';
import { Clock, Truck, ShieldCheck, FileText, CheckCircle2, RefreshCw, XCircle, MessageSquare } from 'lucide-react';

interface ActiveCalloutsProps {
  callouts: CalloutRequest[];
  onViewInvoice: (callout: CalloutRequest) => void;
  onSimulateProgress: (calloutId: string) => void;
  onCancelCallout: (calloutId: string) => void;
  onOpenChat?: (calloutId: string) => void;
}

export default function ActiveCallouts({
  callouts,
  onViewInvoice,
  onSimulateProgress,
  onCancelCallout,
  onOpenChat,
}: ActiveCalloutsProps) {
  if (callouts.length === 0) return null;

  // Find corresponding category details
  const getCategoryDetails = (catId: string): JobCategory => {
    return PLUMBING_CATEGORIES.find(c => c.id === catId) || PLUMBING_CATEGORIES[0];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Dispatch': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'En Route': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case 'Pending Dispatch': return 0;
      case 'En Route': return 1;
      case 'In Progress': return 2;
      case 'Completed': return 3;
      default: return -1;
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-800 underline decoration-red-200 underline-offset-8">
            Emergency Dispatch Board
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Real-time tracking of active rapid-response plumbing crews.
          </p>
        </div>
        <span className="bg-red-100 text-red-800 font-mono text-xs font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
          <span className="h-2 w-2 bg-red-600 rounded-full animate-ping mr-1" />
          <span>{callouts.filter(c => c.status !== 'Completed' && c.status !== 'Cancelled').length} Active</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {callouts.map((request) => {
          const category = getCategoryDetails(request.jobCategoryId);
          const currentStep = getStatusStepIndex(request.status);

          return (
            <div
              key={request.id}
              className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl p-6 hover:border-slate-300 transition flex flex-col md:flex-row gap-6"
            >
              {/* Category Thumbnail and Basic Info */}
              <div className="w-full md:w-1/4 shrink-0">
                <div className="relative rounded-xl overflow-hidden aspect-video md:aspect-square h-full min-h-[140px] bg-slate-100">
                  <img
                    src={category.imageUrl}
                    alt={category.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Tracking and Details */}
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display font-extrabold text-lg text-slate-900">
                      Emergency {category.title} Crew
                    </h3>
                    <span className="font-mono text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded">
                      Ref: {request.invoiceNumber}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 italic line-clamp-2">
                    &ldquo;{request.issueDescription}&rdquo;
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div>
                      <span className="font-semibold text-slate-700">Dispatch Location:</span>
                      <p className="text-slate-500 mt-0.5 truncate">{request.clientAddress}, {request.clientCity}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Calculated Invoice Billing:</span>
                      <p className="text-slate-900 font-bold mt-0.5">
                        R{request.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        {request.surcharge > 0 && <span className="text-[10px] text-red-600 font-normal block">(R1000 + R3000 surcharge)</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Timeline (Steppers) */}
                {request.status !== 'Cancelled' && (
                  <div className="relative pt-4 pb-2">
                    <div className="absolute top-7 left-5 right-5 sm:left-10 sm:right-10 h-0.5 bg-slate-200 -z-10" />
                    
                    {/* Active colored line */}
                    {currentStep > 0 && (
                      <div 
                        className="absolute top-7 left-5 sm:left-10 h-0.5 bg-red-600 -z-10 transition-all duration-500" 
                        style={{ width: `${(currentStep / 3) * 100}%`, maxWidth: 'calc(100% - 40px)' }}
                      />
                    )}

                    <div className="flex justify-between text-center">
                      {[
                        { label: 'Dispatched', desc: 'Crew Assigned', icon: Clock },
                        { label: 'En Route', desc: 'Driving to Property', icon: Truck },
                        { label: 'In Progress', desc: 'Repairing Issue', icon: RefreshCw },
                        { label: 'Completed', desc: 'Task Finalized', icon: ShieldCheck }
                      ].map((step, idx) => {
                        const StepIcon = step.icon;
                        const isPast = idx < currentStep;
                        const isCurrent = idx === currentStep;
                        
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center">
                            <div 
                              className={`h-7 w-7 rounded-full flex items-center justify-center border-2 transition ${
                                isPast ? 'bg-red-600 border-red-600 text-white' : 
                                isCurrent ? 'bg-white border-red-600 text-red-600 font-bold animate-pulse' : 
                                'bg-white border-slate-300 text-slate-400'
                              }`}
                            >
                              <StepIcon className={`h-3.5 w-3.5 ${isCurrent && idx === 2 ? 'animate-spin' : ''}`} />
                            </div>
                            <span className={`text-[10px] font-bold mt-1.5 leading-none ${isCurrent ? 'text-red-600' : 'text-slate-700'}`}>
                              {step.label}
                            </span>
                            <span className="hidden sm:inline text-[9px] text-slate-400 mt-0.5 leading-none">
                              {step.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interactive Simulator and Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap gap-2">
                    {/* Simulator Button */}
                    {request.status !== 'Completed' && request.status !== 'Cancelled' && (
                      <button
                        onClick={() => onSimulateProgress(request.id)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-full text-xs flex items-center space-x-1.5 transition"
                        title="Simulate Response Progress"
                      >
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Simulate Response Progress</span>
                      </button>
                    )}

                    {/* Chat with Plumber Button */}
                    {request.status !== 'Completed' && request.status !== 'Cancelled' && (
                      <button
                        onClick={() => onOpenChat && onOpenChat(request.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-full text-xs flex items-center space-x-1.5 border border-red-100 transition"
                        title="Chat with assigned plumber"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-red-600 animate-pulse" />
                        <span>Chat with Plumber</span>
                      </button>
                    )}

                    {/* Cancel Button */}
                    {request.status === 'Pending Dispatch' && (
                      <button
                        onClick={() => onCancelCallout(request.id)}
                        className="text-red-600 hover:bg-red-50 font-bold px-3 py-1.5 rounded-full text-xs flex items-center space-x-1.5 border border-red-100 transition"
                      >
                        <XCircle className="h-3 w-3" />
                        <span>Cancel Call-out</span>
                      </button>
                    )}
                  </div>

                  {/* View Invoice button */}
                  <button
                    onClick={() => onViewInvoice(request)}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-bold px-4 py-2 rounded-full text-xs flex items-center space-x-1.5 transition shadow-sm ml-auto"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>View & Print Tax Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
