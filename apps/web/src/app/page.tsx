'use client';

import Link from 'next/link';
import { CheckCircle, ClipboardList, Users, BarChart3, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@siteproof/design-system';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">SiteProof</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </Link>
            <Link href="#benefits" className="text-gray-600 hover:text-gray-900 transition-colors">
              Benefits
            </Link>
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign In
            </Link>
          </nav>
          <div className="md:hidden">
            <Link href="/auth/login">
              <Button variant="primary" size="sm">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Construction Quality Assurance Made Simple
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
            Digital ITP management, daily diaries, and NCR tracking for construction projects.
            Built for field workers and project managers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight className="w-5 h-5" />}
                className="min-h-[56px] min-w-[200px]"
              >
                Get Started Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                variant="secondary"
                size="lg"
                className="min-h-[56px] min-w-[200px]"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Everything You Need for Quality Control
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CheckCircle className="w-8 h-8 text-blue-600" />}
              title="Digital ITP Management"
              description="Streamline Inspection and Test Plans with mobile-first interfaces. Pass/Fail/N/A status tracking with color-blind safe design."
            />
            <FeatureCard
              icon={<ClipboardList className="w-8 h-8 text-blue-600" />}
              title="Daily Diaries"
              description="Track labor, plant, materials, weather, and progress. Auto-populate from previous days for faster entry."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-blue-600" />}
              title="Contractor Management"
              description="Manage labor contractors and plant suppliers. Track workers, equipment, rates, and certifications."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-blue-600" />}
              title="NCR Tracking"
              description="Non-Conformance Report management with status tracking, corrective actions, and resolution workflows."
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8 text-blue-600" />}
              title="Progress Reports"
              description="Real-time dashboards showing project completion, ITP status, and quality metrics at a glance."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-blue-600" />}
              title="Mobile Optimized"
              description="Built for field workers with gloves. 56px touch targets, bottom navigation, and offline-ready design."
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 md:py-24 bg-blue-50">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Why Choose SiteProof?
          </h3>
          <div className="max-w-3xl mx-auto space-y-8">
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
      <section className="py-16 md:py-24 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Modernize Your Quality Control?
          </h3>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join construction teams already using SiteProof to streamline inspections,
            track progress, and ensure quality compliance.
          </p>
          <Link href="/auth/signup">
            <Button
              variant="secondary"
              size="lg"
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="min-h-[56px] min-w-[200px]"
            >
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
                <span className="text-xl font-bold text-white">SiteProof</span>
              </div>
              <p className="text-sm">
                Professional construction quality assurance and inspection management platform.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#benefits" className="hover:text-white transition-colors">Benefits</Link></li>
                <li><Link href="/auth/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} SiteProof. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function BenefitItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
        <CheckCircle className="w-5 h-5 text-white" />
      </div>
      <div>
        <h4 className="text-xl font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
