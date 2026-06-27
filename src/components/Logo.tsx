import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = 'text-slate-900', size = 'md' }: LogoProps) {
  // Determine dimensions based on size presets
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-36 h-36',
    xl: 'w-56 h-56'
  };

  return (
    <div className={`flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 160 160"
        className="w-full h-full fill-none stroke-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ==================== 1. THE TOP TAP ==================== */}
        {/* T-bar Handle */}
        <path
          d="M 68 18 L 92 18 C 94 18 94 22 92 22 L 68 22 C 66 22 66 18 68 18 Z"
          className="fill-current stroke-none"
        />
        {/* Tap neck/spindle */}
        <rect x="77" y="22" width="6" height="8" rx="0.5" className="fill-current stroke-none" />
        
        {/* Tap brass gland nut & body */}
        <path
          d="M 73 30 L 87 30 L 85 36 L 75 36 Z"
          className="fill-current stroke-none"
        />
        {/* Curved spout transition neck */}
        <path
          d="M 74 36 C 74 41, 86 41, 86 36 L 86 42 L 74 42 Z"
          className="fill-current stroke-none"
        />

        {/* ==================== 2. THE PIPE FRAME ==================== */}
        {/* Top T-junction under the tap */}
        <rect x="72" y="42" width="16" height="10" rx="1.5" className="fill-current stroke-none" />
        
        {/* Top horizontal pipes (left & right of T-junction) */}
        <rect x="36" y="45" width="36" height="5" className="fill-current stroke-none" />
        <rect x="88" y="45" width="36" height="5" className="fill-current stroke-none" />
        
        {/* Pipe joint collars (collars on the horizontal pipe segments) */}
        <rect x="52" y="43" width="4" height="9" rx="0.5" className="fill-current stroke-none" />
        <rect x="104" y="43" width="4" height="9" rx="0.5" className="fill-current stroke-none" />

        {/* Top-Left Elbow Joint (angled 45 & 90) */}
        <path
          d="M 36 45 L 30 45 C 27 45, 25 47, 25 50 L 25 56"
          className="stroke-current stroke-[5] stroke-linecap-round stroke-linejoin-round"
        />
        <rect x="22" y="52" width="11" height="4" rx="0.5" className="fill-current stroke-none" />
        {/* Styled diagonal fitting sleeve */}
        <path d="M 33 42 L 24 51 L 28 55 L 37 46 Z" className="fill-current stroke-none" />

        {/* Top-Right Elbow Joint */}
        <path
          d="M 124 45 L 130 45 C 133 45, 135 47, 135 50 L 135 56"
          className="stroke-current stroke-[5] stroke-linecap-round stroke-linejoin-round"
        />
        <rect x="127" y="52" width="11" height="4" rx="0.5" className="fill-current stroke-none" />

        {/* Vertical Left Pipe */}
        <rect x="23" y="56" width="4" height="56" className="fill-current stroke-none" />
        {/* Left vertical collar/coupling */}
        <rect x="21" y="82" width="8" height="4" rx="0.5" className="fill-current stroke-none" />

        {/* Vertical Right Pipe */}
        <rect x="133" y="56" width="4" height="56" className="fill-current stroke-none" />
        {/* Right vertical collar/coupling */}
        <rect x="131" y="82" width="8" height="4" rx="0.5" className="fill-current stroke-none" />

        {/* Bottom-Left Elbow Joint */}
        <path
          d="M 25 112 L 25 118 C 25 121, 27 123, 30 123 L 36 123"
          className="stroke-current stroke-[5] stroke-linecap-round stroke-linejoin-round"
        />
        <rect x="22" y="112" width="11" height="4" rx="0.5" className="fill-current stroke-none" />
        {/* Diagonal sleeve accent */}
        <path d="M 24 117 L 33 126 L 37 122 L 28 113 Z" className="fill-current stroke-none" />

        {/* Bottom-Right Elbow Joint */}
        <path
          d="M 135 112 L 135 118 C 135 121, 133 123, 130 123 L 124 123"
          className="stroke-current stroke-[5] stroke-linecap-round stroke-linejoin-round"
        />
        <rect x="127" y="112" width="11" height="4" rx="0.5" className="fill-current stroke-none" />

        {/* Bottom horizontal pipes */}
        <rect x="36" y="121" width="36" height="5" className="fill-current stroke-none" />
        <rect x="88" y="121" width="36" height="5" className="fill-current stroke-none" />
        {/* Bottom center joint coupling with dynamic U-bend styling */}
        <rect x="72" y="119" width="16" height="9" rx="1" className="fill-current stroke-none" />
        <path d="M 72 123 C 76 127, 84 127, 88 123" className="stroke-current stroke-[3] fill-none" />

        {/* Bottom pipe joint collars */}
        <rect x="52" y="119" width="4" height="9" rx="0.5" className="fill-current stroke-none" />
        <rect x="104" y="119" width="4" height="9" rx="0.5" className="fill-current stroke-none" />


        {/* ==================== 3. TYPOGRAPHY ==================== */}
        {/* "PLUMB" Title */}
        <text
          x="80"
          y="81"
          textAnchor="middle"
          className="fill-current stroke-none font-sans font-black tracking-tighter"
          style={{ fontSize: '24px', fontWeight: 950 }}
        >
          PLUMB
        </text>

        {/* Left wing line for TS */}
        <line
          x1="35"
          y1="94"
          x2="52"
          y2="94"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* "TS &" Center Row */}
        <text
          x="80"
          y="99"
          textAnchor="middle"
          className="fill-current stroke-none font-sans font-black tracking-wide"
          style={{ fontSize: '13px', fontWeight: 900 }}
        >
          TS &amp;
        </text>

        {/* Right wing line for TS */}
        <line
          x1="108"
          y1="94"
          x2="125"
          y2="94"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* "SONS" Bottom Row */}
        <text
          x="80"
          y="114"
          textAnchor="middle"
          className="fill-current stroke-none font-sans font-black tracking-[0.2em]"
          style={{ fontSize: '14px', fontWeight: 900 }}
        >
          SONS
        </text>
      </svg>
    </div>
  );
}
