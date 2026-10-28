'use client';

import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

export interface ModalLayoutProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  title?: React.ReactNode;
  open: boolean;
  onOpenChange: (open?: boolean) => void;
  children: React.ReactNode;
}

export function ModalLayout({
  size = "md",
  title,
  open,
  onOpenChange,
  children,
}: ModalLayoutProps) {
  return (
    <Modal isOpen={open} onOpenChange={onOpenChange} size={size}>
      <ModalContent>
        {() => (
          <>
            {title && <ModalHeader>{title}</ModalHeader>}
            <ModalBody className="p-4">{children}</ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
