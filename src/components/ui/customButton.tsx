"use client";

import { Button } from "@heroui/react";
import { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import { CustomVariants } from "@/types/ui";

type HeroVariants = NonNullable<ComponentProps<typeof Button>["variant"]>;

interface AppButtonProps
    extends Omit<
        ComponentProps<typeof Button>,
        | "children"
        | "onPress"
        | "onClick"
        | "type"
        | "variant"
        | "size"
        | "className"
        | "startContent"
        | "endContent"
    > {
    children: ReactNode;
    onPress?: () => void;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    variant?: CustomVariants;
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    fullWidth?: boolean;
    startContent?: ReactNode;
    endContent?: ReactNode;
    role?: string;
    "aria-label"?: string;
    "aria-selected"?: boolean;
}

export function AppButton({
    children,
    onPress,
    onClick,
    type = "button",
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    className,
    fullWidth,
    startContent,
    endContent,
    ...rest
}: AppButtonProps) {
    const heroVariants: string[] = [
        "solid",
        "bordered",
        "light",
        "flat",
        "faded",
        "shadow",
        "ghost",
    ];

    const isHeroVariant = heroVariants.includes(variant as string);
    const isCustomPrimary = variant === "primary";

    const customClasses = clsx({
        "bg-charcoal text-white dark:text-[#141c17]":
            variant === "primary",
        "border border-border bg-white text-ink hover:bg-surface":
            variant === "primary-outline" || variant === "outline",
        "bg-surface text-ink border border-border":
            variant === "secondary-btn",
        "border border-border bg-transparent text-slate hover:bg-surface":
            variant === "secondary-outline",
        "bg-error-300 text-white transition-all duration-300 hover:bg-error-250":
            variant === "error",
        "bg-primary-150 text-neutral-500 transition-all duration-300 ease-in-out":
            variant === "disabled",
    });

    return (
        <Button
            type={type}
            onPress={onPress ?? onClick}
            isDisabled={disabled || loading}
            variant={isHeroVariant ? (variant as HeroVariants) : "ghost"}
            style={{
                height:
                    size === "lg" ? "52px" : size === "md" ? "44px" : "38px",
            }}
            {...rest}
            className={clsx(
                (isCustomPrimary || !isHeroVariant || variant === "outline") &&
                    customClasses,
                fullWidth ? " w-full " : " w-fit ",
                size === "lg"
                    ? " h-[44px] lg:h-[52px] "
                    : size === "md"
                      ? " h-[40px] lg:h-[44px] "
                      : " h-[38px] ",
                " rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ",
                className,
            )}
        >
            {!loading && (
                <>
                    {startContent}
                    {children}
                    {endContent}
                </>
            )}
            {loading && (
                <p className="text-xs font-semibold">Loading...</p>
            )}
        </Button>
    );
}
