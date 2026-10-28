"use client";

import { Input, Textarea, Select, SelectItem } from "@heroui/react";
import { ReactNode, useState } from "react";
import { Danger, Eye, EyeSlash, InfoCircle } from "iconsax-reactjs";
import { cn } from "@/lib/utils";

interface Option {
    label: string;
    value: string;
}

interface FieldProps<T = unknown> {
    label?: string;
    placeholder?: string;
    type?: string;
    as?: "input" | "textarea" | "select";
    options?: Option[];
    info?: string;

    multiple?: boolean;

    value?: T;
    onChange?: (value: T) => void;
    onBlur?: () => void;

    error?: string;
    touched?: boolean;

    prefix?: ReactNode;
    suffix?: ReactNode;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    inputGroupClassName?: string;
    inputClassName?: string;
    isPassword?: boolean;

    selectClassName?: string;
    selectTriggerClassName?: string;
    selectPopoverClassName?: string;
    selectIndicatorClassName?: string;
}

export default function CustomField<T = unknown>({
    label,
    placeholder,
    type = "text",
    as = "input",
    options = [],
    value,
    onChange,
    onBlur,
    prefix,
    suffix,
    disabled = false,
    loading = false,
    className,
    inputGroupClassName,
    inputClassName,
    isPassword,
    selectClassName,
    selectTriggerClassName,
    selectPopoverClassName,
    selectIndicatorClassName,
    info,
    multiple,
    error,
    touched,
}: FieldProps<T>) {
    const [showPassword, setShowPassword] = useState(false);

    const hasError = Boolean(error && touched);
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;
    const inputValue = value ?? "";
    const accessibleLabel = label || placeholder || "Field";

    const handleChange = (val: unknown) => {
        onChange?.(val as T);
    };

    return (
        <div className={cn("w-full flex flex-col gap-1", className)}>
            {label && (
                <label className="text-sm font-medium text-grey-04">
                    {label}
                </label>
            )}

            {/* INPUT */}
            {as === "input" && (
                <Input
                    type={inputType}
                    placeholder={placeholder}
                    value={String(inputValue)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
                    onBlur={onBlur}
                    isDisabled={disabled || loading}
                    aria-label={accessibleLabel}
                    startContent={prefix}
                    endContent={
                        loading ? (
                            <span className="animate-spin text-gray-400 text-sm">⏳</span>
                        ) : isPassword ? (
                            <button
                                type="button"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="flex items-center justify-center focus:outline-none"
                                onClick={() => setShowPassword((prev) => !prev)}
                            >
                                {showPassword ? (
                                    <EyeSlash size="20" />
                                ) : (
                                    <Eye size="20" />
                                )}
                            </button>
                        ) : (
                            suffix
                        )
                    }
                    className={cn("w-full", inputClassName)}
                    classNames={{
                        inputWrapper: cn(
                            "bg-grey-01 border border-grey-02 rounded-[8px] h-[45px]",
                            hasError && "border-red-500",
                            inputGroupClassName,
                        ),
                    }}
                />
            )}

            {/* TEXTAREA */}
            {as === "textarea" && (
                <Textarea
                    value={String(inputValue)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    aria-label={accessibleLabel}
                    isDisabled={disabled || loading}
                    className={cn("w-full", inputClassName)}
                    classNames={{
                        inputWrapper: cn(
                            "bg-grey-01 border border-grey-02 rounded-[8px] min-h-[100px]",
                            hasError && "border-red-500",
                        ),
                    }}
                />
            )}

            {/* SELECT */}
            {as === "select" && (
                <Select
                    selectedKeys={
                        multiple
                            ? new Set(Array.isArray(inputValue) ? (inputValue as string[]) : [])
                            : inputValue
                            ? new Set([String(inputValue)])
                            : new Set()
                    }
                    onSelectionChange={(keys) => {
                        if (multiple) {
                            const selected = Array.from(keys) as string[];
                            handleChange(selected);
                        } else {
                            const selected = Array.from(keys)[0];
                            handleChange(selected ? String(selected) : "");
                        }
                        onBlur?.();
                    }}
                    placeholder={placeholder || "Select option"}
                    aria-label={accessibleLabel}
                    isDisabled={disabled || loading}
                    selectionMode={multiple ? "multiple" : "single"}
                    className={cn("w-full", selectClassName)}
                    classNames={{
                        trigger: cn(
                            "bg-grey-01 border border-grey-02 rounded-[8px] h-[45px]",
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

            {/* ERROR */}
            {hasError && (
                <div className="flex gap-1 items-center text-red-500">
                    <Danger size={18} color="#fb2c36" />
                    <p className="text-xs capitalize">{error}</p>
                </div>
            )}

            {/* INFO */}
            {info && !hasError && (
                <div className="flex gap-1 items-center text-grey-03">
                    <InfoCircle size={18} color="#A3A3A3" />
                    <p className="text-xs font-medium">{info}</p>
                </div>
            )}
        </div>
    );
}