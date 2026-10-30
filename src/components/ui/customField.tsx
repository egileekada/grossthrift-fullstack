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
        <div className={cn("w-full flex flex-col gap-1.5", className)}>
            {label && (
                <label className="text-xs font-medium text-ink">
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
                            "bg-surface border border-border rounded-xl h-[45px] px-3.5 shadow-none !outline-none !ring-0 data-[hover=true]:bg-surface group-data-[focus=true]:bg-surface group-data-[focus=true]:border-border",
                            hasError && "border-red-500 group-data-[focus=true]:border-red-500",
                            inputGroupClassName,
                        ),
                        innerWrapper: "bg-transparent !border-0 !border-none !outline-none !ring-0 shadow-none",
                        input: "bg-transparent text-xs text-ink placeholder:text-dust !border-0 !border-none !outline-none focus:!outline-none focus-visible:!outline-none !ring-0 focus:!ring-0 !shadow-none",
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
