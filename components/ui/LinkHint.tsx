import type { ReactNode } from "react";

interface LinkHintProps {
  before?: ReactNode;
  href: string;
  children: ReactNode;
  after?: ReactNode;
}

export function LinkHint({ before, href, children, after }: LinkHintProps) {
  return (
    <>
      {before}
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
      {after}
    </>
  );
}
