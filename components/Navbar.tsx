import Link from "next/link";
import type { CTA, NavLink } from "@/config/site";

interface NavbarProps {
  brand: string;
  links: NavLink[];
  cta: CTA;
}

export function Navbar({ brand, links, cta }: NavbarProps) {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          {brand}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href={cta.href}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          {cta.label}
        </Link>
      </div>
    </header>
  );
}
