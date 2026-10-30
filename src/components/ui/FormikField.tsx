"use client";

import { useField, useFormikContext, getIn } from "formik";
import {
    Input,
    Textarea,
    Select,
    SelectItem,
} from "@heroui/react";
import { HTMLInputTypeAttribute, ReactNode, useState } from "react";
import { Danger, Eye, EyeSlash, InfoCircle } from "iconsax-reactjs";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Option {
    label: string;
    value: string;
}

interface FormikFieldProps {
    name: string;
    label?: string;
    labelRight?: ReactNode;
    placeholder?: string;
    type?: HTMLInputTypeAttribute;
    as?: "input" | "textarea" | "select";
    options?: Option[];
    info?: string;

    multiple?: boolean;

    prefix?: ReactNode;
    suffix?: ReactNode;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    inputClassName?: string;
    isPassword?: boolean;

    selectClassName?: string;
    selectTriggerClassName?: string;
    selectPopoverClassName?: string;
    selectIndicatorClassName?: string;
    isTouched?: boolean;
}

export function FormikField<T = unknown>({
    name,
    label,
    labelRight,
    placeholder,
    type = "text",
    as = "input",
    options = [],
    prefix,
    suffix,
    disabled = false,
    loading = false,
    className,
    inputClassName,
    isPassword,
    selectClassName,
    selectTriggerClassName,
    selectPopoverClassName,
    selectIndicatorClassName,
    info,
    multiple,
    isTouched,
}: FormikFieldProps) {
    const [showPassword, setShowPassword] = useState(false);

    const [field] = useField<T>(name);

    const { errors, touched, setFieldValue, setFieldTouched } =
        useFormikContext<Record<string, unknown>>();

    const fieldError = getIn(errors, name) as string | undefined;
    const fieldTouched = getIn(touched, name) as boolean | undefined;

    const hasError = Boolean((fieldTouched || isTouched) && fieldError);

    const inputType = isPassword ? (showPassword ? "text" : "password") : type;
    const inputValue = field.value ?? "";
    const accessibleLabel = label || placeholder || name;

    const handleChange = async (val: unknown) => {
        await setFieldValue(name, val, true);
    };

    const handleBlur = async () => {
        await setFieldTouched(name, true, true);
    };

    return (
        <div className={cn("w-full flex flex-col gap-1.5", className)}>
            {(label || labelRight) && (
                <div className="flex items-center justify-between">
                    {label && (
                        <label className="text-xs font-medium text-ink">
                            {label}
                        </label>
                    )}
                    {labelRight}
                </div>
            )}

            {/* INPUT */}
            {as === "input" && (
                <Input
                    name={name}
                    aria-label={accessibleLabel}
                    type={inputType}
                    placeholder={placeholder}
                    value={String(inputValue)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    isDisabled={disabled || loading}
                    startContent={prefix}
                    endContent={
                        loading ? (
                            <span className="animate-spin text-ink text-sm">
                                ⏳
                            </span>
                        ) : isPassword ? (
                            <button
                                type="button"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="flex items-center justify-center focus:outline-none text-slate"
                                onClick={() => setShowPassword((prev) => !prev)}
                            >
                                {showPassword ? (
                                    <EyeSlash size="18" />
                                ) : (
                                    <Eye size="18" />
                                )}
                            </button>
                        ) : (
                            suffix
                        )
                    }
                    className={cn("w-full", inputClassName)}
                    classNames={{
                        base: "w-full",
                        mainWrapper: "w-full",
                        inputWrapper: cn(
                            "bg-surface rounded-xl border border-border h-[45px] px-3.5 shadow-none !outline-none !ring-0 data-[hover=true]:bg-surface group-data-[focus=true]:bg-surface group-data-[focus=true]:border-border",
                            hasError && "border-red-500 group-data-[focus=true]:border-red-500",
                        ),
                        innerWrapper: "bg-transparent !border-0 !border-none !outline-none !ring-0 shadow-none",
                        input: "bg-transparent text-xs text-ink placeholder:text-dust !border-0 !border-none !outline-none focus:!outline-none focus-visible:!outline-none !ring-0 focus:!ring-0 !shadow-none",
                    }}
                />
            )}

            {/* TEXTAREA */}
            {as === "textarea" && (
                <Textarea
                    name={name}
                    value={String(inputValue)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    aria-label={accessibleLabel}
                    isDisabled={disabled || loading}
                    className={cn("w-full", inputClassName)}
                    classNames={{
                        base: "w-full",
                        inputWrapper: cn(
                            "bg-surface border border-border rounded-xl min-h-[100px] p-3.5 shadow-none !outline-none !ring-0 data-[hover=true]:bg-surface group-data-[focus=true]:bg-surface group-data-[focus=true]:border-border",
                            hasError && "border-red-500 group-data-[focus=true]:border-red-500",
                        ),
                        innerWrapper: "bg-transparent !border-0 !border-none !outline-none !ring-0 shadow-none",
                        input: "bg-transparent text-xs text-ink placeholder:text-dust !border-0 !border-none !outline-none focus:!outline-none focus-visible:!outline-none !ring-0 focus:!ring-0 !shadow-none",
                    }}
                />
            )}

            {/* SELECT */}
            {as === "select" && (
                <Select
                    aria-label={accessibleLabel}
                    selectedKeys={
                        multiple
                            ? new Set(Array.isArray(inputValue) ? (inputValue as string[]) : [])
                            : inputValue
                            ? new Set([String(inputValue)])
                            : new Set()
                    }
                    onSelectionChange={async (keys) => {
                        if (multiple) {
                            const selected = Array.from(keys) as string[];
                            await setFieldValue(name, selected, true);
                        } else {
                            const selected = Array.from(keys)[0];
                            await setFieldValue(name, selected ? String(selected) : "", true);
                        }
                        await setFieldTouched(name, true, true);
                    }}
                    placeholder={placeholder || "Select option"}
                    isDisabled={disabled || loading}
                    selectionMode={multiple ? "multiple" : "single"}
                    className={cn("w-full", selectClassName)}
                    classNames={{
                        trigger: cn(
                            "bg-surface border border-border rounded-xl h-[45px] px-3.5 shadow-none !outline-none !ring-0",
                            selectTriggerClassName,
                        ),
                        popoverContent: cn("rounded-md", selectPopoverClassName),
                        selectorIcon: selectIndicatorClassName,
                    }}
                >
                    {options.map((opt) => (
                        <SelectItem key={opt.value} textValue={opt.label}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </Select>
            )}

            <AnimatePresence mode="wait">
                {hasError ? (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-1 items-center text-red-500"
                    >
                        <Danger size={18} color="#fb2c36" />
                        <p className="text-xs capitalize font-medium">
                            {String(fieldError)}
                        </p>
                    </motion.div>
                ) : info ? (
                    <motion.div
                        key="info"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-1 items-center text-grey-03"
                    >
                        <InfoCircle size={18} color="#A3A3A3" />
                        <p className="text-xs font-medium">{info}</p>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
