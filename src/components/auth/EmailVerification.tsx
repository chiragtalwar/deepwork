import { useState } from 'react';
import { Icons } from '../ui/icons';

interface EmailVerificationProps {
  email: string;
  onResendClick: () => Promise<void>;
  onSignInClick: () => void;
}

export function EmailVerification({ email, onResendClick, onSignInClick }: EmailVerificationProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    await onResendClick();
    setResendSuccess(true);
    setIsResending(false);
    setTimeout(() => setResendSuccess(false), 3000);
  };

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-white/10 rounded-full blur-md animate-pulse" />
          <div className="relative bg-white/20 rounded-full p-3">
            <Icons.mail className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-light text-white/90">
          Verify your email
        </h2>
        <p className="text-white/70 text-sm">
          We've sent a verification link to
          <br />
          <span className="text-white/90 font-medium">{email}</span>
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-white/60">
          Click the link in your email to verify your account
        </p>
        
        <button
          onClick={handleResend}
          disabled={isResending}
          className="text-sm text-white/70 hover:text-white/90 transition-colors duration-300"
        >
          {isResending ? (
            <span className="flex items-center justify-center gap-2">
              <Icons.spinner className="h-4 w-4 animate-spin" />
              Resending...
            </span>
          ) : resendSuccess ? (
            <span className="flex items-center justify-center gap-2 text-emerald-400">
              <Icons.check className="h-4 w-4" />
              Email sent!
            </span>
          ) : (
            "Didn't receive the email? Resend"
          )}
        </button>
      </div>
    </div>
  );
} 