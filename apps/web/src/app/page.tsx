'use client';

import Link from 'next/link';
import { CheckCircle, ClipboardList, Users, BarChart3, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@siteproof/design-system';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary-blue-pale to-background-white">
      {/* Header */}
      <header className="bg-background-white border-b border-secondary-light-gray sticky top-0 z-nav">
        <div className="container mx-auto px-default py-default flex items-center justify-between">
          <div className="flex items-center gap-tiny">
            <Shield className="w-8 h-8 text-primary-blue" />
            <h1 className="text-h2 font-bold text-primary-charcoal">SiteProof</h1>
          </div>
          <nav className="hidden md:flex items-center gap-large">
            <Link
              href="#features"
              className="text-secondary-gray hover:text-primary-charcoal transition-standard"
            >
              Features
            </Link>
            <Link
              href="#benefits"
              className="text-secondary-gray hover:text-primary-charcoal transition-standard"
            >
              Benefits
            </Link>
            <Link
              href="/auth/login"
              className="text-primary-blue hover:text-secondary-blue-light font-medium transition-standard"
            >
              Sign In
            </Link>
          </nav>
          <div className="md:hidden">
            <Link href="/auth/login">
              <Button variant="primary" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-default py-xxxl md:py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-h1 md:text-6xl font-bold text-primary-charcoal mb-large">
            Construction Quality Assurance Made Simple
          </h2>
          <p className="text-body-large md:text-h3 text-secondary-gray mb-xl leading-relaxed">
            Digital ITP management, daily diaries, and NCR tracking for construction projects. Built
            for field workers and project managers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-default">
            <Link href="/auth/signup">
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight className="w-5 h-5" />}
                className="min-h-fab min-w-[200px]"
              >
                Get Started Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="secondary" size="lg" className="min-h-fab min-w-[200px]">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-background-white py-xxxl md:py-24">
        <div className="container mx-auto px-default">
          <h3 className="text-h2 md:text-h1 font-bold text-center text-primary-charcoal mb-xxxl">
            Everything You Need for Quality Control
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xl">
            <FeatureCard
              icon={<CheckCircle className="w-8 h-8 text-primary-blue" />}
              title="Digital ITP Management"
              description="Streamline Inspection and Test Plans with mobile-first interfaces. Pass/Fail/N/A status tracking with color-blind safe design."
            />
            <FeatureCard
              icon={<ClipboardList className="w-8 h-8 text-primary-blue" />}
              title="Daily Diaries"
              description="Track labor, plant, materials, weather, and progress. Auto-populate from previous days for faster entry."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-primary-blue" />}
              title="Contractor Management"
              description="Manage labor contractors and plant suppliers. Track workers, equipment, rates, and certifications."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-primary-blue" />}
              title="NCR Tracking"
              description="Non-Conformance Report management with status tracking, corrective actions, and resolution workflows."
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8 text-primary-blue" />}
              title="Progress Reports"
              description="Real-time dashboards showing project completion, ITP status, and quality metrics at a glance."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-primary-blue" />}
              title="Mobile Optimized"
              description="Built for field workers with gloves. 56px touch targets, bottom navigation, and offline-ready design."
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-xxxl md:py-24 bg-secondary-blue-pale">
        <div className="container mx-auto px-default">
          <h3 className="text-h2 md:text-h1 font-bold text-center text-primary-charcoal mb-xxxl">
            Why Choose SiteProof?
          </h3>
          <div className="max-w-3xl mx-auto space-y-xl">
            <BenefitItem
              title="Accessibility First"
              description="Color-blind safe Okabe-Ito palette, minimum 16px fonts, WCAG AA compliant, keyboard navigation support."
            />
            <BenefitItem
              title="Field Worker Focused"
              description="Large touch targets (56px for primary actions), works with gloves, mobile-first responsive design."
            />
            <BenefitItem
              title="Optimistic UI"
              description="Instant feedback on all actions, automatic retry on failure, seamless offline-to-online sync."
            />
            <BenefitItem
              title="Enterprise Ready"
              description="Multi-tenant architecture, role-based access control, audit trails, and secure data storage."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-xxxl md:py-24 bg-primary-blue text-primary-white">
        <div className="container mx-auto px-default text-center">
          <h3 className="text-h2 md:text-h1 font-bold mb-large">
            Ready to Modernize Your Quality Control?
          </h3>
          <p className="text-body-large mb-xl text-secondary-blue-pale max-w-2xl mx-auto">
            Join construction teams already using SiteProof to streamline inspections, track
            progress, and ensure quality compliance.
          </p>
          <Link href="/auth/signup">
            <Button
              variant="secondary"
              size="lg"
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="min-h-fab min-w-[200px]"
            >
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-charcoal text-secondary-gray py-xxxl">
        <div className="container mx-auto px-default">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl mb-xl">
            <div>
              <div className="flex items-center gap-tiny mb-default">
                <Shield className="w-6 h-6 text-secondary-blue-light" />
                <span className="text-h4 font-bold text-primary-white">SiteProof</span>
              </div>
              <p className="text-body-small">
                Professional construction quality assurance and inspection management platform.
              </p>
            </div>
            <div>
              <h4 className="text-primary-white font-semibold mb-default">Product</h4>
              <ul className="space-y-tiny text-body-small">
                <li>
                  <Link href="#features" className="hover:text-primary-white transition-standard">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#benefits" className="hover:text-primary-white transition-standard">
                    Benefits
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signup"
                    className="hover:text-primary-white transition-standard"
                  >
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-primary-white font-semibold mb-default">Legal</h4>
              <ul className="space-y-tiny text-body-small">
                <li>
                  <Link href="/privacy" className="hover:text-primary-white transition-standard">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary-white transition-standard">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-secondary-gray pt-xl text-center text-body-small">
            <p>&copy; {new Date().getFullYear()} SiteProof. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-background-light rounded-card p-large hover:shadow-card-hover transition-all duration-standard">
      <div className="mb-default">{icon}</div>
      <h4 className="text-h4 font-semibold text-primary-charcoal mb-tiny">{title}</h4>
      <p className="text-body text-secondary-gray leading-relaxed">{description}</p>
    </div>
  );
}

function BenefitItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-default">
      <div className="flex-shrink-0 w-8 h-8 bg-primary-blue rounded-full flex items-center justify-center">
        <CheckCircle className="w-5 h-5 text-primary-white" />
      </div>
      <div>
        <h4 className="text-h4 font-semibold text-primary-charcoal mb-tiny">{title}</h4>
        <p className="text-body text-secondary-gray leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
// Test AI review hook
