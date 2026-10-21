import { useEffect, useRef, type ReactNode } from "react";
import type { UserProfile } from "../api/auth";
import { Badge, Icon, type IconName } from "./ui";

export const pages = [
  { id: "home", title: "Главная", icon: "home" },
  { id: "workout", title: "Тренировка", icon: "workout" },
  { id: "routines", title: "Рутины", icon: "routine" },
  { id: "history", title: "История", icon: "history" },
  { id: "catalog", title: "Упражнения", icon: "catalog" },
  { id: "profile", title: "Профиль", icon: "user" },
] as const;
export type Page = (typeof pages)[number]["id"];
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Icon name="workout" size={23} />
      </span>
      <span>
        LIFTOFF<span className="brand-caption">WORKOUT JOURNAL</span>
      </span>
    </span>
  );
}
export function AppShell({
  page,
  detailId,
  profile,
  active,
  onLogout,
  children,
}: {
  page: Page;
  detailId: number | null;
  profile: UserProfile;
  active: boolean;
  onLogout: () => void;
  children: ReactNode;
}) {
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    document.title = `${pages.find((p) => p.id === page)?.title} · Liftoff`;
    content.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, detailId]);
  function navLink(item: { id: Page; title: string; icon: IconName }) {
    return (
      <a
        key={item.id}
        href={`#/${item.id}`}
        aria-current={page === item.id ? "page" : undefined}
        className={`nav-link ${page === item.id ? "nav-active" : ""}`}
      >
        <Icon name={item.icon} />
        <span>{item.title}</span>
        {item.id === "workout" && active && <span className="nav-dot" />}
      </a>
    );
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#page-content"
        onClick={(event) => {
          event.preventDefault();
          content.current?.focus();
        }}
      >
        Перейти к содержимому
      </a>
      <aside className="sidebar">
        <a className="brand-link" href="#/home" aria-label="Liftoff — главная">
          <Brand />
        </a>
        <p className="nav-caption">ТВОЁ ПРОСТРАНСТВО</p>
        <nav aria-label="Основная навигация">{pages.map(navLink)}</nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Icon name="leaf" />
            <p>
              В своём темпе.
              <br />
              <strong>С каждым подходом.</strong>
            </p>
          </div>
          <button className="nav-link logout-link" onClick={onLogout}>
            <Icon name="logout" />
            <span>Выйти из аккаунта</span>
          </button>
          <span className="sidebar-footnote">
            Liftoff · Твой дневник тренировок
          </span>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div>
            <span className="desktop-breadcrumb">
              Моё пространство <span>/</span>{" "}
              <strong>{pages.find((p) => p.id === page)?.title}</strong>
            </span>
            <a className="mobile-brand brand-link" href="#/home">
              <Brand />
            </a>
          </div>
          <div className="topbar-right">
            {active && (
              <a href="#/workout" className="live-link">
                <Badge active>Тренировка идёт</Badge>
              </a>
            )}
            <a
              href="#/profile"
              className="profile-link"
              aria-label="Открыть профиль"
            >
              <span className="profile-name">{profile.nickname}</span>
              <span className="avatar">
                {profile.nickname.slice(0, 1).toUpperCase()}
              </span>
            </a>
          </div>
        </header>
        <main
          id="page-content"
          ref={content}
          tabIndex={-1}
          className="page-content"
        >
          {children}
        </main>
        <footer className="app-footer">
          <span>Сильнее, чем вчера.</span>
          <span>LIFTOFF</span>
        </footer>
      </div>
      <nav className="mobile-navigation" aria-label="Мобильная навигация">
        {pages.filter((p) => p.id !== "profile").map(navLink)}
      </nav>
    </div>
  );
}
