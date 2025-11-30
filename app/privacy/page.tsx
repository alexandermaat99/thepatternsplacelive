import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/navigation';
import { COMPANY_INFO } from '@/lib/company-info';

export const metadata: Metadata = {
  title: `Privacy Policy - ${COMPANY_INFO.name}`,
  description: `Privacy Policy for ${COMPANY_INFO.name} marketplace.`,
};

export default function PrivacyPolicyPage() {
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

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
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
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to {COMPANY_INFO.name} ("we," "our," or "us"). We are committed to protecting
              your privacy and ensuring the security of your personal information. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information when you
              visit our website and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect information in the following ways:
            </p>

            <h3 className="text-lg font-medium mb-2">Information You Provide</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
              <li>Account information (name, email address, username)</li>
              <li>Profile information (avatar, bio)</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Product listings and content you create</li>
              <li>Communications with us or other users</li>
            </ul>

            <h3 className="text-lg font-medium mb-2">Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Device information (browser type, operating system)</li>
              <li>Log data (IP address, access times, pages viewed)</li>
              <li>Cookies and similar technologies (see Cookie Policy below)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Provide and maintain our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you updates, security alerts, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions</li>
              <li>Personalize and improve your experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use cookies and similar tracking technologies to collect and track information
              about your browsing activities. Types of cookies we use:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                <strong>Essential Cookies:</strong> Required for the website to function
                (authentication, security, cart)
              </li>
              <li>
                <strong>Functional Cookies:</strong> Remember your preferences (theme, language)
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand how visitors use our site
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You can control cookies through your browser settings. Note that disabling certain
              cookies may affect website functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                <strong>Service Providers:</strong> Third parties that help us operate our platform
                (Stripe for payments, Supabase for data storage)
              </li>
              <li>
                <strong>Other Users:</strong> Your public profile information and listings are
                visible to other users
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to protect our rights
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                sale of assets
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect
              your personal information. However, no method of transmission over the Internet or
              electronic storage is 100% secure. We cannot guarantee absolute security but we strive
              to use commercially acceptable means to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Delete your personal information</li>
              <li>Object to or restrict processing of your information</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you are a parent or guardian
              and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
              We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our privacy practices, please
              contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>{COMPANY_INFO.name}</strong>
              <br />
              Email: {COMPANY_INFO.email.privacy}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
