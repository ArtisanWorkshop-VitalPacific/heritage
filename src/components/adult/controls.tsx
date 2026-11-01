"use client";

/** Small controls shared by onboarding and settings. Base styles come from globals.css. */

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label} aria-disabled={disabled || undefined}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={disabled}
          onClick={() => value !== v && onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="switch" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} />;
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="ap-stepper" role="group" aria-label={label}>
      <button type="button" className="btn btn-icon" aria-label={`${label}: fewer`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <span aria-hidden>−</span>
      </button>
      <output className="ap-stepper-value num" aria-live="polite">
        {value}
      </output>
      <button type="button" className="btn btn-icon" aria-label={`${label}: more`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <span aria-hidden>+</span>
      </button>
    </div>
  );
}
