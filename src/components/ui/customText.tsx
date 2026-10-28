import { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextType =
    // Display
    | "display-lg"
    | "display-md"
    | "display-sm"

    // Headline
    | "headline-lg"
    | "headline-md"
    | "headline-sm"

    // Title
    | "title-lg"
    | "title-md"
    | "title-sm"

    // Body
    | "body-lg"
    | "body-lg-bold"
    | "body-md"
    | "body-md-bold"
    | "body-sm"
    | "body-sm-bold"

    // Label
    | "label-lg"
    | "label-md"
    | "label-sm";

interface TextProps {
    children: ReactNode;
    type?: TextType;
    as?: ElementType;
    className?: string;
}

const variants: Record<TextType, string> = {
    // Display
    "display-lg":
        "font-semibold text-[48px] leading-[52px] tracking-[0px] lg:text-[72px] lg:leading-[86px] lg:tracking-[-0.25px]",

    "display-md":
        "font-semibold text-[36px] leading-[44px] lg:text-[48px] lg:leading-[52px] tracking-[0px]",

    "display-sm":
        "font-semibold text-[24px] leading-[32px] lg:text-[36px] lg:leading-[44px] tracking-[0px]",

    // Headline
    "headline-lg":
        "font-semibold text-[32px] leading-[40px] tracking-[0px]",

    "headline-md":
        "font-semibold text-[28px] leading-[36px] tracking-[0px]",

    "headline-sm":
        "font-semibold text-[24px] leading-[32px] tracking-[0px]",

    // Title
    "title-lg":
        "font-medium text-[22px] leading-[28px] tracking-[0px]",

    "title-md":
        "font-medium text-[16px] leading-[24px] tracking-[0.15px]",

    "title-sm":
        "font-medium text-[14px] leading-[20px] tracking-[0.1px]",

    // Body
    "body-lg":
        "font-normal text-[16px] leading-[24px] tracking-[0.25px]",

    "body-lg-bold":
        "font-bold text-[16px] leading-[24px] tracking-[0.25px]",

    "body-md":
        "font-normal text-[14px] leading-[20px] tracking-[0.25px]",

    "body-md-bold":
        "font-bold text-[14px] leading-[20px] tracking-[0.25px]",

    "body-sm":
        "font-normal text-[12px] leading-[16px] tracking-[0.4px]",

    "body-sm-bold":
        "font-bold text-[12px] leading-[16px] tracking-[0.4px]",

    // Labels
    "label-lg":
        "font-semibold text-[16px] leading-[28px] tracking-[0.1px]",

    "label-md":
        "font-semibold text-[14px] leading-[20px] tracking-[0.5px]",

    "label-sm":
        "font-semibold text-[12px] leading-[16px] tracking-[0.5px]",
};

const defaultElements: Record<TextType, ElementType> = {
    "display-lg": "h1",
    "display-md": "h1",
    "display-sm": "h2",

    "headline-lg": "h2",
    "headline-md": "h3",
    "headline-sm": "h4",

    "title-lg": "h5",
    "title-md": "h6",
    "title-sm": "h6",

    "body-lg": "p",
    "body-lg-bold": "p",
    "body-md": "p",
    "body-md-bold": "p",
    "body-sm": "p",
    "body-sm-bold": "p",

    "label-lg": "span",
    "label-md": "span",
    "label-sm": "span",
};

export default function CustomText({
    children,
    type = "body-md",
    as,
    className,
}: TextProps) {
    const Component = as ?? defaultElements[type];

    return (
        <Component className={cn(variants[type], className)}>
            {children}
        </Component>
    );
}