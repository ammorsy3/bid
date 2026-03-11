import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileText, Inbox, BarChart3, Send, Users, Search, ClipboardList, Trophy, ArrowRight } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-xl font-bold text-[#E25E45]">Bid</span>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-[#E25E45] hover:bg-[#d04a32] text-white">Sign up</Button>
            </Link>
          </div>
        </div>
      </nav>
      <main>
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">Bid — Sourcing Redefined.</h1>
            <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">
              Create RFPs, receive proposals, compare vendors, and award projects in one platform.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="bg-[#E25E45] hover:bg-[#d04a32] text-white px-8 h-12 text-base">
                  Create an RFP
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 h-12 text-base">
                  Submit a Proposal
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-semibold text-[#E25E45] uppercase tracking-widest text-center mb-10">How it works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  icon: FileText,
                  title: "Create RFP",
                  desc: "Define scope, deliverables, and timeline.",
                },
                {
                  step: "02",
                  icon: Inbox,
                  title: "Receive Proposals",
                  desc: "Vendors submit structured proposals.",
                },
                {
                  step: "03",
                  icon: BarChart3,
                  title: "Compare & Award",
                  desc: "Review, compare, and select the best offer.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col items-start"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-[#E25E45] bg-red-50 rounded-full w-8 h-8 flex items-center justify-center">
                      {item.step}
                    </span>
                    <item.icon className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-gray-200 p-8">
              <h3 className="text-xs font-semibold text-[#E25E45] uppercase tracking-widest mb-5">For Requesters</h3>
              <ul className="space-y-4">
                {[
                  { icon: ClipboardList, text: "Create RFPs" },
                  { icon: Send, text: "Invite vendors" },
                  { icon: BarChart3, text: "Compare proposals" },
                  { icon: Trophy, text: "Award projects" },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-gray-700">
                    <item.icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 p-8">
              <h3 className="text-xs font-semibold text-[#E25E45] uppercase tracking-widest mb-5">For Vendors</h3>
              <ul className="space-y-4">
                {[
                  { icon: Search, text: "Discover tenders" },
                  { icon: FileText, text: "Submit proposals" },
                  { icon: Users, text: "Track opportunities" },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-gray-700">
                    <item.icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold text-[#E25E45]">Bid</span>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#how-it-works" className="hover:text-gray-600 transition-colors">How it Works</a>
            <a href="mailto:hello@bid.sa" className="hover:text-gray-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
