import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">
            Manga AI Reader
          </span>
          <nav className="flex items-center gap-6 text-sm text-black/60 dark:text-white/60">
            <span>Library</span>
            <Link
              href="/reader"
              className="transition-colors hover:text-foreground"
            >
              Reader
            </Link>
            <span>About</span>
          </nav>
        </div>
      </header>

      <section className="flex flex-1 items-center">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-black/50 dark:text-white/50">
            AI-powered manga reading
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Read manga with an AI companion
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-black/60 dark:text-white/60">
            Upload your manga, get instant translations, panel-by-panel
            explanations, and a smarter reading experience.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/reader"
              className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85"
            >
              Get started
            </Link>
            <button className="rounded-full border border-black/15 px-6 py-3 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
              Browse library
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 py-6 text-center text-sm text-black/50 dark:border-white/10 dark:text-white/50">
        Manga AI Reader — built with Next.js, TypeScript &amp; Tailwind CSS
      </footer>
    </main>
  );
}
