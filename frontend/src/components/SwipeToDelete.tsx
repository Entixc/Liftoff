import { useRef, useState, type ReactNode, type PointerEvent } from "react";
import { Icon, useUI } from "./ui";
import { errorMessage } from "../api/http";

export function SwipeToDelete({
  children,
  label,
  message,
  onDelete,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  label: string;
  message: string;
  onDelete: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = useRef<{
    x: number;
    y: number;
    base: number;
    horizontal: boolean;
  } | null>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const { confirm, notify } = useUI();
  function down(event: PointerEvent<HTMLDivElement>) {
    // Do not steal input interactions or a gesture from an inner set row.
    if (
      disabled ||
      busy ||
      event.button !== 0 ||
      (event.target as Element).closest("button,input,select,a,label") ||
      (event.target as Element).closest("[data-swipe]") !== event.currentTarget
    )
      return;
    start.current = {
      x: event.clientX,
      y: event.clientY,
      base: open ? -96 : 0,
      horizontal: false,
    };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const gesture = start.current;
    if (!gesture) return;
    const dx = event.clientX - gesture.x,
      dy = event.clientY - gesture.y;
    if (
      !gesture.horizontal &&
      Math.abs(dy) > 10 &&
      Math.abs(dy) > Math.abs(dx)
    ) {
      start.current = null;
      return;
    }
    if (
      !gesture.horizontal &&
      Math.abs(dx) > 10 &&
      Math.abs(dx) > Math.abs(dy)
    ) {
      gesture.horizontal = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (gesture.horizontal) {
      event.stopPropagation();
      setOffset(Math.max(-96, Math.min(0, gesture.base + dx)));
    }
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    if (start.current.horizontal) {
      const nextOpen = offset < -40;
      setOpen(nextOpen);
      setOffset(nextOpen ? -96 : 0);
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    }
    start.current = null;
    setDragging(false);
  }
  async function remove() {
    if (
      !(await confirm({
        title: `Удалить ${label}?`,
        message,
        label: "Удалить",
        danger: true,
      }))
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      notify("Удалено");
    } catch (e) {
      setError(errorMessage(e, "Не удалось удалить. Попробуй ещё раз."));
      setBusy(false);
    }
  }
  return (
    <div className={`swipe-container ${className}`}>
      <button
        ref={deleteButton}
        className="swipe-delete"
        aria-label={`Удалить ${label}`}
        disabled={!open || disabled || busy}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onClick={() => void remove()}
      >
        <Icon name="trash" />
        <span>{busy ? "Удаляем…" : "Удалить"}</span>
      </button>
      <div
        data-swipe
        className={`swipe-content ${dragging ? "is-dragging" : ""}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setOffset(open ? -96 : 0);
        }}
      >
        <button
          className="swipe-toggle icon-button"
          type="button"
          aria-label={`Действия: ${label}`}
          aria-expanded={open}
          disabled={disabled || busy}
          onClick={() => {
            setOpen(!open);
            setOffset(open ? 0 : -96);
            if (!open)
              requestAnimationFrame(() =>
                deleteButton.current?.focus({ preventScroll: true }),
              );
          }}
        >
          <Icon name={open ? "close" : "more"} size={18} />
        </button>
        {children}
        {error && (
          <p className="form-error swipe-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
