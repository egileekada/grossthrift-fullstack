"use client";
import { useRef, useState, useEffect } from "react";
import { useFormikContext, getIn } from "formik";
import CustomImage from "./customImage";
import { ArrowCircleUp2, CloseCircle, Danger } from "iconsax-reactjs";
import { LuCornerDownRight, LuScrollText } from "react-icons/lu"; 
import { textLimit } from "@/config/textlimit";

type FilePickerProps = {
    name: string;
    label?: string;
    multiple?: boolean;
    document?: string;
};

export default function FilePicker<T extends Record<string, unknown> = Record<string, unknown>>({
    name,
    label,
    multiple = false,
    document,
}: FilePickerProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const { values, errors, touched, setFieldValue, setFieldTouched } =
        useFormikContext<T>();

    // safely access formik state using getIn
    const fieldValue = getIn(values, name) as File | File[] | null;
    const fieldError = getIn(errors, name) as string | undefined;
    const fieldTouched = getIn(touched, name) as boolean | undefined;

    const [previewImages, setPreviewImages] = useState<string[]>([]);

    const handleImageChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const fileArray = Array.from(files);

        if (multiple) {
            const existing = (fieldValue as File[]) || [];
            await setFieldValue(name, [...existing, ...fileArray]);
        } else {
            await setFieldValue(name, fileArray[0]);
        }

        setFieldTouched(name, true);

        const previews = fileArray.map((file) => URL.createObjectURL(file));

        setPreviewImages((prev) =>
            multiple ? [...prev, ...previews] : previews,
        );
    };

    const removeImage = (index: number) => {
        if (multiple) {
            const files = (fieldValue as File[]) || [];
            const updatedFiles = files.filter((_, i) => i !== index);

            const updatedPreviews = previewImages.filter((_, i) => i !== index);

            setFieldValue(name, updatedFiles);
            setPreviewImages(updatedPreviews);
        } else {
            setFieldValue(name, null);
            setPreviewImages([]);
        }
    };

    // cleanup object URLs (avoid memory leaks)
    useEffect(() => {
        return () => {
            previewImages.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [previewImages]); 

    return (
        <div className="w-full flex flex-col gap-1">
            {label && (
                <label className="text-sm font-medium text-grey-04">
                    {label}
                </label>
            )}

            {/* Upload trigger */}
            <div className="w-full bg-grey-01 rounded-[8px] border text-grey-04 border-grey-02 py-1 h-fit text-sm flex flex-col items-center justify-between px-3">
                <div
                    onClick={() => inputRef.current?.click()}
                    className=" flex w-full items-center h-[45px] justify-between cursor-pointer "
                >
                    <div className=" flex items-center gap-2 ">
                        {document && <LuScrollText size={20} />}
                        {document ?? "Click to upload"}
                    </div>
                    <ArrowCircleUp2 size={20} color="#000" />
                </div>
                <>
                    {multiple && (
                        <>
                            {Array.isArray(fieldValue) &&
                                (fieldValue as File[]).map((file, index) => {
                                    if (file.name) {
                                        const fileExtension =
                                            file.name.split(".").pop() || "";

                                        const fileNameWithoutExtension =
                                            file.name.replace(
                                                `.${fileExtension}`,
                                                "",
                                            );

                                        const displayName =
                                            fileNameWithoutExtension.length > 12
                                                ? `${textLimit(
                                                      fileNameWithoutExtension,
                                                      12,
                                                  )}.${fileExtension}`
                                                : file.name;

                                        return (
                                            <div
                                                key={index}
                                                className="flex w-full text-success-80 items-center text-sm pb-1 gap-2 h-fit"
                                            >
                                                <LuCornerDownRight size={16} />

                                                <p>{displayName}</p>

                                                <div className="w-1 h-1 rounded-full bg-grey-04" />

                                                <p className="text-grey-04">
                                                    {(file.size / 1024).toFixed(
                                                        2,
                                                    )}
                                                    KB
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeImage(index)
                                                    }
                                                    className="text-grey-04"
                                                >
                                                    <CloseCircle size={18} />
                                                </button>
                                            </div>
                                        );
                                    }

                                    return null;
                                })}
                        </>
                    )}
                    {!multiple && (
                        <>
                            {Array.isArray([fieldValue]) &&
                                ([fieldValue] as File[]).map((file, index) => {
                                    if (file?.name) {
                                        const fileExtension =
                                            file.name.split(".").pop() || "";

                                        const fileNameWithoutExtension =
                                            file.name.replace(
                                                `.${fileExtension}`,
                                                "",
                                            );

                                        const displayName =
                                            fileNameWithoutExtension.length > 12
                                                ? `${textLimit(
                                                      fileNameWithoutExtension,
                                                      12,
                                                  )}.${fileExtension}`
                                                : file.name;

                                        return (
                                            <div
                                                key={index}
                                                className="flex w-full text-success-80 items-center text-sm pb-1 gap-2 h-fit"
                                            >
                                                <LuCornerDownRight size={16} />

                                                <p>{displayName}</p>

                                                <div className="w-1 h-1 rounded-full bg-grey-04" />

                                                <p className="text-grey-04">
                                                    {(file.size / 1024).toFixed(
                                                        2,
                                                    )}
                                                    KB
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeImage(index)
                                                    }
                                                    className="text-grey-04"
                                                >
                                                    <CloseCircle size={18} />
                                                </button>
                                            </div>
                                        );
                                    }

                                    return null;
                                })}
                        </>
                    )}
                </>
            </div>

            {/* Hidden input */}
            <input
                ref={inputRef}
                type="file"
                accept={
                    document
                        ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        : "image/*"
                }
                multiple={multiple}
                className="hidden"
                onChange={handleImageChange}
            />

            {/* Preview */}
            {!document && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {previewImages.map((img, index) => (
                        <div
                            key={index}
                            className="relative w-16 h-16 rounded-[8px] overflow-hidden bg-grey-01"
                        >
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-0 right-0 z-10 bg-white rounded-[8px]"
                            >
                                <CloseCircle size={16} color="red" />
                            </button>

                            <CustomImage
                                src={img}
                                alt="preview"
                                layout="fill"
                                className="object-cover w-full h-full"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {fieldTouched && fieldError && (
                <div className="flex gap-1 items-center text-red-500">
                    <Danger size={18} color="#fb2c36" />
                    <p className="text-xs capitalize font-medium ">
                        {fieldError}
                    </p>
                </div>
            )}
        </div>
    );
}
