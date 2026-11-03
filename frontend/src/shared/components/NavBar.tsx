import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/Button";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "@/shared/hooks/useAuth";

export default function NavBar() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const nextThemeLabel = theme === "dark" ? "light" : "dark";

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="border-b border-border-subtle bg-surface-white">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-offset-4"
          aria-label="The Crown & Anchor home"
        >
          <img
            src={
              theme === "dark"
                ? "/brand/logo/crown-anchor-delivery-logo-white.png"
                : "/brand/logo/crown-anchor-delivery-logo-black.png"
            }
            alt=""
            className="size-12 shrink-0 object-contain"
          />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-brand-red">
              The Crown &amp; Anchor
            </span>
            <span className="hidden text-xs tracking-[0.16em] text-text-slate sm:block">
              MORE THAN JUST A DELIVERY APP
            </span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="ms-auto flex items-center gap-1 sm:gap-2">
          <Link
            to="/meals"
            className="rounded-lg px-3 py-2 text-sm font-medium text-text-main transition-colors hover:bg-brand-yellow/20"
          >
            Meals
          </Link>
          {isAuthenticated ? (
            <>
              <span className="hidden max-w-24 truncate text-xs text-text-slate sm:inline" title={user?.name}>
                {user?.name}
              </span>
              <Button variant="outline" size="sm" loading={isLoggingOut} onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-main transition-colors hover:bg-brand-yellow/20"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-red px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-red-hover"
              >
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextThemeLabel} mode`}
            title={`Switch to ${nextThemeLabel} mode`}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-surface-cream text-text-main transition-colors hover:border-brand-yellow hover:bg-brand-yellow/20"
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" size={18} />
            ) : (
              <Moon aria-hidden="true" size={18} />
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
