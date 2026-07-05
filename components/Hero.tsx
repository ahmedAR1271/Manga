import Link from "next/link";
import type { HeroContent } from "@/config/site";

interface HeroProps {
  hero: HeroContent;
}

export function Hero({ hero }: HeroProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 text-center">
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        {hero.title}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
        {hero.subtitle}
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link
          href={hero.ctaPrimary.href}
          className="rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700"
        >
          {hero.ctaPrimary.label}
        </Link>
        <Link
          href={hero.ctaSecondary.href}
          className="rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          {hero.ctaSecondary.label}
        </Link>
      </div>
    </section>
  );
}
