import { useEffect, useMemo, useRef, useState } from "react";

export type UiSelectOption = {
  value: string;
  label?: string;
  group?: string;
  disabled?: boolean;
};

type UiSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Array<string | UiSelectOption>;
  ariaLabel?: string;
  disabled?: boolean;
};

export default function UiSelect({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
}: UiSelectProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);

  const normalized = useMemo(
    () =>
      options.map((option) =>
        typeof option === "string"
          ? { value: option, label: option }
          : { ...option, label: option.label ?? option.value },
      ),
    [options],
  );

  const groups = useMemo(() => {
    const result: Array<{
      label: string | null;
      options: Array<Required<Pick<UiSelectOption, "value" | "label">> & UiSelectOption>;
    }> = [];

    normalized.forEach((option) => {
      const label = option.group ?? null;
      const current = result[result.length - 1];

      if (!current || current.label !== label) {
        result.push({ label, options: [option] });
      } else {
        current.options.push(option);
      }
    });

    return result;
  }, [normalized]);

  const selected =
    normalized.find((option) => option.value === value) ?? normalized[0];

  const close = (returnFocus = false) => {
    setOpen(false);
    setDropUp(false);

    if (returnFocus) {
      requestAnimationFrame(() => buttonRef.current?.focus());
    }
  };

  const focusOption = (direction: 1 | -1) => {
    const optionButtons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        ".ui-select-option:not(:disabled)",
      ) ?? [],
    );

    if (!optionButtons.length) return;

    const currentIndex = optionButtons.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const nextIndex =
      currentIndex < 0
        ? direction > 0
          ? 0
          : optionButtons.length - 1
        : (currentIndex + direction + optionButtons.length) %
          optionButtons.length;

    optionButtons[nextIndex].focus();
  };

  const openMenu = () => {
    if (disabled || !normalized.length) return;

    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    const rect = button.getBoundingClientRect();
    const menuHeight = Math.min(menu.scrollHeight || 230, 230);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const shouldDropUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    menu.style.maxHeight = `${Math.max(
      96,
      Math.min(230, Math.floor(shouldDropUp ? spaceAbove : spaceBelow)),
    )}px`;

    setDropUp(shouldDropUp);
    setOpen(true);

    requestAnimationFrame(() => {
      const selectedButton =
        menu.querySelector<HTMLButtonElement>(".ui-select-option.is-selected") ??
        menu.querySelector<HTMLButtonElement>(".ui-select-option:not(:disabled)");
      selectedButton?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };

    const handleResize = () => close();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  return (
    <div
      className={`ui-select${open ? " is-open" : ""}${dropUp ? " is-dropup" : ""}`}
      ref={wrapperRef}
    >
      <button
        className="ui-select-button"
        type="button"
        ref={buttonRef}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || !normalized.length}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              openMenu();
            }
          }
        }}
      >
        <span className="ui-select-button-label">
          {selected?.label ?? "Select"}
        </span>
        <svg
          className="ui-select-chevron"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        className="ui-select-menu"
        role="listbox"
        ref={menuRef}
        aria-label={ariaLabel}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            focusOption(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            focusOption(-1);
          } else if (event.key === "Home") {
            event.preventDefault();
            menuRef.current
              ?.querySelector<HTMLButtonElement>(".ui-select-option:not(:disabled)")
              ?.focus();
          } else if (event.key === "End") {
            event.preventDefault();
            const optionButtons = menuRef.current?.querySelectorAll<HTMLButtonElement>(
              ".ui-select-option:not(:disabled)",
            );
            optionButtons?.[optionButtons.length - 1]?.focus();
          }
        }}
      >
        {groups.map((group, groupIndex) => (
          <div
            className="ui-select-group"
            role={group.label ? "group" : undefined}
            aria-label={group.label ?? undefined}
            key={group.label ?? `group-${groupIndex}`}
          >
            {group.label && (
              <span className="ui-select-group-label">{group.label}</span>
            )}
            {group.options.map((option) => (
              <button
                className={`ui-select-option${
                  option.value === value ? " is-selected" : ""
                }`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  close(true);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
