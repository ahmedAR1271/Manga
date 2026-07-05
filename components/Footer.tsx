import Link from "next/link";
import type { FooterLinkGroup } from "@/config/site";

interface FooterProps {
  brand: string;
  tagline: string;
  groups: FooterLinkGroup[];
  copyright: string;
}

export function Footer({ brand, tagline, groups, copyright }: FooterProps) {
  return (
    <footer className="border-t border-gray-200">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-semibold">{brand}</p>
            <p className="mt-2 text-sm text-gray-600">{tagline}</p>
          </div>
          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-semibold">{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-600">
          {copyright}
        </p>
      </div>
    </footer>
  );
}
