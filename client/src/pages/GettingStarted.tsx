import { Link } from "wouter";
import { BidLogo } from "@/components/brand/BidLogo";
import { ArrowLeft, Building2, FileText, Users, CheckCircle, Send, Search } from "lucide-react";

export default function GettingStarted() {
  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" data-testid="link-home">
            <BidLogo variant="orange" size={28} />
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Getting Started with Bid</h1>
        <p className="text-muted-foreground mb-10">
          Bid is a private procurement platform for the Saudi market. Here's everything you need to know to get up and running.
        </p>

        <section className="space-y-10 text-sm leading-relaxed text-foreground">

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">1. Set Up Your Company Profile</h2>
              <p className="text-muted-foreground mb-3">
                Your company profile is the first thing vendors and partners see. A complete profile builds trust and increases response rates.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>Go to <strong className="text-foreground">Settings → Company Profile</strong> to add your company name, bio, and logo.</li>
                <li>Upload your company documents (CR, VAT certificate) under <strong className="text-foreground">Company Documents</strong> during onboarding.</li>
                <li>Your company slug creates a public profile page vendors can view.</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">2. Invite Your Team</h2>
              <p className="text-muted-foreground mb-3">
                Collaborate with colleagues by inviting them to your company workspace.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>From your Dashboard, open the <strong className="text-foreground">Invite Team</strong> section.</li>
                <li>Enter your colleague's email address — they'll receive an invitation link.</li>
                <li>Team members share the same company profile and can manage tenders together.</li>
              </ul>
            </div>
          </div>

          {/* Step 3 — Requesters */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">3. Create an RFP (Requesters)</h2>
              <p className="text-muted-foreground mb-3">
                If you're procuring goods or services, RFPs let you collect structured proposals from vendors.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>Click <strong className="text-foreground">New RFP</strong> from your Dashboard and choose Manual or AI-assisted creation.</li>
                <li>Fill in the title, scope, budget, deadline, and evaluation criteria.</li>
                <li>Optionally attach a voice note or video link to give vendors more context.</li>
                <li>Build a custom form to collect exactly the information you need from bidders.</li>
                <li>Once ready, publish and generate an invite link to share with your vendor network.</li>
              </ul>
            </div>
          </div>

          {/* Step 4 — Vendors */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">4. Browse & Apply to Tenders (Vendors)</h2>
              <p className="text-muted-foreground mb-3">
                If you're a vendor, you can browse open opportunities and submit bids.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>Visit the <strong className="text-foreground">Marketplace</strong> to discover published tenders that match your expertise.</li>
                <li>Use filters (category, budget, deadline) to narrow results.</li>
                <li>Open a tender to read the full brief, then click <strong className="text-foreground">Submit Bid</strong> to apply.</li>
                <li>If a company sends you a private invite link, open it and log in to access the tender directly.</li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">5. Manage Submissions & Awards</h2>
              <p className="text-muted-foreground mb-3">
                Once bids are in, evaluate them and select a winner.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>Open any tender from your Dashboard to see all incoming submissions.</li>
                <li>Review each bid against your evaluation criteria.</li>
                <li>Award the tender to the winning vendor — they'll be notified automatically.</li>
              </ul>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">6. Get Verified</h2>
              <p className="text-muted-foreground mb-3">
                Verification increases your credibility with counterparties on the platform.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>Upload your Commercial Registration and VAT documents during onboarding.</li>
                <li>Our team reviews submissions and grants a verified badge to your profile.</li>
                <li>Verified companies appear more prominently in search results.</li>
              </ul>
            </div>
          </div>

          {/* Support CTA */}
          <div className="border-t border-border pt-8">
            <p className="text-muted-foreground">
              Still have questions?{" "}
              <a
                href="mailto:info@bid.sa"
                className="text-primary hover:underline font-medium"
              >
                Contact our support team
              </a>{" "}
              at info@bid.sa — we're happy to help.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
