"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Today" },
  { href: "/tasks", label: "Tasks" },
  { href: "/clients", label: "Clients" },
  { href: "/checkin", label: "Check-in" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-[var(--color-border)] shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[var(--color-primary)]">Ivy Lee</span>
            <span className="text-sm text-[var(--color-text-muted)] font-medium">
              Tracker
            </span>
          </Link>
          <div className="flex gap-1">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                      : "text-[var(--color-dark-muted)] hover:text-[var(--color-dark)] hover:bg-[var(--color-primary-light)]/30"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
