"use client";

/**
 * Card primitives (v1)
 * - Centralizes the common "panel" look: border, rounding, padding, background.
 * - Keep the styling here so you can upgrade the whole app later by changing this file.
 */

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }) {
  return (
    <div className={`px-6 pt-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...props }) {
  return (
    <h2
      className={`text-xl font-semibold leading-tight ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardDescription({ className = "", children, ...props }) {
  return (
    <p className={`mt-1 text-sm text-slate-600 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return (
    <div className={`px-6 pb-6 pt-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }) {
  return (
    <div
      className={`flex items-center gap-3 border-t border-slate-200 px-6 py-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
