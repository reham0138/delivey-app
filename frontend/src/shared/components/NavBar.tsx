import { useEffect, useState } from "react";
import {
  House,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserPlus,
  Utensils,
  Store,
  ClipboardList,
  ShoppingCart,
  X,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/shared/components/Button";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCart } from "@/shared/hooks/useCart";

export default function NavBar() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const cart = useCart();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const nextThemeLabel = theme === "dark" ? "light" : "dark";

  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
      closeSidebar();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
      isActive
        ? "bg-brand-red/10 text-brand-red"
        : "text-text-main hover:bg-brand-yellow/20"
    }`;

  return (
    <>
      <header className="relative z-30 border-b border-border-subtle bg-surface-white">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/"
            onClick={closeSidebar}
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

          <div className="ms-auto flex items-center gap-2">
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

            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isSidebarOpen}
              aria-controls="main-navigation-sidebar"
              className="inline-flex size-10 items-center justify-center rounded-full bg-brand-red text-white transition-colors hover:bg-brand-red-hover focus-visible:outline-offset-4"
            >
              {isSidebarOpen ? (
                <X aria-hidden="true" size={21} />
              ) : (
                <Menu aria-hidden="true" size={21} />
              )}
            </button>
          </div>
        </div>
      </header>

      {isSidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeSidebar}
            className="fixed inset-0 z-40 cursor-default bg-black/45"
          />

          <aside
            id="main-navigation-sidebar"
            aria-label="Main navigation"
            className="fixed inset-y-0 right-0 z-50 flex w-[min(88vw,360px)] flex-col border-l border-border-subtle bg-surface-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-5">
              <div>
                <p className="font-semibold text-brand-red">The Crown &amp; Anchor</p>
                <p className="mt-1 text-xs text-text-slate">Your next meal starts here</p>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close navigation menu"
                className="inline-flex size-9 items-center justify-center rounded-full text-text-main transition-colors hover:bg-brand-yellow/20"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto p-4">
              <NavLink to="/" end onClick={closeSidebar} className={linkClassName}>
                <House aria-hidden="true" size={19} />
                Home
              </NavLink>
              <NavLink to="/meals" onClick={closeSidebar} className={linkClassName}>
                <Utensils aria-hidden="true" size={19} />
                Meals
              </NavLink>
              <NavLink to="/restaurants" onClick={closeSidebar} className={linkClassName}>
                <Store aria-hidden="true" size={19} />
                Restaurants
              </NavLink>
              {cart.totalItems > 0 && (
                <NavLink to="/checkout" onClick={closeSidebar} className={linkClassName}>
                  <ShoppingCart aria-hidden="true" size={19} />
                  Checkout ({cart.totalItems})
                </NavLink>
              )}
              {isAuthenticated && (
                <NavLink to="/orders" onClick={closeSidebar} className={linkClassName}>
                  <ClipboardList aria-hidden="true" size={19} />
                  My orders
                </NavLink>
              )}

              <div className="my-4 border-t border-border-subtle" />

              {isAuthenticated ? (
                <>
                  <div className="rounded-xl bg-surface-cream px-4 py-3">
                    <p className="text-xs text-text-slate">Signed in as</p>
                    <p className="mt-1 truncate text-sm font-semibold text-text-main">
                      {user?.name || "Your account"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full"
                    loading={isLoggingOut}
                    onClick={handleLogout}
                  >
                    <LogOut aria-hidden="true" size={17} />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <NavLink to="/login" onClick={closeSidebar} className={linkClassName}>
                    <LogIn aria-hidden="true" size={19} />
                    Sign in / Log in
                  </NavLink>
                  <NavLink to="/register" onClick={closeSidebar} className={linkClassName}>
                    <UserPlus aria-hidden="true" size={19} />
                    Create account / Sign up
                  </NavLink>
                </>
              )}
            </nav>

            <div className="border-t border-border-subtle px-5 py-4">
              <p className="text-xs text-text-slate">MORE THAN JUST A DELIVERY APP</p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
