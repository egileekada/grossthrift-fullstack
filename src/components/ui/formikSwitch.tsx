"use client";

import { Switch } from "@heroui/react";
import { useField, useFormikContext, getIn } from "formik";
import { useEffect } from "react";

interface Props {
    name: string;
    label?: string;
    disabled?: boolean;
    className?: string;
    day?: string;
    other?: string;
}

export default function FormikSwitch({
    name,
    label,
    disabled,
    className,
    day,
    other,
}: Props) {
    const { errors, touched, setFieldValue } = useFormikContext<Record<string, unknown>>();

    const [field] = useField(name);

    const error = getIn(errors, name);
    const isTouched = getIn(touched, name);

    useEffect(() => {
        if (other && day) {
            setFieldValue(other, day);
        }
    }, [field.value, other, day, setFieldValue]);

    return (
        <div className={`flex flex-col gap-1 ${className || ""}`}>
            <Switch
                isSelected={Boolean(field.value)}
                isDisabled={disabled}
                onValueChange={(isSelected) => setFieldValue(name, isSelected)}
            >
                {label && <span className="text-sm">{label}</span>}
            </Switch>

            {isTouched && error && (
                <p className="text-xs text-red-500">{String(error)}</p>
            )}
        </div>
    );
}