import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg text-foreground">DisputeShield</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16 prose prose-slate">
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 2026</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Information We Collect</h2>
        <p className="text-muted-foreground mb-4">
          When you create an account, we collect your email address, business name, and password (stored securely hashed). When you connect your Stripe account, we receive an access token and your Stripe account ID to monitor disputes on your behalf.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. How We Use Your Data</h2>
        <p className="text-muted-foreground mb-4">
          We use your Stripe data solely to import chargebacks, pull transaction evidence, analyse win probability, and submit dispute responses. We never access or modify your funds, customer payment methods, or unrelated Stripe data.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Data Storage & Security</h2>
        <p className="text-muted-foreground mb-4">
          Your data is stored in encrypted databases hosted on Railway (PostgreSQL). All communication between your browser and our servers is encrypted via HTTPS. Stripe tokens are stored encrypted and are never exposed to the frontend.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Third-Party Services</h2>
        <p className="text-muted-foreground mb-4">
          We use Stripe for payment processing and account access, Anthropic (Claude) for AI analysis and response generation, and Resend for email notifications. Each service has its own privacy policy and only receives the minimum data necessary.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Data Retention</h2>
        <p className="text-muted-foreground mb-4">
          We retain your dispute data for as long as your account is active. When you disconnect your Stripe account or delete your account, we remove your Stripe tokens. You can request full data deletion by emailing support@disputeshield.com.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Your Rights</h2>
        <p className="text-muted-foreground mb-4">
          You can disconnect your Stripe account at any time from Settings. You can request a copy of your data or ask us to delete it by contacting support@disputeshield.com.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Contact</h2>
        <p className="text-muted-foreground mb-4">
          For privacy-related questions, email us at{" "}
          <a href="mailto:support@disputeshield.com" className="text-primary hover:underline">
            support@disputeshield.com
          </a>.
        </p>
      </div>
    </div>
  );
}
