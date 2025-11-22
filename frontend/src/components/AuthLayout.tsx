import { ReactNode, useState, useEffect } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  showTagline?: boolean;
}

const carouselSlides = [
  {
    title: "AI-Powered Standups",
    description: "Transform your daily updates into structured, actionable insights with intelligent parsing.",
    icon: (
      <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  },
  {
    title: "Sprint Management",
    description: "Track progress across sprints with real-time RAG status and comprehensive reporting.",
    icon: (
      <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    title: "Team Collaboration",
    description: "Keep your entire team aligned with shared visibility into blockers and progress.",
    icon: (
      <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  }
];

export default function AuthLayout({ children, showTagline = false }: AuthLayoutProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Illustration and branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/30 via-transparent to-cyan-500/30 animate-pulse"></div>

        {/* Decorative floating blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Logo and branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-2xl">
                StandupSnap<sup className="text-sm ml-1">™</sup>
              </h1>
            </div>
            <p className="text-xl text-white/90 leading-relaxed drop-shadow-lg font-medium max-w-md mx-auto">
              Smarter standups. Better sprints.<br />
              Stronger teams — with AI-crafted snaps.
            </p>
          </div>

          {/* Carousel */}
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 p-4 bg-white/10 rounded-xl">
                  {carouselSlides[currentSlide].icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {carouselSlides[currentSlide].title}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {carouselSlides[currentSlide].description}
                </p>
              </div>
            </div>

            {/* Carousel indicators */}
            <div className="flex justify-center space-x-2 mt-6">
              {carouselSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'w-8 bg-white'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            {/* Version */}
            <div className="flex items-center justify-center mt-8">
              <span className="text-white/60 text-sm font-medium">v0.1.0 Beta</span>
            </div>
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
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
