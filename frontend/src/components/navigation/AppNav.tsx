"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNav() {
  const pathname = usePathname();
  const itemClass = (href: string) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      pathname === href
        ? "bg-indigo-100 text-indigo-700"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <nav className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
      <Link href="/" className={itemClass("/")}>
        Dashboard
      </Link>
      <Link href="/clients" className={itemClass("/clients")}>
        Clients
      </Link>
    </nav>
  );
}
