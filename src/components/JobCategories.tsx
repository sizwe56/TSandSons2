import React, { useState } from 'react';
import { JobCategory, User } from '../types';
import { PLUMBING_CATEGORIES } from '../data';
import { ChevronDown, ChevronUp, AlertCircle, Wrench, Check, Clock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface JobCategoriesProps {
  onSelectCategory: (category: JobCategory) => void;
  currentUser: User | null;
}

export default function JobCategories({
  onSelectCategory,
  currentUser,
}: JobCategoriesProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    if (expandedCategoryId === id) {
      setExpandedCategoryId(null);
    } else {
      setExpandedCategoryId(id);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display font-black text-2xl text-slate-800 underline decoration-red-200 underline-offset-8">
          Emergency Services Catalog
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Select an emergency category below for automated pricing and rapid fleet dispatch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLUMBING_CATEGORIES.map((category) => {
          const isExpanded = expandedCategoryId === category.id;

          return (
            <div
              key={category.id}
              className={`bg-white rounded-3xl border-2 border-slate-200 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col justify-between ${
                isExpanded ? 'ring-4 ring-red-500/10 border-red-500/80' : 'hover:border-slate-300'
              }`}
            >
              <div>
                {/* Image & Overlay */}
                <div className="relative aspect-video w-full bg-slate-100 overflow-hidden group">
                  <img
                    src={category.imageUrl}
                    alt={category.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                  
                  {/* Quick Badge */}
                  <span className="absolute bottom-3 left-3 bg-red-600 text-white font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md">
                    R1000 Call-out
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                      {category.title}
                    </h3>
                    <button
                      onClick={() => toggleExpand(category.id)}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                      title={isExpanded ? "Collapse typical issues" : "Expand typical issues"}
                    >
                      {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {category.description}
                  </p>

                  {/* Typical Issues checklist toggle */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Typical Problems We Repair:
                          </span>
                          <ul className="space-y-1.5">
                            {category.typicalIssues.map((issue, index) => (
                              <li key={index} className="flex items-start space-x-1.5 text-[11px] text-slate-700">
                                <Check className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between gap-4">
                <button
                  onClick={() => toggleExpand(category.id)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  {isExpanded ? 'Hide typical issues' : 'View typical issues'}
                </button>
                
                <button
                  id={`request-${category.id}`}
                  onClick={() => onSelectCategory(category)}
                  className="bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs px-4 py-2 rounded-full transition duration-200 flex items-center space-x-1 shadow-sm"
                >
                  <Wrench className="h-3 w-3" />
                  <span>Request Crew</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left mt-8">
        <div className="bg-red-600 text-white p-2.5 rounded-xl">
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-display font-extrabold text-sm text-slate-900">
            Rapid Response Service Agreement
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Every dispatch features a Pretoria localized qualified plumber, full diagnostic report, compliance certification, and clear pricing structure. R1,000 baseline Pretoria Gauteng fee or R1,000 + R3,000 national travel surcharge applies.
          </p>
        </div>
      </div>
    </section>
  );
}
