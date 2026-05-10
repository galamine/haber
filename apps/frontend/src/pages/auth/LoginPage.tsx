import type { RequestOtpDto, VerifyOtpDto } from '@haber/shared';
import { RequestOtpDtoSchema, VerifyOtpDtoSchema } from '@haber/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { useRequestOtp, useVerifyOtp } from '@/hooks/useAuth';

type Step = 'email' | 'otp';

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [sentEmail, setSentEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');

  const { mutate: requestOtp, isPending: isRequesting, error: requestError } = useRequestOtp();
  const { mutate: verifyOtp, isPending: isVerifying, error: verifyError } = useVerifyOtp();

  const emailForm = useForm<RequestOtpDto>({
    resolver: zodResolver(RequestOtpDtoSchema),
  });

  const onEmailSubmit = (data: RequestOtpDto) => {
    requestOtp(data, {
      onSuccess: () => {
        setSentEmail(data.email);
        setOtpValue('');
        setStep('otp');
      },
    });
  };

  const onOtpComplete = (otp: string) => {
    const payload: VerifyOtpDto = { email: sentEmail, otp };
    const result = VerifyOtpDtoSchema.safeParse(payload);
    if (!result.success) return;
    verifyOtp(result.data, { onSuccess: () => navigate('/') });
  };

  const handleBack = () => {
    setStep('email');
    setOtpValue('');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between p-12"
        style={{ backgroundColor: 'var(--brown-800)' }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="size-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--brown-600)' }}
            >
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Haber</span>
          </div>
        </div>

        <div>
          <blockquote className="space-y-4">
            <p className="text-lg leading-relaxed" style={{ color: 'var(--brown-200)' }}>
              "Supporting every step of a child's journey — from first assessment to breakthrough moment."
            </p>
            <footer className="text-sm" style={{ color: 'var(--brown-400)' }}>
              Clinical workflow for child development specialists
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[380px]">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex gap-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: step === 'email' ? '24px' : '8px',
                  backgroundColor: step === 'email' ? 'var(--brown-600)' : 'var(--brown-200)',
                }}
              />
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: step === 'otp' ? '24px' : '8px',
                  backgroundColor: step === 'otp' ? 'var(--brown-600)' : 'var(--brown-200)',
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground ml-1">Step {step === 'email' ? '1' : '2'} of 2</span>
          </div>

          {/* Step 1 — Email */}
          {step === 'email' && (
            <div>
              <div className="mb-8">
                <div
                  className="size-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--brown-100)' }}
                >
                  <Mail className="size-5" style={{ color: 'var(--brown-600)' }} />
                </div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Sign in to Haber</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">Enter your work email to receive a one-time code.</p>
              </div>

              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@clinic.com" autoComplete="email" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {requestError && <p className="text-sm text-destructive">{requestError.message}</p>}

                  <Button type="submit" className="w-full" disabled={isRequesting}>
                    {isRequesting ? 'Sending code…' : 'Send one-time code'}
                  </Button>
                </form>
              </Form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Access is by invitation only. Contact your clinic administrator if you need an account.
              </p>
            </div>
          )}

          {/* Step 2 — OTP */}
          {step === 'otp' && (
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="mb-8 -ml-2 gap-1.5">
                <ArrowLeft className="size-3.5" />
                Back
              </Button>

              <div className="mb-8">
                <div
                  className="size-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--brown-100)' }}
                >
                  <ShieldCheck className="size-5" style={{ color: 'var(--brown-600)' }} />
                </div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Check your email</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{sentEmail}</span>. It expires in
                  10 minutes.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="mb-3 block">One-time code</Label>
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={setOtpValue}
                    onComplete={onOtpComplete}
                    disabled={isVerifying}
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={`otp-slot-${i}`}
                          index={i}
                          className="h-12 w-11 rounded-lg border text-base font-semibold"
                          style={{ borderColor: 'var(--brown-300)' }}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {isVerifying && <p className="text-sm text-muted-foreground">Verifying…</p>}

                {verifyError && <p className="text-sm text-destructive">{verifyError.message}</p>}

                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  disabled={isRequesting}
                  onClick={emailForm.handleSubmit(onEmailSubmit)}
                  className="px-0 text-muted-foreground"
                >
                  {isRequesting ? 'Resending…' : "Didn't receive it? Resend code"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
