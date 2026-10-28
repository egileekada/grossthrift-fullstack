import { ComponentProps, ReactNode } from "react";
import { Button } from "@heroui/react";

export type CustomVariants =
  | "primary"
  | "primary-outline"
  | "secondary-btn"
  | "secondary-outline"
  | "error"
  | "disabled"
  | "ghost"
  | "outline"
  | "danger"
  | "danger-soft"
  | "tertiary"
  | "solid"
  | "bordered"
  | "light"
  | "flat"
  | "faded"
  | "shadow";

export interface CustomButtonProps
  extends Omit<
    ComponentProps<typeof Button>,
    | "children"
    | "onPress"
    | "type"
    | "variant"
    | "size"
    | "className"
    | "startContent"
    | "endContent"
  > {
  children: ReactNode;
  onPress?: () => void;
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
