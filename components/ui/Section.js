"use client";

/**
 * Section primitive (v1)
 * Use this to structure pages/forms into consistent blocks:
 * - Optional title + description
 * - Consistent spacing
 * - Optional "divider" for visual separation
 */

export default function Section({
  title,
  description,
  children,
  className = "",
  headerClassName = "",
  contentClassName = "",
  divider = false,
  as: Tag = "section",
  ...props
}) {
  return (
    <Tag
      className={`space-y-4 ${divider ? "pb-6 border-b border-slate-200" : ""} ${className}`}
      {...props}
    >
      {title || description ? (
        <div className={`space-y-1 ${headerClassName}`}>
          {title ? (
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          ) : null}

          {description ? (
            <p className="text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
      ) : null}

      <div className={`${contentClassName}`}>{children}</div>
    </Tag>
  );
}
