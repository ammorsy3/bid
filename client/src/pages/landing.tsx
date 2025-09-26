import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Lock, Users, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-[#f33c20]">Bid</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <span className="text-neutral-600 hover:text-neutral-900 px-3 py-2 text-sm font-medium transition-colors cursor-pointer">
                  About
                </span>
              </Button>
              <Button variant="ghost" asChild>
                <span className="text-neutral-600 hover:text-neutral-900 px-3 py-2 text-sm font-medium transition-colors cursor-pointer">
                  Contact
                </span>
              </Button>
              <Button asChild>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 hover:bg-[#e04400] text-white px-6 py-2 rounded-lg font-medium transition-colors bg-[#e03c00]">
                  Login
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-neutral-900 mb-6">
              Professional
              <span className="text-[#f54a00]"> Procurement</span>
              <br />
              Platform
            </h1>
            <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
              Streamline your tender process with private invitations, qualified vendor management, and secure bid submissions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="hover:bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold text-lg bg-[#f33c20]">
                <Link href="/register?role=requester">
                  Start as Requester
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white hover:bg-neutral-50 text-[#f33c20] px-8 py-4 rounded-lg font-semibold text-lg border-2 border-[#f33c20]">
                <Link href="/register?role=vendor">
                  Join as Vendor
                </Link>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-[#f33c20]/10 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="text-[#f33c20] h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Private Tenders</h3>
                <p className="text-neutral-600">Invite only qualified vendors to your private tenders. No public browsing ensures confidentiality.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-[#f33c20]/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="text-[#f33c20] h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Vendor Management</h3>
                <p className="text-neutral-600">Build and manage your qualified vendor pool with unified pre-qualification processes.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-[#f33c20]/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="text-[#f33c20] h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">Fast Processing</h3>
                <p className="text-neutral-600">Streamlined workflows and card-based interface for quick decision making and bid processing.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
