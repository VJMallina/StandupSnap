import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  showTagline?: boolean;
}

export default function AuthLayout({ children, showTagline = false }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Illustration and branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/30 via-transparent to-indigo-500/30 animate-pulse"></div>

        {/* Decorative floating blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Logo and branding */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-2xl">
                StandupSnap
              </h1>
            </div>
            {showTagline && (
              <p className="text-xl text-white/90 leading-relaxed drop-shadow-lg font-medium max-w-md mx-auto">
                Smarter standups. Better sprints.<br />
                Stronger teams — with AI-crafted snaps.
              </p>
            )}
          </div>

          {/* Vector illustration */}
          <div className="w-full max-w-lg">
            <StandupIllustration />
          </div>

          {/* Floating icons */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 opacity-20">
              <FloatingIcon delay="0s">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </FloatingIcon>
            </div>
            <div className="absolute top-1/3 right-1/4 opacity-20">
              <FloatingIcon delay="1s">
                <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </FloatingIcon>
            </div>
            <div className="absolute bottom-1/4 left-1/3 opacity-20">
              <FloatingIcon delay="2s">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </FloatingIcon>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6 sm:p-12">
        {/* Mobile logo for small screens */}
        <div className="lg:hidden absolute top-6 left-6">
          <div className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              StandupSnap
            </h1>
          </div>
        </div>

        <div className="w-full max-w-md mt-20 lg:mt-0">
          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating animation component
function FloatingIcon({ children, delay = "0s" }: { children: ReactNode; delay?: string }) {
  return (
    <div
      className="animate-float"
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}

// Vector illustration component
function StandupIllustration() {
  return (
    <svg
      viewBox="0 0 600 500"
      className="w-full drop-shadow-2xl"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background decorative elements */}
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#60A5FA', stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: '#A78BFA', stopOpacity: 0.3 }} />
        </linearGradient>
      </defs>

      {/* Large decorative circles */}
      <circle cx="300" cy="250" r="200" fill="url(#grad1)" opacity="0.3" />
      <circle cx="300" cy="250" r="150" fill="#ffffff" opacity="0.1" />

      {/* Main kanban board / screen */}
      <rect x="150" y="100" width="300" height="220" rx="12" fill="#ffffff" opacity="0.95" stroke="#E5E7EB" strokeWidth="2" />

      {/* Board columns */}
      <line x1="250" y1="130" x2="250" y2="300" stroke="#E5E7EB" strokeWidth="2" />
      <line x1="350" y1="130" x2="350" y2="300" stroke="#E5E7EB" strokeWidth="2" />

      {/* Column headers */}
      <text x="200" y="125" textAnchor="middle" fill="#6B7280" fontSize="14" fontWeight="bold">TODO</text>
      <text x="300" y="125" textAnchor="middle" fill="#6B7280" fontSize="14" fontWeight="bold">DOING</text>
      <text x="400" y="125" textAnchor="middle" fill="#6B7280" fontSize="14" fontWeight="bold">DONE</text>

      {/* Task cards - TODO column */}
      <rect x="165" y="140" width="70" height="45" rx="6" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="172" y1="155" x2="228" y2="155" stroke="#B45309" strokeWidth="2" opacity="0.4" />
      <line x1="172" y1="165" x2="220" y2="165" stroke="#B45309" strokeWidth="2" opacity="0.4" />

      <rect x="165" y="195" width="70" height="45" rx="6" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="172" y1="210" x2="228" y2="210" stroke="#B45309" strokeWidth="2" opacity="0.4" />
      <line x1="172" y1="220" x2="215" y2="220" stroke="#B45309" strokeWidth="2" opacity="0.4" />

      <rect x="165" y="250" width="70" height="45" rx="6" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="172" y1="265" x2="228" y2="265" stroke="#B45309" strokeWidth="2" opacity="0.4" />

      {/* Task cards - DOING column */}
      <rect x="265" y="140" width="70" height="45" rx="6" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
      <line x1="272" y1="155" x2="328" y2="155" stroke="#1E40AF" strokeWidth="2" opacity="0.4" />
      <line x1="272" y1="165" x2="320" y2="165" stroke="#1E40AF" strokeWidth="2" opacity="0.4" />

      <rect x="265" y="195" width="70" height="45" rx="6" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
      <line x1="272" y1="210" x2="328" y2="210" stroke="#1E40AF" strokeWidth="2" opacity="0.4" />

      {/* Task cards - DONE column */}
      <rect x="365" y="140" width="70" height="45" rx="6" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" />
      <line x1="372" y1="155" x2="428" y2="155" stroke="#065F46" strokeWidth="2" opacity="0.4" />
      <line x1="372" y1="165" x2="420" y2="165" stroke="#065F46" strokeWidth="2" opacity="0.4" />

      <rect x="365" y="195" width="70" height="45" rx="6" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" />
      <line x1="372" y1="210" x2="428" y2="210" stroke="#065F46" strokeWidth="2" opacity="0.4" />

      <rect x="365" y="250" width="70" height="45" rx="6" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.5" />
      <line x1="372" y1="265" x2="428" y2="265" stroke="#065F46" strokeWidth="2" opacity="0.4" />

      {/* Team members - bottom */}
      {/* Person 1 - Left */}
      <circle cx="120" cy="380" r="30" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="3" />
      <circle cx="120" cy="375" r="12" fill="#3B82F6" />
      <path d="M 105 390 Q 120 395 135 390" stroke="#3B82F6" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Person 2 - Center left */}
      <circle cx="220" cy="400" r="35" fill="#F3E8FF" stroke="#A78BFA" strokeWidth="3" />
      <circle cx="220" cy="395" r="14" fill="#A78BFA" />
      <path d="M 203 412 Q 220 418 237 412" stroke="#A78BFA" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Person 3 - Center right */}
      <circle cx="380" cy="400" r="35" fill="#FED7AA" stroke="#F59E0B" strokeWidth="3" />
      <circle cx="380" cy="395" r="14" fill="#F59E0B" />
      <path d="M 363 412 Q 380 418 397 412" stroke="#F59E0B" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Person 4 - Right */}
      <circle cx="480" cy="380" r="30" fill="#D1FAE5" stroke="#10B981" strokeWidth="3" />
      <circle cx="480" cy="375" r="12" fill="#10B981" />
      <path d="M 465 390 Q 480 395 495 390" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* AI sparkle icon */}
      <g transform="translate(500, 80)">
        <circle cx="0" cy="0" r="35" fill="#FEF3C7" opacity="0.5" />
        <path d="M 0 -18 L 4 -4 L 18 0 L 4 4 L 0 18 L -4 4 L -18 0 L -4 -4 Z" fill="#F59E0B" />
        <circle cx="0" cy="0" r="5" fill="#ffffff" />
        <text x="0" y="55" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">AI</text>
      </g>

      {/* Connection lines showing collaboration */}
      <path d="M 150 380 Q 185 360 220 365" stroke="#A78BFA" strokeWidth="2" fill="none" opacity="0.4" strokeDasharray="5,5" />
      <path d="M 255 395 Q 320 380 350 395" stroke="#F59E0B" strokeWidth="2" fill="none" opacity="0.4" strokeDasharray="5,5" />
      <path d="M 415 395 Q 445 360 470 375" stroke="#10B981" strokeWidth="2" fill="none" opacity="0.4" strokeDasharray="5,5" />

      {/* Small decorative dots */}
      <circle cx="100" cy="120" r="6" fill="#ffffff" opacity="0.6" />
      <circle cx="500" cy="320" r="6" fill="#ffffff" opacity="0.6" />
      <circle cx="80" cy="250" r="8" fill="#ffffff" opacity="0.6" />
      <circle cx="520" cy="200" r="7" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}
