'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form } from 'formik';
import {
  forgotPasswordSchema,
  ForgotPasswordFormValues,
  resetPasswordSchema,
  ResetPasswordFormValues,
} from '@/lib/validations/auth';
import { FormikField, OTPInput, AppButton, CustomText } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useForgotPasswordMutation, useUpdatePasswordMutation } from '@/hooks/useAuth';
import { AlertCircle, ArrowLeft, Check, KeyRound, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { setUser } = useApp();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const updatePasswordMutation = useUpdatePasswordMutation();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [targetEmail, setTargetEmail] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');

  const handleRequestReset = async (values: ForgotPasswordFormValues) => {
    setServerError('');
    setServerSuccess('');

    try {
      const res = await forgotPasswordMutation.mutateAsync({
        email: values.email.trim(),
      });
      setTargetEmail(res.email);
      setGeneratedToken(res.resetToken);
      setServerSuccess(res.message);
      setStep('reset');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to request password reset.';
      setServerError(msg);
    }
  };

  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    setServerError('');
    setServerSuccess('');

    try {
      const res = await updatePasswordMutation.mutateAsync({
        email: targetEmail,
        token: values.token.trim(),
        password: values.password,
      });

      if (res.user) {
        setUser(res.user);
      }

      setServerSuccess(res.message || 'Password updated! Redirecting...');
      setTimeout(() => {
        router.push(res.user ? '/dashboard' : '/auth/login');
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to update password.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-off-white text-charcoal font-sans antialiased">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 pt-32 pb-24">
        <div className="w-full max-w-md bg-white border border-border rounded-[24px] p-8 shadow-2xl space-y-6 text-left">
          <div>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-ink mb-4"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
            <div className="w-10 h-10 bg-sage-light text-sage rounded-xl flex items-center justify-center mb-4">
              <KeyRound size={20} />
            </div>
            <CustomText
              type="headline-sm"
              as="h1"
              className="font-bold font-display text-charcoal tracking-tight"
            >
              {step === 'request' ? 'Forgot your password?' : 'Set a new password'}
            </CustomText>
            <CustomText type="body-md" className="text-slate mt-1">
              {step === 'request'
                ? 'Enter the email address associated with your GrossThrift account to receive a 6-digit reset code.'
                : `Enter the 6-digit verification code for ${targetEmail} and choose a new password.`}
            </CustomText>
          </div>

          {serverError && (
            <div className="p-3 bg-terracotta-light/60 border border-terracotta/25 text-terracotta rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {serverSuccess && (
            <div className="p-3 bg-sage-light border border-sage/25 text-sage rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <Check size={15} className="shrink-0" />
                <span>{serverSuccess}</span>
              </div>
              {generatedToken && step === 'reset' && (
                <div className="font-mono text-xs bg-white border border-border px-3 py-1.5 rounded-lg text-ink inline-block mt-1">
                  Reset Verification Code: <strong>{generatedToken}</strong>
                </div>
              )}
            </div>
          )}

          {step === 'request' ? (
            <Formik
              initialValues={{ email: '' }}
              validationSchema={forgotPasswordSchema}
              onSubmit={handleRequestReset}
            >
              {() => (
                <Form className="space-y-4">
                  <FormikField
                    name="email"
                    label="Email Address"
                    placeholder="you@domain.com"
                    type="email"
                  />

                  <div className="pt-2">
                    <AppButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={forgotPasswordMutation.isPending}
                    >
                      Send Reset Code
                    </AppButton>
                  </div>

                  <CustomText type="body-sm" className="text-center text-slate pt-2">
                    Remembered your password?{' '}
                    <Link href="/auth/login" className="text-sage font-semibold hover:underline">
                      Sign in
                    </Link>
                  </CustomText>
                </Form>
              )}
            </Formik>
          ) : (
            <Formik
              initialValues={{
                token: generatedToken || '',
                password: '',
                confirmPassword: '',
              }}
              enableReinitialize
              validationSchema={resetPasswordSchema}
              onSubmit={handleResetPassword}
            >
              {() => (
                <Form className="space-y-4">
                  <OTPInput
                    name="token"
                    label="6-Digit Verification Code"
                    length={6}
                    autoSubmit={false}
                    error={Boolean(serverError)}
                  />

                  <FormikField
                    name="password"
                    label="New Password (min 8 characters)"
                    placeholder="••••••••"
                    isPassword
                  />

                  <FormikField
                    name="confirmPassword"
                    label="Confirm New Password"
                    placeholder="••••••••"
                    isPassword
                  />

                  <div className="pt-2 flex gap-3">
                    <AppButton
                      type="button"
                      variant="secondary-outline"
                      size="lg"
                      onPress={() => {
                        setStep('request');
                        setServerError('');
                        setServerSuccess('');
                      }}
                    >
                      Change Email
                    </AppButton>
                    <AppButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={updatePasswordMutation.isPending}
                    >
                      Reset Password
                    </AppButton>
                  </div>
                </Form>
              )}
            </Formik>
          )}

          <div className="pt-4 border-t border-border/60 flex items-center justify-center gap-1.5 text-[11px] text-dust">
            <Lock size={12} />
            <span>Protected by bank-level 256-bit encryption</span>
          </div>
        </div>
      </main>
    </div>
  );
}
