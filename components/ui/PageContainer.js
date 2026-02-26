"use client";

/**
 * PageContainer (v1)
 * - Standardizes page width + horizontal padding.
 * - Optional "size" lets you switch widths without rewriting pages.
 */

export default function PageContainer({
  className = "",
  children,
  size = "md", // sm | md | lg | xl
  ...props
}) {
  const sizes = {
    sm: "max-w-2xl",
    md: "max-w-3xl",
    lg: "max-w-5xl",
    xl: "max-w-6xl",
  };

  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
