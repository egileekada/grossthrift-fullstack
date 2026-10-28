import * as Yup from 'yup';

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Enter a valid email address.')
    .max(254, 'Email must be at most 254 characters.')
    .required('Email is required.'),
  password: Yup.string()
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

export type LoginFormValues = Yup.InferType<typeof loginSchema>;
export type SignupFormValues = Yup.InferType<typeof signupSchema>;
