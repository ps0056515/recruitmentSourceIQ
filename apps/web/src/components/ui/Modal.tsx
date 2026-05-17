import type { ReactNode } from "react";
import { useEffect } from "react";
import { Box } from "../Box";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Box className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <Box className="relative w-full max-w-md card card-pad shadow-lift" role="dialog" aria-modal>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <Box className="mt-4">{children}</Box>
        {footer ? <Box className="mt-6 flex justify-end gap-2">{footer}</Box> : null}
      </Box>
    </Box>
  );
}
