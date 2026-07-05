import Link from "next/link";
import type { PricingPlan } from "@/config/site";

interface PricingProps {
  title: string;
  subtitle: string;
  plans: PricingPlan[];
}

export function Pricing({ title, subtitle, plans }: PricingProps) {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-4 text-gray-600">{subtitle}</p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-lg border p-6 ${
              plan.highlighted ? "border-gray-900" : "border-gray-200"
            }`}
          >
            <h3 className="font-semibold">{plan.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
            <p className="mt-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-sm text-gray-600">{plan.period}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="text-sm text-gray-600">
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={plan.cta.href}
              className={`mt-6 rounded-md px-4 py-2 text-center text-sm font-medium ${
                plan.highlighted
                  ? "bg-gray-900 text-white hover:bg-gray-700"
                  : "border border-gray-300 text-gray-900 hover:bg-gray-50"
              }`}
            >
              {plan.cta.label}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
