import type { ReactNode } from "react";
import { Box } from "../Box";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: Props) {
  return (
    <Box className="card card-pad flex flex-col items-center justify-center py-14 text-center">
      {icon ? <Box className="mb-4 text-4xl opacity-60">{icon}</Box> : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <Box className="mt-5">{action}</Box> : null}
    </Box>
  );
}
