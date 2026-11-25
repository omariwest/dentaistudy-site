import { useRef } from "react";

type NumberInputProps = {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  step?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
};

export default function NumberInput({
  id, label, value, onChange, step = "1", min, max, disabled = false,
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const adjust = (direction: 1 | -1) => {
    const input = inputRef.current;
    if (!input || disabled) return;
    if (direction === 1) input.stepUp();
    else input.stepDown();
    onChange(input.value);
    input.focus({ preventScroll: true });
  };

  return (
    <span className="number-input">
      <input
        ref={inputRef}
        id={id}
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="number-input__steppers">
        <button type="button" aria-label={`Increase ${label}`} disabled={disabled}
          onClick={() => adjust(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>
        <button type="button" aria-label={`Decrease ${label}`} disabled={disabled}
          onClick={() => adjust(-1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </span>
    </span>
  );
}
