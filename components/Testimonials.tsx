import type { Testimonial } from "@/config/site";

interface TestimonialsProps {
  title: string;
  subtitle: string;
  items: Testimonial[];
}

export function Testimonials({ title, subtitle, items }: TestimonialsProps) {
  return (
    <section id="testimonials" className="border-y border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="mt-4 text-gray-600">{subtitle}</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((testimonial) => (
            <figure
              key={testimonial.author}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <blockquote className="text-sm text-gray-700">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4">
                <p className="text-sm font-semibold">{testimonial.author}</p>
                <p className="text-sm text-gray-600">{testimonial.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
