import type { FaqItem } from "@/config/site";

interface FAQProps {
  title: string;
  subtitle: string;
  items: FaqItem[];
}

export function FAQ({ title, subtitle, items }: FAQProps) {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-4 text-gray-600">{subtitle}</p>
      </div>
      <div className="mt-12 divide-y divide-gray-200 border-y border-gray-200">
        {items.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="cursor-pointer list-none font-medium">
              {item.question}
            </summary>
            <p className="mt-2 text-sm text-gray-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
