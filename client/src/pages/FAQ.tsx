import { Link } from "wouter";
import { BidLogo } from "@/components/brand/BidLogo";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is Bid?",
    answer:
      "Bid is a private procurement platform designed for the Saudi market. It connects companies (requesters) that need goods or services with qualified vendors who can submit proposals. Requesters create tenders, invite vendors, and evaluate bids — all in one place.",
  },
  {
    question: "Who can use Bid?",
    answer:
      "Bid is open to any company registered in Saudi Arabia. You can join as a requester (to publish tenders and source vendors) or as a vendor (to discover opportunities and submit bids). Many companies do both.",
  },
  {
    question: "How do I publish a tender?",
    answer:
      "From your Dashboard, click New Tender. You can create one manually by filling in the title, scope, budget, deadline, and criteria — or let our AI assistant draft the brief for you. Once you're satisfied, publish the tender and share the invite link with your vendor network.",
  },
  {
    question: "How do vendors find my tender?",
    answer:
      "You can share a private invite link directly with vendors you already know. Published tenders also appear in the public Marketplace, where vendors can discover and apply to open opportunities.",
  },
  {
    question: "Is my tender information kept confidential?",
    answer:
      "Yes. Tenders are private by default — only vendors you explicitly invite can view the full details. When you publish to the Marketplace, the basic tender info becomes visible to all registered vendors, but submission details remain confidential.",
  },
  {
    question: "How do I submit a bid as a vendor?",
    answer:
      "Open the tender from the Marketplace or follow the invite link shared by the requester. Read the full brief, then click Submit Bid and fill in the custom form the requester has prepared. You can attach documents, pricing, and any additional information they've requested.",
  },
  {
    question: "Can I edit a tender after publishing it?",
    answer:
      "Yes. Open the tender from your Dashboard and use the Edit option. Note that vendors who have already received the invite link will see the updated information, so communicate any major changes to them directly.",
  },
  {
    question: "What does company verification mean?",
    answer:
      "Verified companies have had their Commercial Registration (CR) and/or VAT documents reviewed by the Bid team. A verified badge on your profile signals to partners and vendors that you are a legitimate, registered business in Saudi Arabia.",
  },
  {
    question: "How long does verification take?",
    answer:
      "Verification is typically completed within 1–3 business days after you upload your documents. You'll receive a notification once your status is updated.",
  },
  {
    question: "Can I invite team members to my company workspace?",
    answer:
      "Yes. From your Dashboard, use the Invite Team feature to add colleagues by email. They'll receive an invitation and, once they accept, will share your company profile and can collaborate on tenders.",
  },
  {
    question: "What is a Traction Link?",
    answer:
      "A Traction Link is a customisable public profile page for your company. You can add your logo, a bio, links, and highlight your services. Share it with potential partners as a lightweight company landing page.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Email us at info@bid.sa. Our support team is available Sunday through Thursday, 9 AM – 5 PM (AST). We aim to respond within one business day.",
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-medium hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{item.question}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {item.answer}
        </p>
      )}
    </div>
  );
}

export default function FAQ() {
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
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-10">
          Quick answers to the most common questions about Bid.
        </p>

        <div className="divide-y divide-border border border-border rounded-lg px-4">
          {faqs.map((item) => (
            <FAQAccordion key={item.question} item={item} />
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            Can't find what you're looking for?{" "}
            <a
              href="mailto:info@bid.sa"
              className="text-primary hover:underline font-medium"
            >
              Email our support team
            </a>{" "}
            and we'll get back to you within one business day.
          </p>
        </div>
      </main>
    </div>
  );
}
