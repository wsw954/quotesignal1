"use client";

export default function Field({
  label,
  htmlFor,
  helperText,
  error,
  required = false,
  children,
  className = "",
}) {
  // If the child is one of our primitives (Input/Select) it will accept `invalid`.
  // For plain HTML <input>/<select>, we just render it as-is.
  const enhancedChild =
    error && children && typeof children === "object"
      ? tryCloneWithInvalid(children)
      : children;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-slate-900"
        >
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </label>
      ) : null}

      {enhancedChild}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-sm text-slate-600">{helperText}</p>
      ) : null}
    </div>
  );
}

function tryCloneWithInvalid(child) {
  // Avoid importing React just for cloneElement; Next will have it available,
  // but to keep this file minimal, we do a safe runtime check.
  // eslint-disable-next-line no-undef
  const React = require("react");
  if (!React?.isValidElement?.(child)) return child;
  return React.cloneElement(child, { invalid: true });
}
