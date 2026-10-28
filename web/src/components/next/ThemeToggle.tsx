"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useSpringIn } from "@/design/useSpringIn";
import type { ThemeText } from "@/i18n/theme";

export type ThemeChoice = "system" | "dark" | "light";
const KEY = "corvus-theme";

function stored(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : "system";
  } catch {
    return "system";
  }
}

/** Applies a choice to <html>: dark or light set data-theme, system removes it so the device's setting decides, live. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

const ICONS: Record<ThemeChoice, string> = {
  system: "M4 5h16v11H4zM9 20h6M12 16v4",
  dark: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  light: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
};

/** The appearance choice: System (default), Dark, Light, remembered in localStorage when the browser allows it. */
export function ThemeToggle({ labels }: { labels: ThemeText }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();
  useSpringIn(pop, open);

  useEffect(() => setChoice(stored()), []);

  const close = useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || pop.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    pop.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const pick = (c: ThemeChoice): void => {
    setChoice(c);
    applyTheme(c);
    try {
      if (c === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, c);
    } catch {
      /* storage can be unavailable (private mode): the choice then lasts for this page only */
    }
    close();
  };

  const options: ThemeChoice[] = ["system", "dark", "light"];
  return (
    <div className="ac-lang">
      <button
        ref={btn}
        type="button"
        className="ac-iconbtn"
        aria-label={`${labels.label}: ${labels[choice]}`}
        title={labels.label}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={ICONS[choice]} />
        </svg>
      </button>
      <div ref={pop} id={id} className="ac-pop ac-pop--lang ac-glass" hidden={!open} role="radiogroup" aria-label={labels.label}>
        <ul>
          {options.map((c) => (
            <li key={c}>
              <button type="button" role="radio" aria-checked={choice === c} className="ac-pop-item cn-theme-item" onClick={() => pick(c)}>
                <span>{labels[c]}</span>
                {choice === c ? <small aria-hidden="true">✓</small> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
