'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import Navbar from '@/components/Navbar';
import { AppButton, FormikField, CustomText } from '@/components/ui';
import { useUpdatePasswordMutation } from '@/hooks/useAuth';

const schema = Yup.object({
  password: Yup.string().min(8, 'Use at least 8 characters.').max(128).required('Enter a new password.'),
  confirmPassword: Yup.string().oneOf([Yup.ref('password')], 'Passwords must match.').required('Confirm your password.'),
});

export default function ResetPasswordPage() {
  const mutation = useUpdatePasswordMutation();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-off-white text-charcoal">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 pt-32 pb-24">
        <div className="w-full max-w-md bg-white border border-border rounded-[24px] p-8 shadow-2xl space-y-6">
          <div>
            <CustomText type="headline-sm" as="h1" className="font-bold font-display text-charcoal">
              Choose a new password
            </CustomText>
            <p className="text-sm text-slate mt-2">Open this page from the password reset email before submitting.</p>
          </div>

          {message ? (
            <div className="space-y-4">
              <p className="text-sm text-emerald-800">{message}</p>
              <Link href="/auth/login" className="text-sm font-semibold underline">Return to sign in</Link>
            </div>
          ) : (
            <Formik
              initialValues={{ password: '', confirmPassword: '' }}
              validationSchema={schema}
              onSubmit={async ({ password }) => {
                setError('');
                try {
                  const result = await mutation.mutateAsync({ password });
                  setMessage(result.message);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : 'Could not update your password. Request a new reset email.');
                }
              }}
            >
              {() => (
                <Form className="space-y-4">
                  {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                  <FormikField name="password" label="New password" type="password" />
                  <FormikField name="confirmPassword" label="Confirm new password" type="password" />
                  <AppButton type="submit" variant="primary" size="lg" fullWidth loading={mutation.isPending}>
                    Update password
                  </AppButton>
                </Form>
              )}
            </Formik>
          )}
        </div>
      </main>
    </div>
  );
}
