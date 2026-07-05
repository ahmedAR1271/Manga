/**
 * Site configuration — the single source of truth for ALL landing page content.
 *
 * Components never hardcode text; they only render what is defined here.
 * To customize the template, edit this file only.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface CTA {
  label: string;
  href: string;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  ctaPrimary: CTA;
  ctaSecondary: CTA;
}

export interface Feature {
  title: string;
  description: string;
}

export interface Step {
  title: string;
  description: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: CTA;
  highlighted?: boolean;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FooterLinkGroup {
  title: string;
  links: NavLink[];
}

export interface SiteConfig {
  brand: string;
  tagline: string;
  description: string;
  nav: {
    links: NavLink[];
    cta: CTA;
  };
  hero: HeroContent;
  features: {
    title: string;
    subtitle: string;
    items: Feature[];
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: Step[];
  };
  pricing: {
    title: string;
    subtitle: string;
    plans: PricingPlan[];
  };
  testimonials: {
    title: string;
    subtitle: string;
    items: Testimonial[];
  };
  faq: {
    title: string;
    subtitle: string;
    items: FaqItem[];
  };
  footer: {
    groups: FooterLinkGroup[];
    copyright: string;
  };
}

export const site: SiteConfig = {
  brand: "Launchpad",
  tagline: "Ship your SaaS faster",
  description:
    "A clean, config-driven SaaS landing page template built with Next.js, TypeScript, and Tailwind CSS.",

  nav: {
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Testimonials", href: "#testimonials" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: { label: "Get started", href: "#pricing" },
  },

  hero: {
    title: "The fastest way to launch your SaaS",
    subtitle:
      "A production-ready foundation with everything you need to go from idea to launch. Config-driven, fully typed, and easy to customize.",
    ctaPrimary: { label: "Start free trial", href: "#pricing" },
    ctaSecondary: { label: "Learn more", href: "#features" },
  },

  features: {
    title: "Everything you need",
    subtitle: "All the essentials to build and scale your product.",
    items: [
      {
        title: "Config-driven content",
        description:
          "All copy lives in a single typed configuration file. Update your entire site without touching a component.",
      },
      {
        title: "Modular sections",
        description:
          "Every section is an independent component. Add, remove, or reorder sections in minutes.",
      },
      {
        title: "Type-safe by default",
        description:
          "Full TypeScript coverage means the compiler catches content mistakes before your users do.",
      },
      {
        title: "Built on Next.js",
        description:
          "App Router, server components, and static rendering out of the box for fast page loads.",
      },
      {
        title: "Tailwind CSS",
        description:
          "Utility-first styling that stays consistent and is ready for a full design system in later phases.",
      },
      {
        title: "Ready to extend",
        description:
          "A clean separation between data and UI makes future design upgrades painless.",
      },
    ],
  },

  howItWorks: {
    title: "How it works",
    subtitle: "Get up and running in three simple steps.",
    steps: [
      {
        title: "Edit the config",
        description:
          "Open config/site.ts and replace the placeholder content with your own brand and copy.",
      },
      {
        title: "Pick your sections",
        description:
          "Keep the sections you need and remove the ones you don't — each one is independent.",
      },
      {
        title: "Deploy",
        description:
          "Push to your favorite platform. The template is fully static and deploys anywhere.",
      },
    ],
  },

  pricing: {
    title: "Simple, transparent pricing",
    subtitle: "Start free, upgrade when you're ready.",
    plans: [
      {
        name: "Starter",
        price: "$0",
        period: "/month",
        description: "For individuals trying things out.",
        features: ["1 project", "Community support", "Basic analytics"],
        cta: { label: "Get started", href: "#" },
      },
      {
        name: "Pro",
        price: "$29",
        period: "/month",
        description: "For growing teams that need more.",
        features: [
          "Unlimited projects",
          "Priority support",
          "Advanced analytics",
          "Custom domains",
        ],
        cta: { label: "Start free trial", href: "#" },
        highlighted: true,
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For organizations with custom needs.",
        features: [
          "Everything in Pro",
          "Dedicated support",
          "SSO & SAML",
          "Custom SLAs",
        ],
        cta: { label: "Contact sales", href: "#" },
      },
    ],
  },

  testimonials: {
    title: "Loved by builders",
    subtitle: "Here's what early users are saying.",
    items: [
      {
        quote:
          "We swapped in our own content in an afternoon and shipped the same week.",
        author: "Alex Rivera",
        role: "Founder, Acme Labs",
      },
      {
        quote:
          "The config-driven approach means our marketing team updates copy without filing engineering tickets.",
        author: "Priya Sharma",
        role: "Head of Product, Northwind",
      },
      {
        quote:
          "Finally a template that separates data from UI properly. Extending it was trivial.",
        author: "Daniel Kim",
        role: "Engineering Lead, Contoso",
      },
    ],
  },

  faq: {
    title: "Frequently asked questions",
    subtitle: "Everything you need to know about the template.",
    items: [
      {
        question: "How do I change the content?",
        answer:
          "All content lives in config/site.ts. Edit that single file and every section updates automatically.",
      },
      {
        question: "Can I remove a section?",
        answer:
          "Yes. Each section is an independent component — delete its line in app/page.tsx and it's gone.",
      },
      {
        question: "Is this template free to use?",
        answer:
          "This is a template foundation intended to be customized and extended for your own product.",
      },
      {
        question: "When is the design phase coming?",
        answer:
          "Phase 2 adds the visual design system, theming, and polish on top of this foundation.",
      },
    ],
  },

  footer: {
    groups: [
      {
        title: "Product",
        links: [
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "#pricing" },
          { label: "FAQ", href: "#faq" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "#" },
          { label: "Blog", href: "#" },
          { label: "Contact", href: "#" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Privacy", href: "#" },
          { label: "Terms", href: "#" },
        ],
      },
    ],
    copyright: `© ${new Date().getFullYear()} Launchpad. All rights reserved.`,
  },
};
