"use client";

import { useFormikContext, getIn, FormikValues } from "formik";
import { useMemo, useState, useEffect } from "react"; 
import { Danger } from "iconsax-reactjs";
import CustomField from "./customField";

interface DOBPickerProps {
    name: string;
    label?: string;
}

export default function DOBPicker({ name, label }: DOBPickerProps) {
    const formik = useFormikContext<FormikValues>();

    const error = getIn(formik?.errors, name);
    const touched = getIn(formik?.touched, name);
    const value = getIn(formik?.values, name);

    const hasError = Boolean(error && touched);

    // ---------- AGE LIMIT ----------
    const today = new Date();
    const maxYear = today.getFullYear() - 18;
    const minYear = 1900;

    const years = useMemo(
        () =>
            Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
                const year = maxYear - i;
                return { label: String(year), value: String(year) };
            }),
        [maxYear],
    );

    const months = [
        { value: "1", label: "January" },
        { value: "2", label: "February" },
        { value: "3", label: "March" },
        { value: "4", label: "April" },
        { value: "5", label: "May" },
        { value: "6", label: "June" },
        { value: "7", label: "July" },
        { value: "8", label: "August" },
        { value: "9", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" },
    ];

    const daysInMonth = (year: number, month: number) =>
        new Date(year, month, 0).getDate();

    // ---------- Local state ----------
    const [yearData, setYear] = useState("");
    const [monthData, setMonth] = useState("");
    const [dayData, setDay] = useState("");

    // ✅ Initialize once (FIXED)
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                setYear(String(d.getFullYear()));
                setMonth(String(d.getMonth() + 1));
                setDay(String(d.getDate()));
            }
        }
    }, [value]);

    const currentYear = yearData;
    const currentMonth = monthData;
    const currentDay = dayData;

    // ---------- Update Formik ----------
    const handleChange = (year?: string, month?: string, day?: string) => {
        const newYear = year ?? currentYear;
        const newMonth = month ?? currentMonth;
        const newDay = day ?? currentDay;

        if (year !== undefined) setYear(year);
        if (month !== undefined) setMonth(month);
        if (day !== undefined) setDay(day);

        // mark as touched
        formik.setFieldTouched(name, true);

        if (newYear && newMonth && newDay) {
            // ✅ RFC 3339 full-date (YYYY-MM-DD)
            const formatted = `${newYear}-${newMonth.padStart(
                2,
                "0",
            )}-${newDay.padStart(2, "0")}`;

            formik.setFieldValue(name, formatted);
        } else {
            formik.setFieldValue(name, "");
        }
    };

    const daysArray = useMemo(() => {
        if (!currentYear || !currentMonth) return [];

        return Array.from(
            {
                length: daysInMonth(Number(currentYear), Number(currentMonth)),
            },
            (_, i) => ({
                value: String(i + 1),
                label: String(i + 1),
            }),
        );
    }, [currentYear, currentMonth]);

    return (
        <div className="w-full flex flex-col gap-2">
            {label && (
                <p className="text-sm font-medium text-gray-900">{label}</p>
            )}

            <div className="flex gap-3 w-full">
                {/* YEAR */}
                <CustomField
                    as="select"
                    value={currentYear}
                    onChange={(val: string) =>
                        handleChange(val, undefined, undefined)
                    }
                    placeholder="Year"
                    options={years}
                    className="w-1/3"
                />

                {/* MONTH */}
                <CustomField
                    as="select"
                    value={currentMonth}
                    onChange={(val: string) =>
                        handleChange(undefined, val, undefined)
                    }
                    placeholder="Month"
                    options={months}
                    disabled={!currentYear}
                    className="w-1/3"
                />

                {/* DAY */}
                <CustomField
                    as="select"
                    value={currentDay}
                    onChange={(val: string) =>
                        handleChange(undefined, undefined, val)
                    }
                    placeholder="Day"
                    options={daysArray}
                    disabled={!currentYear || !currentMonth}
                    className="w-1/3"
                />
            </div>

            {/* ERROR */}
            {hasError && (
                <div className="flex gap-1 items-center text-red-500">
                    <Danger size={18} color="#fb2c36" />
                    <p className="text-xs text-red-600">{String(error)}</p>
                </div>
            )}
        </div>
    );
}
