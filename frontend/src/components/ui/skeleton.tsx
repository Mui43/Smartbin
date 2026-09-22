// src/components/ui/skeleton.tsx
import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800 ${className}`}
      {...props}
    />
  );
}