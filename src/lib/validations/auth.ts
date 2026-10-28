import * as Yup from 'yup';

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Enter a valid email address.')
    .max(254, 'Email must be at most 254 characters.')
    .required('Email is required.'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters.')
    .required('Password is required.'),
});

export const signupSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must be at most 80 characters.')
    .required('Full name is required.'),
  email: Yup.string()
    .trim()
    .email('Enter a valid email address.')
    .max(254, 'Email must be at most 254 characters.')
    .required('Email is required.'),
  password: Yup.string()
    .min(8, 'Password must be between 8 and 128 characters.')
    .max(128, 'Password must be between 8 and 128 characters.')
    .required('Password is required.'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match.')
    .required('Please confirm your password.'),
});

export const modalSignupSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must be at most 80 characters.')
    .required('Full name is required.'),
  email: Yup.string()
    .trim()
    .email('Enter a valid email address.')
    .max(254, 'Email must be at most 254 characters.')
    .required('Email is required.'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be at most 128 characters.')
    .required('Password is required.'),
});

export const phoneLoginSchema = Yup.object().shape({
  phone: Yup.string()
    .trim()
    .matches(/^\d{8,15}$/, 'Enter a valid phone number (8 to 15 digits).')
    .required('Phone number is required.'),
});

export const otpVerifySchema = Yup.object().shape({
  otp: Yup.string()
    .trim()
    .length(6, 'Please enter all 6 digits of the OTP code.')
    .required('Verification code is required.'),
});

export const onboardingVettingSchema = Yup.object().shape({
  country: Yup.string().required('Please select your region.'),
  countryFlag: Yup.string().required(),
  vettingMethod: Yup.string()
    .oneOf(['linkedin', 'email', 'declaration'])
    .required('Select a verification method.'),
  vettingDetail: Yup.string().when('vettingMethod', {
    is: 'linkedin',
    then: (schema) =>
      schema
        .trim()
        .min(2, 'Please enter your LinkedIn username or profile URL.')
        .required('LinkedIn profile is required.'),
    otherwise: (schema) =>
      schema.when('vettingMethod', {
        is: 'email',
        then: (s) =>
          s
            .trim()
            .email('Enter a valid work or school email.')
            .required('Work or school email is required.'),
        otherwise: (s) => s.optional(),
      }),
  }),
});

export const onboardingPledgeSchema = Yup.object().shape({
  pledgeAccepted: Yup.array()
    .of(Yup.string().required())
    .min(1, 'You must accept the community split guidelines to complete verification.')
    .required('You must accept the community split guidelines.'),
});

export const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Enter a valid email address.')
    .max(254, 'Email must be at most 254 characters.')
    .required('Email is required.'),
});

export const resetPasswordSchema = Yup.object().shape({
  token: Yup.string()
    .trim()
    .min(6, 'Enter the 6-digit verification code.')
    .max(6, 'Enter the 6-digit verification code.')
    .required('Verification code is required.'),
  password: Yup.string()
    .min(8, 'Password must be between 8 and 128 characters.')
    .max(128, 'Password must be between 8 and 128 characters.')
    .required('New password is required.'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match.')
    .required('Please confirm your new password.'),
});

export type LoginFormValues = Yup.InferType<typeof loginSchema>;
export type SignupFormValues = Yup.InferType<typeof signupSchema>;
export type ModalSignupFormValues = Yup.InferType<typeof modalSignupSchema>;
export type PhoneLoginFormValues = Yup.InferType<typeof phoneLoginSchema>;
export type OtpVerifyFormValues = Yup.InferType<typeof otpVerifySchema>;
export type OnboardingVettingFormValues = Yup.InferType<typeof onboardingVettingSchema>;
export type OnboardingPledgeFormValues = Yup.InferType<typeof onboardingPledgeSchema>;
export type ForgotPasswordFormValues = Yup.InferType<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = Yup.InferType<typeof resetPasswordSchema>;
