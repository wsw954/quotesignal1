"use client";

export default function Select({
  className = "",
  invalid = false,
  children,
  ...props
}) {
  const base =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 " +
    "shadow-sm transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:cursor-not-allowed disabled:opacity-50";

  const state = invalid
    ? "border-red-400 focus-visible:ring-red-300 ring-offset-white"
    : "border-slate-300 focus-visible:ring-slate-400 ring-offset-white";

  return (
    <select className={`${base} ${state} ${className}`} {...props}>
      {children}
    </select>
  );
}
