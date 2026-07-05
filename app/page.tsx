import { FAQ } from "@/components/FAQ";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Navbar } from "@/components/Navbar";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { site } from "@/config/site";

export default function Home() {
  return (
    <>
      <Navbar brand={site.brand} links={site.nav.links} cta={site.nav.cta} />
      <main>
        <Hero hero={site.hero} />
        <Features
          title={site.features.title}
          subtitle={site.features.subtitle}
          items={site.features.items}
        />
        <HowItWorks
          title={site.howItWorks.title}
          subtitle={site.howItWorks.subtitle}
          steps={site.howItWorks.steps}
        />
        <Pricing
          title={site.pricing.title}
          subtitle={site.pricing.subtitle}
          plans={site.pricing.plans}
        />
        <Testimonials
          title={site.testimonials.title}
          subtitle={site.testimonials.subtitle}
          items={site.testimonials.items}
        />
        <FAQ
          title={site.faq.title}
          subtitle={site.faq.subtitle}
          items={site.faq.items}
        />
      </main>
      <Footer
        brand={site.brand}
        tagline={site.tagline}
        groups={site.footer.groups}
        copyright={site.footer.copyright}
      />
    </>
  );
}
