"use client";

export default function Button({
  children,
  className = "",
  variant = "primary", // primary | secondary | ghost | danger
  size = "md", // sm | md | lg
  type = "button",
  disabled = false,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
  };

  const variants = {
    primary:
      "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400 ring-offset-white",
    secondary:
      "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400 ring-offset-white",
    ghost:
      "bg-transparent text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400 ring-offset-white",
    danger:
      "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-300 ring-offset-white",
  };

  return (
    <button
      type={type}
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
