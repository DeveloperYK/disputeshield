import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 2026</p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Service Description</h2>
        <p className="text-muted-foreground mb-4">
          DisputeShield provides AI-powered chargeback analysis, win probability scoring, and response generation for Stripe merchants. We help you decide which disputes to fight and assist in building your case.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. No Guarantee of Outcomes</h2>
        <p className="text-muted-foreground mb-4">
          Win probability scores are estimates based on AI analysis. We do not guarantee any specific outcome for chargebacks. The final decision rests with the card network and issuing bank. DisputeShield is a tool to assist your decision-making, not a legal service.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Stripe Account Access</h2>
        <p className="text-muted-foreground mb-4">
          By connecting your Stripe account, you authorize DisputeShield to read dispute and charge data, upload evidence files, and submit dispute responses on your behalf. You can revoke this access at any time.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Beta Period</h2>
        <p className="text-muted-foreground mb-4">
          DisputeShield is currently in beta and is provided free of charge. We reserve the right to introduce paid plans in the future. Existing users will be notified in advance of any pricing changes and will receive preferential terms.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Acceptable Use</h2>
        <p className="text-muted-foreground mb-4">
          You agree to use DisputeShield only for legitimate chargeback disputes. You must not submit fraudulent evidence, misrepresent transaction details, or use the service to facilitate fraud.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Limitation of Liability</h2>
        <p className="text-muted-foreground mb-4">
          DisputeShield is provided &ldquo;as is&rdquo; without warranty. We are not liable for lost disputes, financial losses, or any damages arising from use of the service. Our total liability is limited to the amount you have paid us (during beta: $0).
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Changes to Terms</h2>
        <p className="text-muted-foreground mb-4">
          We may update these terms as the service evolves. We will notify you of material changes via email. Continued use after changes constitutes acceptance.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Contact</h2>
        <p className="text-muted-foreground mb-4">
          Questions about these terms? Email{" "}
          <a href="mailto:support@disputeshield.com" className="text-primary hover:underline">
            support@disputeshield.com
          </a>.
        </p>
      </div>
    </div>
  );
}
