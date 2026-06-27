import React from 'react';
import { User } from '../types';
import { Wrench, User as UserIcon, LogOut, ShieldAlert, CheckCircle, MapPin } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  currentUser: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}

export default function Header({
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenProfile,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-sm backdrop-blur-md bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          className="flex items-center space-x-2.5 cursor-pointer group" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          {/* Custom Logo Component */}
          <Logo size="sm" className="text-slate-900 group-hover:scale-105 transition-transform duration-200" />
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-display font-black tracking-tight text-slate-800 leading-none">
              PLUMB TS &amp; SONS
            </span>
            <span className="text-[9px] font-mono font-bold tracking-wider text-red-600 uppercase leading-none mt-1">
              • 24H EMERGENCY •
            </span>
          </div>
        </div>

        {/* Dynamic Area Indicator & User Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {currentUser ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Coverage Badge */}
              <div
                className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  currentUser.isPretoriaGauteng
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {currentUser.isPretoriaGauteng ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Pretoria Central (R1000 Call-out)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                    <span>Out-of-Area ({currentUser.province} R4000 Call-out)</span>
                  </>
                )}
              </div>

              {/* User Button */}
              <button
                id="header-profile-btn"
                onClick={onOpenProfile}
                className="flex items-center space-x-2 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition text-sm font-medium"
              >
                <UserIcon className="h-4 w-4 text-slate-500" />
                <span className="max-w-[100px] truncate mr-1">{currentUser.fullName.split(' ')[0]}</span>
                {currentUser.role === 'plumber' ? (
                  <span className="bg-red-100 text-red-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide leading-none shrink-0">
                    Plumber
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide leading-none shrink-0">
                    Client
                  </span>
                )}
              </button>

              {/* Logout Button */}
              <button
                id="header-logout-btn"
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                id="header-login-btn"
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 border border-slate-300 rounded-full text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Log In
              </button>
              <button
                id="header-register-btn"
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 border-2 border-slate-800 rounded-full text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Location Alert Banner */}
      {currentUser && (
        <div
          className={`md:hidden flex items-center justify-center space-x-1.5 px-4 py-1 text-[11px] font-medium border-t ${
            currentUser.isPretoriaGauteng
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-100'
          }`}
        >
          <MapPin className="h-3 w-3" />
          <span>
            {currentUser.isPretoriaGauteng
              ? 'Pretoria, GP: Standard R1,000 call-out'
              : `${currentUser.city}, ${currentUser.province}: R4,000 out-of-area call-out`}
          </span>
        </div>
      )}
    </header>
  );
}
