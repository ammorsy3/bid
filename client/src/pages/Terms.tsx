import { Link } from "wouter";
import { BidLogo } from "@/components/brand/BidLogo";

export default function Terms() {
  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" data-testid="link-home">
            <BidLogo variant="orange" size={28} />
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-login">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose prose-sm dark:prose-invert">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: November 2025</p>

        <section className="space-y-6 text-sm leading-relaxed text-foreground">
          <div>
            <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Bid (“the Service”), operated by Bid (“we”, “us”, “our”), you agree to be
              bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">2. The Service</h2>
            <p>
              Bid is a procurement platform that enables companies in the Saudi Arabian market to manage
              private tenders, submit bids, qualify vendors, and operate vendor networks. Use of the Service
              requires registration and the creation of a company profile.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">3. Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for any
              activity that occurs under your account. You agree to provide accurate and complete information
              during registration and to keep it up to date.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Submit false, misleading, or fraudulent tender or bid information.</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or related systems.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">5. Content & Ownership</h2>
            <p>
              You retain ownership of content you submit (tenders, proposals, documents). By submitting
              content, you grant Bid a non-exclusive, worldwide license to host, display, and process it as
              necessary to provide the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">6. Confidentiality</h2>
            <p>
              Tender and proposal data is shared only with parties you explicitly invite or that the platform
              configuration entitles to view it. You agree to treat all confidential information you receive
              through the Service with appropriate care.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">7. Termination</h2>
            <p>
              We may suspend or terminate your access at any time for breach of these Terms. You may stop
              using the Service at any time. Provisions that by their nature should survive termination will
              survive.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">8. Disclaimers</h2>
            <p>
              The Service is provided “as is” without warranties of any kind. We do not guarantee that the
              Service will be uninterrupted, secure, or error-free, and we are not responsible for the outcome
              of any tender or commercial transaction conducted through the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Bid shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages arising out of or related to your use of the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">10. Changes</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated via the
              Service or by email. Continued use after changes take effect constitutes acceptance.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">11. Contact</h2>
            <p>
              Questions about these Terms? Email{" "}
              <a href="mailto:info@bidapp.sa" className="text-primary hover:underline">info@bidapp.sa</a>.
            </p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground" data-testid="link-privacy">
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}
