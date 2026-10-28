"use client";

import Image, { ImageProps, StaticImageData } from "next/image";
import React, { useState } from "react";
import { ModalLayout } from "../layouts";
import { cn } from "@/lib/utils";

type ImgSrc = string | StaticImageData;

type Layout = "fill" | "height" | "width" | "intrinsic";

type Props = Omit<ImageProps, "src"> & {
    src: ImgSrc;
    alt: string;
    fallbackSrc?: ImgSrc;

    /**
     * fill       -> fills parent (parent must be relative)
     * height     -> fills height, width auto
     * width      -> fills width, height auto
     * intrinsic  -> normal next/image
     */
    layout?: Layout;

    /**
     * Only used when layout="fill"
     */
    objectFit?: "cover" | "contain";

    /**
     * Creates an aspect ratio box
     * Example: 16/9
     */
    aspectRatio?: number;

    overlayer?: boolean;
    disablePreview?: boolean;
    className?: string;
    imageClassName?: string;
    priority?: boolean;
    borderRadius?: string
};

function isStaticImage(src: ImgSrc): src is StaticImageData {
    return typeof src === "object";
}

export default function CustomImage({
    src,
    alt,
    fallbackSrc = "/images/fallback.png",

    layout = "intrinsic",
    objectFit = "cover",
    aspectRatio,

    overlayer = false,
    disablePreview = false, 
    imageClassName = "",

    priority = false,
    borderRadius,

    ...rest
}: Props) {
    const [imgSrc, setImgSrc] = useState<ImgSrc>(src);
    const [previewSrc, setPreviewSrc] = useState<ImgSrc | null>(null);

    const isStatic = isStaticImage(imgSrc);

    const handleError = () => {
        if (imgSrc !== fallbackSrc) {
            setImgSrc(fallbackSrc);
        }
    };

    const openPreview = () => {
        if (disablePreview) {
            setPreviewSrc(imgSrc);
        }
    };

    const closePreview = () => setPreviewSrc(null);

    const fitClass =
        objectFit === "contain" ? "object-contain" : "object-cover";

    const staticProps: Partial<
        Pick<ImageProps, "width" | "height" | "placeholder" | "blurDataURL">
    > = isStatic
        ? {
              width: imgSrc.width,
              height: imgSrc.height,
              placeholder: imgSrc.blurDataURL ? "blur" : "empty",
              blurDataURL: imgSrc.blurDataURL,
          }
        : {};

    const {
        sizes: sizesFromRest,
        width,
        height,
        className,
        ...imageRest
    } = rest;

    const sharedProps: Omit<ImageProps, "fill"> = {
        src: imgSrc,
        alt,
        onError: handleError,
        loading: priority ? "eager" : "lazy",
        sizes:
            sizesFromRest ??
            (layout === "fill" || aspectRatio ? "100vw" : undefined),
        ...staticProps,
        ...imageRest,
    };

    const renderOverlay = () =>
        overlayer && (
            <div className="absolute inset-0 rounded-lg bg-black/40" />
        );

    const renderModal = () => (
        <ModalLayout
            size="lg"
            title="Preview Image"
            open={!!previewSrc}
            onOpenChange={closePreview}
        >
            <div className="relative flex h-[500px] w-full items-center justify-center rounded-2xl bg-gray-200">
                {previewSrc && (
                    <Image
                        src={previewSrc}
                        alt={alt}
                        fill
                        className="object-contain p-4"
                    />
                )}
            </div>
        </ModalLayout>
    );

    // ==========================================
    // Aspect Ratio
    // ==========================================

    if (aspectRatio) {
        return (
            <>
                <div
                    onClick={openPreview}
                    className={cn("relative w-full", className)}
                    style={{
                        paddingTop: `${(1 / aspectRatio) * 100}%`,
                    }}
                >
                    <Image
                        {...sharedProps}
                        alt={alt}
                        fill
                        className={cn(fitClass, imageClassName)}
                    />

                    {renderOverlay()}
                </div>

                {renderModal()}
            </>
        );
    }

    // ==========================================
    // Fill Parent
    // ==========================================

    if (layout === "fill") {
        return (
            <>
                <div
                    onClick={openPreview}
                    className={cn(
                        "relative h-full w-full cursor-pointer",
                        className
                    )}
                >
                    <Image
                        {...sharedProps}
                        alt={alt}
                        fill
                        style={{ borderRadius: borderRadius}}
                        className={cn(fitClass, imageClassName)}
                    />

                    {renderOverlay()}
                </div>

                {renderModal()}
            </>
        );
    }

    // ==========================================
    // Fill Height
    // ==========================================

    if (layout === "height") {
        return (
            <>
                <div
                    onClick={openPreview}
                    className={cn(
                        "relative h-full w-fit cursor-pointer",
                        className
                    )}
                >
                    <Image
                        {...sharedProps}
                        alt={alt}
                        width={isStatic ? imgSrc.width : Number(width ?? 1000)}
                        height={
                            isStatic ? imgSrc.height : Number(height ?? 1000)
                        }
                        style={{ borderRadius: borderRadius}}
                        className={cn(
                            "h-full w-auto max-w-none",
                            imageClassName
                        )}
                    />

                    {renderOverlay()}
                </div>

                {renderModal()}
            </>
        );
    }

    // ==========================================
    // Fill Width
    // ==========================================

    if (layout === "width") {
        return (
            <>
                <div
                    onClick={openPreview}
                    className={cn("relative w-full cursor-pointer", className)}
                >
                    <Image
                        {...sharedProps}
                        alt={alt}
                        width={isStatic ? imgSrc.width : Number(width ?? 1000)}
                        height={
                            isStatic ? imgSrc.height : Number(height ?? 1000)
                        }
                        style={{ borderRadius: borderRadius}}
                        className={cn("h-auto w-full", imageClassName)}
                    />

                    {renderOverlay()}
                </div>

                {renderModal()}
            </>
        );
    }

    // ==========================================
    // Intrinsic
    // ==========================================

    return (
        <>
            <div
                onClick={openPreview}
                className={cn("relative inline-block cursor-pointer", className)}
            >
                <Image
                    {...sharedProps}
                    alt={alt}
                    width={isStatic ? imgSrc.width : width}
                    height={isStatic ? imgSrc.height : height}
                    className={cn(imageClassName)}
                />

                {renderOverlay()}
            </div>

            {renderModal()}
        </>
    );
}