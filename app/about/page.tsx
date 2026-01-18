import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/navigation';
import { COMPANY_INFO } from '@/lib/company-info';

export const metadata: Metadata = {
  title: `About Us - ${COMPANY_INFO.name}`,
  description: `Learn about ${COMPANY_INFO.name}, a community marketplace built specifically for the sewing and knitting community. Discover our story, mission, and commitment to crafters.`,
  keywords: [
    'about patterns place',
    'sewing community',
    'knitting community',
    'crafting marketplace',
    'sewing patterns marketplace',
    'knitting patterns',
    'crafting community',
    'independent pattern creators',
    'sewing community platform',
    'knitting community platform',
  ],
  openGraph: {
    title: `About Us - ${COMPANY_INFO.name}`,
    description: `Learn about ${COMPANY_INFO.name}, a community marketplace built specifically for the sewing and knitting community.`,
    type: 'website',
    url: `${COMPANY_INFO.urls.website}/about`,
    images: [
      {
        url: '/photos/GailAndAlex-optimized.webp',
        width: 1200,
        height: 900,
        alt: "Gail and Alex - Founders of The Pattern's Place",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `About Us - ${COMPANY_INFO.name}`,
    description: `Learn about ${COMPANY_INFO.name}, a community marketplace built specifically for the sewing and knitting community.`,
    images: ['/photos/GailAndAlex-optimized.webp'],
  },
  alternates: {
    canonical: `${COMPANY_INFO.urls.website}/about`,
  },
};

export default function AboutPage() {
  return (
    <>
      <Navigation showMarketplaceLinks={true} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <article className="space-y-8">
          {/* Header */}
          <header className="space-y-4">
            <h1 className="text-4xl font-bold">About {COMPANY_INFO.name}</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              A community marketplace built specifically for the sewing and knitting community
            </p>
          </header>

          {/* Founders Image and Story - Side by Side on Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Founders Image */}
            <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted/30">
              <Image
                src="/photos/GailAndAlex-optimized.webp"
                alt="Gail and Alex - Founders of The Pattern's Place"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Our Story */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Our Story</h2>
              <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  In October 2024, we came up with the idea for {COMPANY_INFO.name}. As crafters
                  ourselves, we couldn't find a place specifically built for the sewing and knitting
                  community. Platforms like Etsy aren't designed for patterns—they're made for
                  physical products. We thought the crafting community deserved better.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We're Gail and Alex. Gail has worked in fashion for 7 years and is about to
                  graduate from a Salt Lake fashion program, bringing deep industry knowledge and a
                  passion this community. Alex is a software developer, dedicated to building a
                  platform that truly serves the crafting community.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  This unique pairing allows us to understand both the creative needs of pattern
                  designers and the technical requirements of building a modern, user-friendly
                  marketplace. We combine Gail's fashion industry experience with Alex's ability to
                  create intuitive, powerful technology—all designed specifically for pattern
                  creators and crafters.
                </p>
              </div>
            </section>
          </div>

          {/* Our Mission */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Our Mission</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                Our mission is to create a thriving community where pattern creators can showcase
                their work, connect with fellow crafters, and build sustainable businesses. We're
                committed to providing a platform that:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4 ml-4">
                <li>Celebrates the art of sewing, knitting, and crafting</li>
                <li>Supports independent pattern designers and creators</li>
                <li>Fosters a welcoming and inclusive community</li>
                <li>Makes it easy to discover unique, high-quality patterns</li>
                <li>Provides fair opportunities for both buyers and sellers</li>
              </ul>
            </div>
          </section>

          {/* What Makes Us Different */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">What Makes Us Different</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Unlike generic marketplaces, {COMPANY_INFO.name} is built specifically for the
                crafting community. We understand the unique needs of pattern creators and crafters
                because we're part of this community ourselves.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                From our user-friendly interface to our community-focused features, every aspect of
                our platform is designed with crafters in mind. We're not just a marketplace—we're a
                community where creativity thrives and connections are made.
              </p>
            </div>
          </section>

          {/* Join Our Community */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Join Our Community</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                Whether you're looking to sell your patterns or discover your next project, we
                invite you to join our growing community. Together, we're building something
                special—a place where crafters can thrive, create, and connect.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <Link href="/marketplace/sell">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Selling Patterns
                  </Button>
                </Link>
                <Link href="/marketplace">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Browse Patterns
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4 pt-8 border-t">
            <h2 className="text-2xl font-semibold">Get in Touch</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                Have questions or feedback? We'd love to hear from you! Reach out to us at{' '}
                <a
                  href={`mailto:${COMPANY_INFO.email.general}`}
                  className="text-primary hover:underline"
                >
                  {COMPANY_INFO.email.general}
                </a>
                .
              </p>
              {COMPANY_INFO.social.instagram && (
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Follow us on{' '}
                  <a
                    href={COMPANY_INFO.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Instagram
                  </a>{' '}
                  to stay connected with our community.
                </p>
              )}
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
