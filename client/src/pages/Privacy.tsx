import { Link } from "wouter";
import { BidLogo } from "@/components/brand/BidLogo";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" data-testid="link-home">
            <BidLogo size={28} />
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-login">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-sm dark:prose-invert">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: November 2025</p>

        <section className="space-y-6 text-sm leading-relaxed text-foreground">
          <div>
            <h2 className="text-lg font-semibold mb-2">1. Overview</h2>
            <p>
              This Privacy Policy describes how Bid (“we”, “us”, “our”) collects, uses, and shares information
              when you use our procurement platform (the “Service”).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Account information:</strong> name, email, password, profile picture, job title, phone, language preference.</li>
              <li><strong>Company information:</strong> legal name, CR number, VAT number, city, category, verification documents.</li>
              <li><strong>Tender & proposal content:</strong> documents, scope, budgets, evaluation criteria, attachments.</li>
              <li><strong>Authentication data:</strong> when you sign in with Google, LinkedIn, or Slack via Clerk, we receive your name, email, and profile photo from that provider.</li>
              <li><strong>Usage data:</strong> activity logs, audit logs, error reports, IP address, browser/user-agent.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">3. How We Use Information</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>To operate, maintain, and improve the Service.</li>
              <li>To authenticate users and secure accounts.</li>
              <li>To send transactional emails (e.g. new offer notifications, password resets).</li>
              <li>To enforce our Terms of Service and prevent fraud or abuse.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">4. Sharing of Information</h2>
            <p>We share information only as follows:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Within your company:</strong> other members of your company can see company-scoped data.</li>
              <li><strong>With invited parties:</strong> tender content is shared with vendors you invite.</li>
              <li><strong>Service providers:</strong> Clerk (authentication), Postmark (email), Replit Object Storage (file hosting), and Neon (database).</li>
              <li><strong>Legal:</strong> when required by law, regulation, or valid legal process.</li>
            </ul>
            <p className="mt-2">We do not sell your personal information.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">5. Data Retention</h2>
            <p>
              We retain account and tender data for as long as your account is active and as needed to provide
              the Service. You may request deletion of your account by emailing us; some data may be retained
              to comply with legal or audit obligations.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">6. Security</h2>
            <p>
              We use industry-standard measures to protect your data, including TLS encryption in transit,
              hashed passwords, JWT-based authentication with company-scoped access controls, and audit logs
              for administrative actions. No system is 100% secure, and we cannot guarantee absolute security.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">7. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal information. You can update most
              account information directly in Settings. To exercise other rights, contact us at the address
              below.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">8. Cookies & Local Storage</h2>
            <p>
              We use cookies and browser local storage to keep you signed in, remember your language
              preference, and maintain session state. You can clear these at any time through your browser
              settings.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">9. International Transfers</h2>
            <p>
              Your data may be processed on servers located outside Saudi Arabia by our service providers. We
              take steps to ensure appropriate safeguards are in place for such transfers.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">10. Changes</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be communicated via
              the Service or by email.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">11. Contact</h2>
            <p>
              Questions about this Privacy Policy? Email{" "}
              <a href="mailto:info@bidapp.sa" className="text-primary hover:underline">info@bidapp.sa</a>.
            </p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground" data-testid="link-terms">
            Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
}
