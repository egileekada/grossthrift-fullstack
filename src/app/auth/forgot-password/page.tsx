'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Formik, Form } from 'formik';
import { forgotPasswordSchema, ForgotPasswordFormValues } from '@/lib/validations/auth';
import { FormikField, AppButton, CustomText } from '@/components/ui';
import { useForgotPasswordMutation } from '@/hooks/useAuth';
import { AlertCircle, ArrowLeft, Check, KeyRound, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPasswordMutation();
  const [targetEmail, setTargetEmail] = useState('');
  const [serverError, setServerError] = useState('');
  const [sent, setSent] = useState(false);

  const handleRequestReset = async (values: ForgotPasswordFormValues) => {
    setServerError('');
    try {
      const result = await forgotPasswordMutation.mutateAsync({ email: values.email.trim() });
      setTargetEmail(result.email);
      setSent(true);
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : 'Unable to request a password reset.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-off-white text-charcoal font-sans antialiased">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 pt-32 pb-24">
        <div className="w-full max-w-md bg-white border border-border rounded-[24px] p-8 shadow-2xl space-y-6 text-left">
          <div>
            <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-ink mb-4">
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </Link>
            <div className="w-10 h-10 bg-sage-light text-sage rounded-xl flex items-center justify-center mb-4">
              <KeyRound size={20} />
            </div>
            <CustomText type="headline-sm" as="h1" className="font-bold font-display text-charcoal tracking-tight">
              {sent ? 'Check your email' : 'Forgot your password?'}
            </CustomText>
            <CustomText type="body-md" className="text-slate mt-1">
              {sent
                ? `If an account exists for ${targetEmail}, Supabase has sent a password reset link. Open the link to choose a new password.`
                : 'Enter your account email and we will send a secure password reset link.'}
            </CustomText>
          </div>

          {serverError && (
            <div className="p-3 bg-terracotta-light/60 border border-terracotta/25 text-terracotta rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {sent ? (
            <div className="space-y-4">
              <div className="p-3 bg-sage-light border border-sage/25 text-sage rounded-xl text-xs flex items-center gap-2">
                <Check size={15} className="shrink-0" />
                <span>Check your inbox and spam folder for the reset link.</span>
              </div>
              <div className="flex gap-3">
                <AppButton type="button" variant="secondary-outline" size="lg" onPress={() => setSent(false)}>
                  Try another email
                </AppButton>
                <Link href="/auth/login" className="flex-1">
                  <AppButton type="button" variant="primary" size="lg" fullWidth>
                    Back to sign in
                  </AppButton>
                </Link>
              </div>
            </div>
          ) : (
            <Formik
              initialValues={{ email: '' }}
              validationSchema={forgotPasswordSchema}
              onSubmit={handleRequestReset}
            >
              {() => (
                <Form className="space-y-4">
                  <FormikField name="email" label="Email Address" placeholder="you@domain.com" type="email" />
                  <AppButton type="submit" variant="primary" size="lg" fullWidth loading={forgotPasswordMutation.isPending}>
                    Send reset link
                  </AppButton>
                </Form>
              )}
            </Formik>
          )}

          <div className="pt-4 border-t border-border/60 flex items-center justify-center gap-1.5 text-[11px] text-dust">
            <Lock size={12} />
            <span>Reset links are handled securely by Supabase Auth.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
