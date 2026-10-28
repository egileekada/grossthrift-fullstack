"use client";

import { Radio, RadioGroup } from "@heroui/react";
import { useField, useFormikContext } from "formik";
import clsx from "clsx";

type Option = {
    label: string;
    value: string;
    description?: string;
};

interface FormikRadioGroupProps {
    name: string;
    label?: string;
    options: Option[];
    orientation?: "horizontal" | "vertical";
    isArray?: boolean;
}

export default function FormikRadioGroup({
    name,
    label,
    options,
    orientation = "horizontal",
    isArray,
}: FormikRadioGroupProps) {
    const [field, meta] = useField<string | string[]>(name);
    const { setFieldValue } = useFormikContext();

    const handleChange = (value: string) => {
        if (isArray) {
            const currentValues: Array<string> = Array.isArray(field.value)
                ? field.value
                : [];

            if (currentValues.includes(value)) {
                // Remove the selected value
                setFieldValue(
                    name,
                    currentValues.filter((item) => item !== value),
                );
            } else {
                // Add the selected value
                setFieldValue(name, [...currentValues, value]);
            }
        } else {
            setFieldValue(name, value);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {/* Label */}
            {label && (
                <label className="text-sm font-medium text-grey-04">
                    {label}
                </label>
            )}

            {/* Radio Group */}
            {isArray && (
                <div
                    className={clsx(
                        "flex gap-4",
                        orientation === "vertical" && "flex-col",
                    )}
                >
                    {options.map((option) => {
                        const selected = Array.isArray(field.value)
                            ? field.value.includes(option.value)
                            : false;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleChange(option.value)}
                                className="flex items-center gap-3 text-left"
                            >
                                <div
                                    className={clsx(
                                        "h-5 w-5 rounded-xl border-2 flex items-center justify-center transition",
                                        selected
                                            ? "border-primary"
                                            : "border-default-300",
                                    )}
                                >
                                    {selected && (
                                        <div className="h-2.5 w-2.5 rounded-xl bg-blue-500" />
                                    )}
                                </div>

                                <div>
                                    <div className="text-sm font-medium">{option.label}</div>
                                    {option.description && (
                                        <div className="text-sm text-default-500">
                                            {option.description}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {!isArray && (
                <RadioGroup
                    value={
                        Array.isArray(field.value)
                            ? field.value[0]
                            : field.value || ""
                    }
                    onValueChange={handleChange}
                    orientation={orientation}
                >
                    {options.map((option) => (
                        <Radio
                            key={option.value}
                            value={option.value}
                            description={option.description}
                        >
                            {option.label}
                        </Radio>
                    ))}
                </RadioGroup>
            )}

            {/* Error */}
            {meta.touched && meta.error && (
                <p className="text-sm text-danger">{meta.error}</p>
            )}
        </div>
    );
}
