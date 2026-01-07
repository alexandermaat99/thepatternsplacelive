import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/navigation';
import { COMPANY_INFO } from '@/lib/company-info';

export const metadata: Metadata = {
  title: `Terms of Service - ${COMPANY_INFO.name}`,
  description: `Terms of Service for ${COMPANY_INFO.name} marketplace.`,
  alternates: {
    canonical: `${COMPANY_INFO.urls.website}/terms`,
  },
};

export default function TermsOfServicePage() {
  return (
    <>
      <Navigation showMarketplaceLinks={true} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/marketplace">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Marketplace
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">
          Last updated:{' '}
          {new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using {COMPANY_INFO.name} ("the Service"), you agree to be bound by
              these Terms of Service. If you do not agree to these terms, please do not use our
              Service. We reserve the right to modify these terms at any time, and your continued
              use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              {COMPANY_INFO.name} is an online marketplace that connects pattern creators (sellers)
              with buyers interested in purchasing digital sewing, knitting, crochet, and other
              crafting patterns. We provide the platform for these transactions but are not directly
              involved in the creation of the patterns or the transactions between buyers and
              sellers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use certain features of our Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Seller Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you sell patterns on our platform, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Only sell patterns you have the legal right to sell</li>
              <li>Provide accurate descriptions of your patterns</li>
              <li>Deliver digital files promptly after purchase</li>
              <li>Respond to buyer inquiries in a timely manner</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Connect a valid Stripe account for payment processing</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We reserve the right to remove any listings that violate these terms or our policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Buyer Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you purchase patterns on our platform, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Use purchased patterns for personal use only unless otherwise stated</li>
              <li>Not redistribute, resell, or share purchased patterns</li>
              <li>Not claim purchased patterns as your own work</li>
              <li>Provide accurate payment information</li>
              <li>Contact sellers directly for pattern-related questions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Platform Content:</strong> The Service and its original content, features, and
              functionality are owned by {COMPANY_INFO.name} and are protected by copyright,
              trademark, and other intellectual property laws.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>User Content:</strong> Sellers retain ownership of their patterns. By
              uploading content, you grant us a non-exclusive license to display and distribute your
              content through our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Payments and Fees</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All payments are processed through Stripe. By using our payment services, you also
              agree to Stripe's terms of service. Prices are listed in USD unless otherwise
              specified.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>All sales are final unless otherwise stated by the seller</li>
              <li>Platform fees may apply to transactions</li>
              <li>Sellers are responsible for any applicable taxes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Upload malicious content or viruses</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Use the Service for fraudulent purposes</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Scrape or collect data without permission</li>
              <li>Interfere with the proper functioning of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE
              DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR QUALITY OF ANY PATTERNS SOLD ON OUR
              PLATFORM. WE ARE NOT RESPONSIBLE FOR DISPUTES BETWEEN BUYERS AND SELLERS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY_INFO.name.toUpperCase()} SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
              ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless {COMPANY_INFO.name} and its officers,
              directors, employees, and agents from any claims, damages, losses, liabilities, and
              expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately,
              without prior notice, for any reason, including breach of these Terms. Upon
              termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of{' '}
              {COMPANY_INFO.legal.jurisdiction}, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>{COMPANY_INFO.name}</strong>
              <br />
              Email: {COMPANY_INFO.email.legal}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
