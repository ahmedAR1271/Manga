import type { Step } from "@/config/site";

interface HowItWorksProps {
  title: string;
  subtitle: string;
  steps: Step[];
}

export function HowItWorks({ title, subtitle, steps }: HowItWorksProps) {
  return (
    <section id="how-it-works" className="border-y border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="mt-4 text-gray-600">{subtitle}</p>
        </div>
        <ol className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 font-semibold">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
