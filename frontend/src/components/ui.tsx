import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type IconName =
  | "home"
  | "workout"
  | "history"
  | "catalog"
  | "user"
  | "logout"
  | "arrow"
  | "back"
  | "plus"
  | "check"
  | "close"
  | "trash"
  | "more"
  | "clock"
  | "search"
  | "edit"
  | "eye"
  | "leaf";
const paths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M9 21v-8h6v8" />
    </>
  ),
  workout: (
    <>
      <path d="m6 5 13 13M4 8l4-4M2 6l4-4m10 18 4-4m-2 6 4-4M6 10l4-4m4 12 4-4" />
    </>
  ),
  history: (
    <>
      <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  catalog: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H4v16h5m0-8h12m-4-4 4 4-4 4" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  edit: (
    <>
      <path d="m15 4 5 5M4 20l5-1L21 7l-4-4L5 15Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3C8 2 2 8 5 15s16 5 15-12Z" />
      <path d="m3 22 12-13" />
    </>
  ),
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      {...props}
    />
  );
}
export function Input({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
export function PasswordInput({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-input">
        <input {...props} type={visible ? "text" : "password"} />
        <button
          type="button"
          className="icon-button"
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          <Icon name="eye" />
        </button>
      </div>
    </label>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function Badge({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span className={`badge ${active ? "badge-green" : ""}`}>
      {active && <span className="status-dot" />}
      {children}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  icon = "workout",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={30} />
      </span>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-label="Загрузка">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {retry && <Button onClick={retry}>Попробовать снова</Button>}
    </div>
  );
}
type ConfirmOptions = {
  title: string;
  message: string;
  label?: string;
  danger?: boolean;
};
type UIContextValue = {
  notify: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};
const UIContext = createContext<UIContextValue | null>(null);
export const useUI = () => {
  const value = useContext(UIContext);
  if (!value) throw new Error("UIProvider is required");
  return value;
};

// Native dialog supplies focus trapping and Escape handling; focus returns to the trigger.
function ConfirmDialog({
  options,
  resolve,
}: {
  options: ConfirmOptions;
  resolve: (accepted: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => {
        event.preventDefault();
        resolve(false);
      }}
    >
      <span className="empty-icon">
        <Icon name={options.danger ? "trash" : "check"} size={26} />
      </span>
      <h2 id="confirm-title">{options.title}</h2>
      <p id="confirm-description" className="muted">
        {options.message}
      </p>
      <div className="dialog-actions">
        <Button onClick={() => resolve(false)} autoFocus>
          Отмена
        </Button>
        <Button
          variant={options.danger ? "danger" : "primary"}
          onClick={() => resolve(true)}
        >
          {options.label ?? "Подтвердить"}
        </Button>
      </div>
    </dialog>
  );
}
export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null,
  );
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => () => resolver.current?.(false), []);
  function resolve(answer: boolean) {
    resolver.current?.(answer);
    resolver.current = null;
    setDialog(null);
  }
  return (
    <UIContext.Provider
      value={{
        notify: (message) => setToast({ message, id: Date.now() }),
        confirm: (options) =>
          new Promise<boolean>((done) => {
            resolver.current?.(false);
            resolver.current = done;
            setDialog(options);
          }),
      }}
    >
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast">
            <Icon name="check" />
            <span>{toast.message}</span>
            <button
              className="icon-button"
              aria-label="Закрыть уведомление"
              onClick={() => setToast(null)}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </div>
      {dialog && <ConfirmDialog options={dialog} resolve={resolve} />}
    </UIContext.Provider>
  );
}
