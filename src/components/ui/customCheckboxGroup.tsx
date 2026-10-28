"use client";

import { Checkbox, CheckboxGroup } from "@heroui/react";
import { useField, useFormikContext, getIn } from "formik";
import { Danger } from "iconsax-reactjs";

interface CheckboxOption {
    label?: string;
    value: string;
    description?: string;
    disabled?: boolean;
}

interface FormikCheckboxGroupProps {
    name?: string;
    label?: string;
    description?: string;
    options: CheckboxOption[];

    // controlled mode
    value?: string[];
    onChange?: (value: string[]) => void;

    disabled?: boolean;
    className?: string;
    itemClassName?: string;
}

function FormikConnectedCheckboxGroup({
    name,
    label,
    description,
    options,
    disabled,
    className,
    itemClassName,
}: FormikCheckboxGroupProps & { name: string }) {
    const [field] = useField<string[]>(name);
    const formik = useFormikContext<Record<string, unknown>>();

    const inputValue = field.value || [];
    const error = getIn(formik.errors, name);
    const touched = getIn(formik.touched, name);
    const hasError = Boolean(error && touched);

    const handleChange = (values: string[]) => {
        formik.setFieldValue(name, values);
        formik.setFieldTouched(name, true);
    };

    return (
        <div className={`flex flex-col gap-2 ${className || ""}`}>
            <CheckboxGroup
                name={name}
                label={label}
                description={description}
                value={inputValue}
                onValueChange={handleChange}
                isDisabled={disabled}
            >
                <div className="flex flex-col gap-2">
                    {options.map((item) => (
                        <Checkbox
                            key={item.value}
                            value={item.value}
                            isDisabled={item.disabled}
                            className={`items-center gap-2 ${itemClassName || ""}`}
                        >
                            <div className="flex flex-col">
                                {item.label && (
                                    <span className="text-sm font-medium">
                                        {item.label}
                                    </span>
                                )}
                                {item.description && (
                                    <span className="text-xs text-grey-04 mt-0.5">
                                        {item.description}
                                    </span>
                                )}
                            </div>
                        </Checkbox>
                    ))}
                </div>
            </CheckboxGroup>

            {hasError && (
                <div className="flex gap-1 items-center text-red-500">
                    <Danger size={18} color="#fb2c36" />
                    <p className="text-xs capitalize">{String(error)}</p>
                </div>
            )}
        </div>
    );
}

function ControlledCheckboxGroup({
    name,
    label,
    description,
    options,
    value = [],
    onChange,
    disabled,
    className,
    itemClassName,
}: FormikCheckboxGroupProps) {
    return (
        <div className={`flex flex-col gap-2 ${className || ""}`}>
            <CheckboxGroup
                name={name}
                label={label}
                description={description}
                value={value}
                onValueChange={onChange}
                isDisabled={disabled}
            >
                <div className="flex flex-col gap-2">
                    {options.map((item) => (
                        <Checkbox
                            key={item.value}
                            value={item.value}
                            isDisabled={item.disabled}
                            className={`items-center gap-2 ${itemClassName || ""}`}
                        >
                            <div className="flex flex-col">
                                {item.label && (
                                    <span className="text-sm font-medium">
                                        {item.label}
                                    </span>
                                )}
                                {item.description && (
                                    <span className="text-xs text-grey-04 mt-0.5">
                                        {item.description}
                                    </span>
                                )}
                            </div>
                        </Checkbox>
                    ))}
                </div>
            </CheckboxGroup>
        </div>
    );
}

export default function FormikCheckboxGroup(props: FormikCheckboxGroupProps) {
    if (props.name) {
        return <FormikConnectedCheckboxGroup {...props} name={props.name} />;
    }
    return <ControlledCheckboxGroup {...props} />;
}
