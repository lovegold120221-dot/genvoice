import React, { useState } from 'react';

export function LoginScreen({ onLogin, isLoggingIn }: { onLogin: () => void, isLoggingIn: boolean }) {
  const [isRegister, setIsRegister] = useState(true);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white relative overflow-auto z-50 px-6 py-12">
      {/* Background glow */}
      <div 
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(163, 230, 53, 0.12), transparent 60%)'
        }}
      />

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="w-20 h-20 bg-[#111111] rounded-full flex items-center justify-center mb-8 border border-[#222]">
          <img src="https://eburon.ai/icon-eburon.svg" alt="Eburon Logo" className="w-12 h-12" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-2 tracking-tight">
          {isRegister ? 'Register' : 'Sign in'}
        </h1>
        <p className="text-[#888] text-sm mb-10">
          {isRegister ? 'Create your new account' : 'Log in to your account'}
        </p>

        {/* Form Fields */}
        <div className="w-full space-y-4 mb-8">
          {isRegister && (
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#666]">
                 <i className="ph ph-user text-lg"></i>
              </div>
              <input 
                type="text" 
                placeholder="Full name" 
                className="w-full bg-[#111] border border-[#222] rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#444] transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#666]">
               <i className="ph ph-envelope-simple text-lg"></i>
            </div>
            <input 
              type="email" 
              placeholder="Email" 
              className="w-full bg-[#111] border border-[#222] rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#444] transition-colors"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#666]">
               <i className="ph ph-lock-key text-lg"></i>
            </div>
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-[#111] border border-[#222] rounded-2xl py-4 pl-12 pr-12 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#444] transition-colors"
            />
            <button className="absolute inset-y-0 right-4 flex items-center text-[#666] hover:text-[#bbb] transition-colors">
              <i className="ph ph-eye text-lg"></i>
            </button>
          </div>

          {isRegister && (
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#666]">
                 <i className="ph ph-lock-key text-lg"></i>
              </div>
              <input 
                type="password" 
                placeholder="Confirm password" 
                className="w-full bg-[#111] border border-[#222] rounded-2xl py-4 pl-12 pr-12 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#444] transition-colors"
              />
              <button className="absolute inset-y-0 right-4 flex items-center text-[#666] hover:text-[#bbb] transition-colors">
                <i className="ph ph-eye text-lg"></i>
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button 
          onClick={onLogin}
          disabled={isLoggingIn}
          className="w-full bg-[#c4f042] text-black font-semibold py-4 rounded-full text-[15px] hover:bg-[#b0d93b] active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
        >
          {isLoggingIn ? 'Processing...' : (isRegister ? 'Sign up' : 'Sign in')}
        </button>

        {/* Divider */}
        <div className="flex items-center w-full my-8">
          <div className="flex-1 border-t border-[#222]"></div>
          <span className="px-4 text-[#555] text-xs">or</span>
          <div className="flex-1 border-t border-[#222]"></div>
        </div>

        {/* Google Button */}
        <button 
          onClick={onLogin}
          disabled={isLoggingIn}
          className="w-full bg-[#111] border border-[#222] text-white font-medium py-4 rounded-full text-sm hover:bg-[#181818] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:active:scale-100"
        >
          <div className="bg-white rounded-full p-[2px]">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[14px] h-[14px] block">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          Continue with Google
        </button>

        {/* Footer Link */}
        <div className="mt-10 text-[13px] text-[#666]">
          {isRegister ? 'Back to ' : 'Don\'t have an account? '}
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className="text-[#c4f042] font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            {isRegister ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </div>
    </div>
  );
}

