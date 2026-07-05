import type { Feature } from "@/config/site";

interface FeaturesProps {
  title: string;
  subtitle: string;
  items: Feature[];
}

export function Features({ title, subtitle, items }: FeaturesProps) {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-4 text-gray-600">{subtitle}</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-gray-200 p-6"
          >
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
