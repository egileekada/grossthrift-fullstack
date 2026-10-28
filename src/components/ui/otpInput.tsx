"use client";
import { InputOtp } from "@heroui/react";
import { useField, useFormikContext } from "formik";
import { useEffect, useState } from "react";
import clsx from "clsx";

interface OTPInputProps {
  name: string;
  label?: string;
  description?: string;
  length?: number;
  error?: boolean;
  isLoading?: boolean;
}

function OTPInput({
  name,
  label,
  description,
  length = 6,
  error,
  isLoading,
}: OTPInputProps) {
  const [field, meta, helpers] = useField<string>(name);

  const { setFieldTouched, submitForm } = useFormikContext();

  const [current, setCurrent] = useState("");
  const [shake, setShake] = useState(false);

  const handleChange = (value: string) => {
    helpers.setValue(value);
    setFieldTouched(name, true);
  };

  /** ✅ Auto submit AFTER state update */
  useEffect(() => {
    if (
      field.value &&
      field.value.length === length &&
      current !== field.value
    ) {
      submitForm();
      setCurrent(field.value);
    }
  }, [field.value, length, submitForm, current]);

  /** 🔥 Shake on external error */
  useEffect(() => {
    if (error) {
      setShake(true);

      const timeout = setTimeout(() => {
        setShake(false);
        helpers.setValue(""); // clear after error
      }, 400);

      return () => clearTimeout(timeout);
    }
  }, [error, helpers]);

  return (
    <div className="flex w-fit flex-col gap-2">
      {/* Label */}
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-grey-04">
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-muted">{description}</p>
        )}
      </div>

      {/* OTP Input */}
      <div className={clsx("transition-all", shake && "animate-shake")}>
        <InputOtp
          length={length}
          value={field.value || ""}
          onValueChange={handleChange}
          autoFocus
          aria-label={label || "One-time password"}
          isInvalid={Boolean(meta.touched && meta.error)}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-xs text-muted text-center">
          Verifying code...
        </p>
      )}

      {/* Error */}
      {meta.touched && meta.error && (
        <p className="text-sm text-danger text-center">
          {meta.error}
        </p>
      )}
    </div>
  );
}

export default OTPInput;