import { createElement, type HTMLAttributes, type ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { children?: ReactNode };

export function Box({ children, ...props }: Props) {
  return createElement("div", props, children);
}
