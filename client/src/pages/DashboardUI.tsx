/**
 * Static visual mock of Dashboard.tsx — no hooks, no API calls, no auth.
 * All data is hardcoded. Drop into the router to preview the full UI.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Building2, FileText, Users, Inbox, LogOut, Search, CheckCircle,
  Mail, UserPlus, Eye, ShieldCheck, Clock, Plus, Copy, Check,
  Calendar, Send, MoreHorizontal, Trash2, Edit, ExternalLink,
  DollarSign, X, LayoutDashboard, Settings, Bell, MessageSquare,
  ChevronDown, Globe, HelpCircle, Sun, Moon, Monitor, ChevronRight,
  Filter, Handshake, ChevronsUpDown, Paintbrush, Briefcase,
  BookmarkPlus, Bookmark, Link2, Play, Video, XCircle, Loader2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BidLogo } from "@/components/brand/BidLogo";
import { StatusBadge } from "@/components/brand/StatusDot";

// ─── Sample data ─────────────────────────────────────────────────────────────

const SAMPLE_USER = {
  id: "u1",
  name: "Ahmed Al-Morsy",
  username: "ahmorsy07",
  email: "ahmorsy07@gmail.com",
  isAdmin: false,
  profilePictureUrl: null as string | null,
};

const SAMPLE_COMPANY = {
  id: "c1",
  name: "Acme Corporation",
  slug: "acme-corporation",
  role: "owner",
  verificationStatus: "verified",
  accountType: "company",
  profile: {
    displayName: "Acme Corporation",
    tractionSlug: "acme",
    bio: "Leading procurement and sourcing company in the GCC region.",
    logoUrl: null as string | null,
  },
};

const SAMPLE_TENDERS = [
  {
    id: "t1",
    title: "Office Renovation & Interior Design",
    description: "Looking for experienced contractors to handle full office renovation including flooring, lighting, workstations, and meeting room setup.",
    category: "Construction",
    deadline: "2026-06-15",
    budget: null,
    budgetRange: "SAR 80,000 – 120,000",
    status: "published",
    invitationToken: "tok1",
    createdAt: "2026-05-01",
    offersCount: 4,
    submissionType: "tech_fin_proposal",
    targetAudienceTypes: ["company"],
  },
  {
    id: "t2",
    title: "Annual IT Infrastructure Audit",
    description: "Seeking a qualified IT auditing firm to review our current infrastructure and identify security vulnerabilities.",
    category: "Technology",
    deadline: "2026-06-30",
    budget: null,
    budgetRange: "SAR 30,000 – 50,000",
    status: "published",
    invitationToken: "tok2",
    createdAt: "2026-05-10",
    offersCount: 1,
    submissionType: "tech_fin_proposal",
    targetAudienceTypes: ["company"],
  },
  {
    id: "t3",
    title: "Corporate Catering Services — Q3 2026",
    description: "Catering service required for a team of 45–60 employees Monday through Friday. Diverse menus including international and local options.",
    category: "Food & Beverage",
    deadline: "2026-05-31",
    budget: "SAR 15,000/month",
    budgetRange: null,
    status: "published",
    invitationToken: "tok3",
    createdAt: "2026-05-15",
    offersCount: 0,
    submissionType: "quote_only",
    targetAudienceTypes: ["company"],
  },
  {
    id: "t4",
    title: "Brand Redesign & Visual Identity Package",
    description: "Seeking a creative agency to overhaul our brand identity — logo, color palette, typography, and brand guidelines.",
    category: "Marketing",
    deadline: "2026-07-01",
    budget: null,
    budgetRange: null,
    status: "draft",
    invitationToken: "tok4",
    createdAt: "2026-05-20",
    offersCount: 0,
    submissionType: null,
    targetAudienceTypes: [],
  },
  {
    id: "t5",
    title: "Legal Services Retainer 2025",
    description: "Annual legal advisory and retainer services for corporate governance, contracts, and employment law.",
    category: "Legal",
    deadline: "2025-12-31",
    budget: null,
    budgetRange: "SAR 60,000 – 80,000",
    status: "closed",
    invitationToken: "tok5",
    createdAt: "2025-09-01",
    offersCount: 6,
    submissionType: "quote_only",
    targetAudienceTypes: ["company"],
  },
];

const SAMPLE_MY_OFFERS = [
  {
    id: "mo1",
    tenderId: "ext1",
    companyId: "c1",
    technicalFileUrl: "/files/tech.pdf",
    financialFileUrl: "/files/fin.pdf",
    combinedFileUrl: null,
    quotePrice: 38000,
    videoUrl: null,
    notes: "We specialize in cloud migrations across the GCC region with 50+ successful projects.",
    submittedAt: "2026-05-19",
    status: "pending" as const,
    tender: {
      id: "ext1",
      title: "Cloud Migration Consultation — Noor Retail Group",
      description: "Full AWS cloud migration for a retail chain with 12 branches.",
      deadline: "2026-06-20",
      budget: "SAR 40,000",
      status: "published",
      submissionType: "tech_fin_proposal",
    },
  },
  {
    id: "mo2",
    tenderId: "ext2",
    companyId: "c1",
    technicalFileUrl: null,
    financialFileUrl: null,
    combinedFileUrl: null,
    quotePrice: 24500,
    videoUrl: null,
    notes: null,
    submittedAt: "2026-05-10",
    status: "shortlisted" as const,
    tender: {
      id: "ext2",
      title: "Employee Training Program — Aldawaa Medical",
      description: "Comprehensive soft-skills and leadership training for 200 staff.",
      deadline: "2026-06-15",
      budget: "SAR 25,000",
      status: "published",
      submissionType: "quote_only",
    },
  },
  {
    id: "mo3",
    tenderId: "ext3",
    companyId: "c1",
    technicalFileUrl: "/files/tech2.pdf",
    financialFileUrl: "/files/fin2.pdf",
    combinedFileUrl: null,
    quotePrice: 55000,
    videoUrl: null,
    notes: "Award-winning team with 12 years in commercial web design.",
    submittedAt: "2026-04-28",
    status: "rejected" as const,
    tender: {
      id: "ext3",
      title: "Website Redesign — Al-Faris Holding",
      description: "Complete redesign of corporate website with CMS integration.",
      deadline: "2026-05-01",
      budget: "SAR 60,000",
      status: "closed",
      submissionType: "tech_fin_proposal",
    },
  },
];

const SAMPLE_INCOMING_OFFERS = [
  {
    id: "io1",
    tenderId: "t1",
    companyId: "vc1",
    technicalFileUrl: "/files/tech_sb.pdf",
    financialFileUrl: "/files/fin_sb.pdf",
    combinedFileUrl: null,
    quotePrice: 95000,
    videoUrl: null,
    notes: "8 years of commercial renovation experience across the GCC. Can begin within 2 weeks of signing.",
    submittedAt: "2026-05-20",
    status: "pending" as const,
    isViewed: false,
    tender: { id: "t1", title: "Office Renovation & Interior Design", description: null, deadline: "2026-06-15", budget: null, status: "published", submissionType: "tech_fin_proposal" },
    company: { id: "vc1", slug: "saudi-build", name: "Saudi Build Co.", category: "Construction & Contracting", verificationStatus: "verified" },
    profile: { displayName: "Saudi Build Co.", logoUrl: null },
  },
  {
    id: "io2",
    tenderId: "t1",
    companyId: "vc2",
    technicalFileUrl: "/files/tech_di.pdf",
    financialFileUrl: "/files/fin_di.pdf",
    combinedFileUrl: null,
    quotePrice: 88500,
    videoUrl: null,
    notes: "Award-winning studio with 80+ commercial fit-out projects.",
    submittedAt: "2026-05-18",
    status: "pending" as const,
    isViewed: true,
    tender: { id: "t1", title: "Office Renovation & Interior Design", description: null, deadline: "2026-06-15", budget: null, status: "published", submissionType: "tech_fin_proposal" },
    company: { id: "vc2", slug: "design-interiors", name: "Design Interiors LLC", category: "Interior Design", verificationStatus: "not_verified" },
    profile: { displayName: "Design Interiors LLC", logoUrl: null },
  },
  {
    id: "io3",
    tenderId: "t1",
    companyId: "vc3",
    technicalFileUrl: "/files/tech_nc.pdf",
    financialFileUrl: "/files/fin_nc.pdf",
    combinedFileUrl: null,
    quotePrice: 110000,
    videoUrl: null,
    notes: "Scandinavian-inspired approach — sustainable materials, minimal waste, 6-week completion guarantee.",
    submittedAt: "2026-05-15",
    status: "shortlisted" as const,
    isViewed: true,
    tender: { id: "t1", title: "Office Renovation & Interior Design", description: null, deadline: "2026-06-15", budget: null, status: "published", submissionType: "tech_fin_proposal" },
    company: { id: "vc3", slug: "nordic-craft", name: "Nordic Craft Studios", category: "Architecture & Design", verificationStatus: "verified" },
    profile: { displayName: "Nordic Craft Studios", logoUrl: null },
  },
  {
    id: "io4",
    tenderId: "t2",
    companyId: "vc4",
    technicalFileUrl: "/files/tech_tg.pdf",
    financialFileUrl: "/files/fin_tg.pdf",
    combinedFileUrl: null,
    quotePrice: 42000,
    videoUrl: null,
    notes: "ISO 27001 certified firm. Deliverables include full audit report, risk register, and remediation roadmap.",
    submittedAt: "2026-05-22",
    status: "pending" as const,
    isViewed: false,
    tender: { id: "t2", title: "Annual IT Infrastructure Audit", description: null, deadline: "2026-06-30", budget: null, status: "published", submissionType: "tech_fin_proposal" },
    company: { id: "vc4", slug: "techguard", name: "TechGuard Advisory", category: "IT & Cybersecurity", verificationStatus: "verified" },
    profile: { displayName: "TechGuard Advisory", logoUrl: null },
  },
  {
    id: "io5",
    tenderId: "t5",
    companyId: "vc5",
    technicalFileUrl: null,
    financialFileUrl: null,
    combinedFileUrl: null,
    quotePrice: 72000,
    videoUrl: null,
    notes: null,
    submittedAt: "2025-12-05",
    status: "accepted" as const,
    isViewed: true,
    tender: { id: "t5", title: "Legal Services Retainer 2025", description: null, deadline: "2025-12-31", budget: null, status: "closed", submissionType: "quote_only" },
    company: { id: "vc5", slug: "alrashid-partners", name: "Al-Rashid & Partners", category: "Legal Services", verificationStatus: "verified" },
    profile: { displayName: "Al-Rashid & Partners", logoUrl: null },
  },
];

const SAMPLE_VENDORS = [
  { id: "v1", companyId: "vc1", slug: "saudi-build", hasProfile: true, company: "Saudi Build Co.", legalName: "Saudi Build Company Ltd.", category: "Construction & Contracting", city: "Riyadh", crNumber: "1010123456", vatNumber: "300123456789003", bio: "Specializes in commercial fit-outs and large-scale renovations across the GCC.", logoUrl: null, email: "info@saudibuild.sa", verificationStatus: "verified", joinMethod: "proposal_accepted", joinedAt: "2026-05-20" },
  { id: "v2", companyId: "vc4", slug: "techguard", hasProfile: true, company: "TechGuard Advisory", legalName: null, category: "IT & Cybersecurity", city: "Riyadh", crNumber: null, vatNumber: null, bio: "ISO-certified cybersecurity consultancy. CISO advisory, penetration testing, and compliance audits.", logoUrl: null, email: "hello@techguard.sa", verificationStatus: "verified", joinMethod: "invitation", joinedAt: "2026-04-10" },
  { id: "v3", companyId: "vc5", slug: "alrashid-partners", hasProfile: true, company: "Al-Rashid & Partners", legalName: "Al-Rashid Law Firm", category: "Legal Services", city: "Riyadh", crNumber: "1010654321", vatNumber: null, bio: "Full-service law firm specializing in corporate, employment, and commercial law.", logoUrl: null, email: "legal@alrashid.sa", verificationStatus: "verified", joinMethod: "proposal_accepted", joinedAt: "2025-12-05" },
  { id: "v4", companyId: "vc6", slug: "green-catering", hasProfile: true, company: "Green Catering Co.", legalName: null, category: "Food & Catering", city: "Jeddah", crNumber: null, vatNumber: null, bio: "Corporate catering specialists with halal-certified kitchens and customizable menus.", logoUrl: null, email: "orders@greencatering.sa", verificationStatus: "not_verified", joinMethod: "traction_link", joinedAt: "2026-03-15" },
  { id: "v5", companyId: "vc3", slug: "nordic-craft", hasProfile: true, company: "Nordic Craft Studios", legalName: null, category: "Architecture & Design", city: "Dammam", crNumber: null, vatNumber: null, bio: "Scandinavian-inspired architecture firm known for sustainable and minimalist corporate spaces.", logoUrl: null, email: "studio@nordiccraft.sa", verificationStatus: "verified", joinMethod: "invitation", joinedAt: "2026-05-15" },
];

const SAMPLE_PENDING_REQUESTS = [
  {
    id: "jr1",
    status: "pending",
    createdAt: "2026-05-23",
    vendor: {
      id: "vr1",
      slug: "mawakib-print",
      hasProfile: true,
      name: "Mawakib Print & Media",
      email: "hello@mawakib.sa",
      company: "Mawakib Print & Media",
      expertise: "Marketing & Print",
      verificationStatus: "not_verified",
      logoUrl: null,
      bio: "Full-service marketing agency covering brand collateral, signage, and digital media.",
      websiteUrl: "https://mawakib.sa",
    },
  },
];

const SAMPLE_ONBOARDING = {
  isVerified: true,
  hasCompletedProfile: true,
  hasVendors: true,
  hasTender: false,
  hasReviewedProposal: false,
  hasExploredMarketplace: false,
  completedCount: 3,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  quote_only: "Price Quote Only",
  tech_fin_proposal: "Technical & Financial",
  video_only: "Video Only",
  tech_fin_with_video: "Tech & Fin + Video",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function tenderStatusBadge(status: string, deadline?: string) {
  const isPast = deadline && new Date(deadline) < new Date();
  if (status === "published") return { state: "active" as const, label: "Published" };
  if (status === "draft") return { state: "pending" as const, label: "Draft" };
  if (status === "closed") return isPast ? { state: "lost" as const, label: "Closed · Deadline Passed" } : { state: "lost" as const, label: "Closed" };
  if (status === "cancelled") return { state: "lost" as const, label: "Cancelled" };
  return { state: "pending" as const, label: status };
}

function proposalStatusBadge(status: string) {
  if (status === "accepted") return { state: "won" as const, label: "Accepted" };
  if (status === "rejected") return { state: "lost" as const, label: "Not Selected" };
  if (status === "shortlisted") return { state: "decision" as const, label: "Shortlisted" };
  return { state: "pending" as const, label: "Pending" };
}

function spotlightColor(status: string): "green" | "red" | "blue" | "orange" | "purple" {
  if (status === "published") return "green";
  if (status === "draft") return "purple";
  if (status === "closed" || status === "cancelled") return "orange";
  return "blue";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardUI() {
  const user = SAMPLE_USER;
  const activeCompany = SAMPLE_COMPANY;
  const tenders = SAMPLE_TENDERS;
  const myOffers = SAMPLE_MY_OFFERS;
  const incomingOffers = SAMPLE_INCOMING_OFFERS;
  const vendors = SAMPLE_VENDORS;
  const pendingRequests = SAMPLE_PENDING_REQUESTS;
  const onboardingTasks = SAMPLE_ONBOARDING;

  const [activeTab, setActiveTab] = useState("overview");
  const [proposalsSubTab, setProposalsSubTab] = useState("submitted");
  const [vendorsSubTab, setVendorsSubTab] = useState("vendors-list");
  const [tenderFilter, setTenderFilter] = useState<"all" | "published" | "draft" | "closed">("all");
  const [tenderSearchQuery, setTenderSearchQuery] = useState("");
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [selectedProposal, setSelectedProposal] = useState<typeof SAMPLE_INCOMING_OFFERS[0] | null>(null);
  const [currentTheme, setCurrentTheme] = useState("light");

  const isCompanyVerified = activeCompany.verificationStatus === "verified";
  const userRole = activeCompany.role;
  const canManage = ["owner", "admin"].includes(userRole);

  const dotColor = currentTheme === "dark"
    ? "rgba(244, 237, 225, 0.10)"
    : "rgba(138, 128, 120, 0.22)";

  const filteredTenders = tenders.filter((t) => {
    const matchesSearch = !tenderSearchQuery ||
      t.title.toLowerCase().includes(tenderSearchQuery.toLowerCase());
    const matchesFilter = tenderFilter === "all" || t.status === tenderFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch = !vendorSearchQuery ||
      v.company.toLowerCase().includes(vendorSearchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
    const matchesCity = cityFilter === "all" || v.city === cityFilter;
    const matchesVerification = verificationFilter === "all" || v.verificationStatus === verificationFilter;
    return matchesSearch && matchesCategory && matchesCity && matchesVerification;
  });

  const activeFilterCount = [categoryFilter, cityFilter, verificationFilter].filter((f) => f !== "all").length;
  const uniqueCategories = [...new Set(vendors.map((v) => v.category).filter(Boolean))].sort();
  const uniqueCities = [...new Set(vendors.map((v) => v.city).filter(Boolean) as string[])].sort();

  const tendersReadyToNegotiate = tenders.filter(
    (t) => t.status === "closed" && t.offersCount >= 2 &&
      !incomingOffers.some((o) => o.tenderId === t.id && o.status === "accepted")
  );

  // onboarding progress
  const allFlags = [isCompanyVerified, onboardingTasks.hasCompletedProfile, onboardingTasks.hasVendors, onboardingTasks.hasTender, onboardingTasks.hasReviewedProposal, onboardingTasks.hasExploredMarketplace];
  const completedCount = allFlags.filter(Boolean).length;
  const totalCount = allFlags.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <>
      <SidebarProvider>
        <Sidebar collapsible="icon" side="left" className="border-r border-border">
          {/* Brand accent strip */}
          <div className="h-0.5 bg-gradient-to-r from-[#FE3C01] to-[#F19A8F] flex-shrink-0" />

          <SidebarHeader className="border-b px-4 py-4">
            <div className="flex items-center gap-3">
              <BidLogo variant="orange" size={28} />
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <h2 className="font-semibold text-sm truncate">
                  {activeCompany.profile.displayName}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  Owner · Verified
                </p>
              </div>
              <SidebarTrigger className="ml-auto flex-shrink-0 group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            {/* Create & Search */}
            {canManage && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-2">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Create RFP"
                        className="py-3 text-base rounded-lg bg-[#FE3C01] text-white hover:bg-[#D44D3A] hover:text-white"
                      >
                        <Plus className="h-5 w-5 text-white" />
                        <span className="text-base font-medium group-data-[collapsible=icon]:hidden text-white">
                          Create RFP
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Search RFPs"
                        className="py-3 text-base rounded-lg hover:bg-muted"
                      >
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <span className="text-base font-medium group-data-[collapsible=icon]:hidden">
                          Search RFPs
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Nav */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {[
                    { value: "overview", label: "Overview", icon: LayoutDashboard },
                    { value: "tenders", label: "RFPs", icon: FileText },
                    { value: "proposals", label: "Proposals", icon: Inbox },
                    { value: "vendors", label: "Vendors Base", icon: Users },
                  ].map((item) => (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        isActive={activeTab === item.value}
                        onClick={() => setActiveTab(item.value)}
                        tooltip={item.label}
                        className={`py-3 text-base rounded-lg ${
                          activeTab === item.value
                            ? "bg-[#FE3C01]/15 text-[#FE3C01] hover:bg-[#FE3C01]/20 hover:text-[#FE3C01]"
                            : "hover:bg-muted"
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${activeTab === item.value ? "text-[#FE3C01]" : "text-muted-foreground"}`} />
                        <span className={`text-base font-medium ${activeTab === item.value ? "text-[#FE3C01]" : ""}`}>
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Marketplace portal */}
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-2 group-data-[collapsible=icon]:px-0">
                  <div className="w-full rounded-xl border border-[#FE3C01]/20 bg-gradient-to-br from-[#FE3C01]/5 to-[#F19A8F]/10 px-3 py-3 cursor-pointer hover:from-[#FE3C01]/10 hover:to-[#F19A8F]/20 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[#FE3C01]/10 flex items-center justify-center flex-shrink-0">
                        <Globe className="h-4 w-4 text-[#FE3C01]" />
                      </div>
                      <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-semibold text-gray-900">Marketplace</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">Browse open RFPs</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-[#FE3C01]/50 flex-shrink-0 group-data-[collapsible=icon]:hidden" />
                    </div>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-[#C96B7E] flex items-center justify-center text-white text-sm font-medium">
                  AH
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#FE3C01] flex items-center justify-center border-2 border-white">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* ── Main content ── */}
        <SidebarInset className="bg-gray-50">
          <main
            className="flex-1 overflow-auto p-4 sm:p-6"
            style={{
              backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

              {/* ══════════════════════════════════════════════════════════
                  OVERVIEW TAB
              ══════════════════════════════════════════════════════════ */}
              <TabsContent value="overview" className="space-y-10 w-full pt-2 px-1 sm:px-2">

                {/* Stat cards */}
                {canManage && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl border-2 border-border shadow-sm p-5 sm:p-7">
                      <div className="flex items-center gap-5">
                        <div className="p-3 rounded-xl bg-[#FE3C01] text-white flex-shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-display font-black text-4xl text-gray-900 tracking-[-0.03em] leading-[1.1] tabular-nums">
                            {tenders.filter((t) => t.status === "published").length}
                          </p>
                          <p className="text-sm text-gray-500">Active RFPs</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border-2 border-border shadow-sm p-5 sm:p-7">
                      <div className="flex items-center gap-5">
                        <div className="p-3 rounded-xl bg-gray-100 text-gray-500 flex-shrink-0">
                          <Inbox className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-display font-black text-4xl text-gray-900 tracking-[-0.03em] leading-[1.1] tabular-nums">
                            {incomingOffers.filter((o) => o.status === "pending").length}
                          </p>
                          <p className="text-sm text-gray-500">Pending Proposals</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border-2 border-border shadow-sm p-5 sm:p-7">
                      <div className="flex items-center gap-5">
                        <div className="p-3 rounded-xl bg-gray-100 text-gray-500 flex-shrink-0">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-display font-black text-4xl text-gray-900 tracking-[-0.03em] leading-[1.1] tabular-nums">
                            {vendors.length}
                          </p>
                          <p className="text-sm text-gray-500">Vendors in Base</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ready to negotiate banner */}
                {canManage && tendersReadyToNegotiate.length > 0 && (
                  <div
                    className="border-2 border-[#FE3C01]/20 rounded-2xl overflow-hidden"
                    style={{
                      backgroundColor: "#FFF8F7",
                      backgroundImage: "radial-gradient(circle, #e8c5be 1px, transparent 1px)",
                      backgroundSize: "18px 18px",
                    }}
                  >
                    <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#FF8A6B]" />
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-[#FE3C01]/10 border border-[#FE3C01]/20 flex items-center justify-center flex-shrink-0">
                          <Handshake className="h-5 w-5 text-[#FE3C01]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Ready to Negotiate</h3>
                          <p className="text-sm text-muted-foreground">
                            {tendersReadyToNegotiate.length} RFP{tendersReadyToNegotiate.length > 1 ? "s have" : " has"} 2+ proposals and no winner yet.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {tendersReadyToNegotiate.slice(0, 3).map((tender) => (
                          <div key={tender.id} className="bg-card rounded-xl border border-[#FE3C01]/10 p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-foreground">{tender.title}</p>
                              <p className="text-xs text-muted-foreground">{tender.offersCount} proposals received</p>
                            </div>
                            <Button size="sm" className="bg-[#FE3C01] hover:bg-[#d54d35] text-white flex-shrink-0"
                              onClick={() => setActiveTab("tenders")}>
                              Negotiate Now →
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Book demo banner */}
                <div className="bg-white rounded-2xl border-2 border-border shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#F19A8F]" />
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-[#FE3C01]/10 flex-shrink-0">
                        <Play className="h-5 w-5 text-[#FE3C01]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Book a product demo</h3>
                        <p className="text-sm text-gray-500">See how Bid can streamline your procurement process end-to-end.</p>
                      </div>
                    </div>
                    <Button className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white flex-shrink-0">
                      Book Demo
                    </Button>
                  </div>
                </div>

                {/* Get started checklist */}
                <div className="bg-white rounded-2xl border-2 border-border shadow-lg overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#F19A8F]" />
                  <div className="px-6 sm:px-8 pt-5 pb-6 sm:pt-6 sm:pb-8">
                    <div className="mb-4">
                      <h2 className="font-display font-black text-2xl text-gray-900 tracking-[-0.03em] leading-[1.15]">
                        Get started with Bid
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Complete these steps to get the most out of the platform.
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">
                          {completedCount} of {totalCount} tasks complete
                        </span>
                        <span className="text-sm font-bold text-[#FE3C01]">{progressPct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#FE3C01] to-[#F19A8F] transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <Accordion type="single" collapsible defaultValue="task-4" className="space-y-3">

                      {/* Task 1 */}
                      <AccordionItem value="task-1" className={`border-2 rounded-xl px-4 transition-all duration-300 ${isCompanyVerified ? "border-[#FE3C01] bg-[#FE3C01]/5" : "border-border"}`}>
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCompanyVerified ? "bg-[#FE3C01] text-white" : "bg-gray-100 text-gray-500"}`}>
                              {isCompanyVerified ? <Check className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold text-left ${isCompanyVerified ? "text-[#FE3C01]" : "text-gray-900"}`}>
                              Get company verified
                            </span>
                            {isCompanyVerified && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                                <Check className="h-3 w-3" /> Completed
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="flex items-center gap-8">
                            <div className="flex-1 min-w-0 max-w-md space-y-4">
                              <p className="text-[15px] leading-relaxed text-muted-foreground">
                                Upload your CR and VAT certificate to get verified. Verified companies can publish RFPs and access the full marketplace.
                              </p>
                              <Button className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white">
                                Go to Verification →
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 2 */}
                      <AccordionItem value="task-2" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks.hasCompletedProfile ? "border-[#FE3C01] bg-[#FE3C01]/5" : "border-border"}`}>
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks.hasCompletedProfile ? "bg-[#FE3C01] text-white" : "bg-gray-100 text-gray-500"}`}>
                              {onboardingTasks.hasCompletedProfile ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold text-left ${onboardingTasks.hasCompletedProfile ? "text-[#FE3C01]" : "text-gray-900"}`}>
                              Complete company profile
                            </span>
                            {onboardingTasks.hasCompletedProfile && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                                <Check className="h-3 w-3" /> Completed
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="flex-1 min-w-0 max-w-md space-y-4">
                            <p className="text-[15px] leading-relaxed text-muted-foreground">
                              Add your logo, description, and contact details to build trust with vendors.
                            </p>
                            <Button className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white">Edit Profile →</Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 3 */}
                      <AccordionItem value="task-3" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks.hasVendors ? "border-[#FE3C01] bg-[#FE3C01]/5" : "border-border"}`}>
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${onboardingTasks.hasVendors ? "bg-[#FE3C01] text-white" : "bg-gray-100 text-gray-500"}`}>
                              {onboardingTasks.hasVendors ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold text-left ${onboardingTasks.hasVendors ? "text-[#FE3C01]" : "text-gray-900"}`}>
                              Build your Vendors Base
                            </span>
                            {onboardingTasks.hasVendors && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                                <Check className="h-3 w-3" /> Completed
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="flex-1 min-w-0 max-w-md space-y-4">
                            <p className="text-[15px] leading-relaxed text-muted-foreground">
                              Add trusted vendors to your private base. Invite them directly to future RFPs.
                            </p>
                            <Button className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
                              onClick={() => setActiveTab("vendors")}>
                              Go to Vendors →
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 4 */}
                      <AccordionItem value="task-4" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks.hasTender ? "border-[#FE3C01] bg-[#FE3C01]/5" : "border-border"}`}>
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${onboardingTasks.hasTender ? "bg-[#FE3C01] text-white" : "bg-gray-100 text-gray-500"}`}>
                              {onboardingTasks.hasTender ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold text-left ${onboardingTasks.hasTender ? "text-[#FE3C01]" : "text-gray-900"}`}>
                              Create your first RFP
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="flex-1 min-w-0 max-w-md space-y-4">
                            <p className="text-[15px] leading-relaxed text-muted-foreground">
                              Describe what you need and Bid's AI will turn it into a structured, vendor-ready RFP in seconds.
                            </p>
                            <Button className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white">Create RFP →</Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 5 */}
                      <AccordionItem value="task-5" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks.hasReviewedProposal ? "border-[#FE3C01] bg-[#FE3C01]/5" : "border-border"}`}>
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${onboardingTasks.hasReviewedProposal ? "bg-[#FE3C01] text-white" : "bg-gray-100 text-gray-500"}`}>
                              {onboardingTasks.hasReviewedProposal ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold text-left ${onboardingTasks.hasReviewedProposal ? "text-[#FE3C01]" : "text-gray-900"}`}>
                              Review your first proposal
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="flex-1 min-w-0 max-w-md space-y-4">
                            <p className="text-[15px] leading-relaxed text-muted-foreground">
                              Once vendors submit proposals on your RFPs, review them and accept, shortlist, or reject.
                            </p>
                            <Button className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
                              onClick={() => setActiveTab("proposals")}>
                              Go to Proposals →
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 6 */}
                      <AccordionItem value="task-6" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks.hasExploredMarketplace ? "border-[#FE3C01] bg-[#FE3C01]/5" : "border-border"}`}>
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${onboardingTasks.hasExploredMarketplace ? "bg-[#FE3C01] text-white" : "bg-gray-100 text-gray-500"}`}>
                              {onboardingTasks.hasExploredMarketplace ? <Check className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold text-left ${onboardingTasks.hasExploredMarketplace ? "text-[#FE3C01]" : "text-gray-900"}`}>
                              Explore the Tenders Marketplace
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="flex-1 min-w-0 max-w-md space-y-4">
                            <p className="text-[15px] leading-relaxed text-muted-foreground">
                              Browse open RFPs from other companies and submit proposals as a vendor.
                            </p>
                            <Button className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white">
                              Go to Marketplace →
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                    </Accordion>
                  </div>
                </div>
              </TabsContent>

              {/* ══════════════════════════════════════════════════════════
                  TENDERS / RFPs TAB
              ══════════════════════════════════════════════════════════ */}
              {canManage && (
                <TabsContent value="tenders" className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-display font-black text-3xl tracking-[-0.04em]">RFPs</h2>
                      <p className="text-muted-foreground">Manage your requests for proposals and track submissions.</p>
                    </div>
                    <Button className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      New RFP
                    </Button>
                  </div>

                  {/* Filters */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search RFPs…"
                            value={tenderSearchQuery}
                            onChange={(e) => setTenderSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Tabs value={tenderFilter} onValueChange={(v) => setTenderFilter(v as any)} className="w-full sm:w-auto">
                          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="published">Published</TabsTrigger>
                            <TabsTrigger value="draft">Draft</TabsTrigger>
                            <TabsTrigger value="closed">Closed</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tender cards */}
                  {filteredTenders.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="font-display font-black text-2xl mb-2 tracking-[-0.03em]">No RFPs found</h3>
                        <p className="text-muted-foreground text-center max-w-md mb-6">
                          Create your first RFP and start receiving proposals from vendors.
                        </p>
                        <Button className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white">
                          <Plus className="h-4 w-4 mr-2" /> Create RFP
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredTenders.map((tender) => {
                        const sb = tenderStatusBadge(tender.status, tender.deadline);
                        const isDeadlineSoon = new Date(tender.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                        const isReadyToNegotiate = tender.status === "closed" && tender.offersCount >= 2 &&
                          !incomingOffers.some((o) => o.tenderId === tender.id && o.status === "accepted");

                        return (
                          <SpotlightCard
                            key={tender.id}
                            className="bg-card border-border"
                            spotlightColor={spotlightColor(tender.status)}
                          >
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-bold text-foreground cursor-pointer hover:text-[#FE3C01]">
                                      {tender.title}
                                    </h3>
                                    <StatusBadge state={sb.state} label={sb.label} />
                                    {isReadyToNegotiate && (
                                      <span className="text-[9px] font-bold bg-[#FE3C01] text-white px-2 py-0.5 rounded-full animate-pulse">
                                        Negotiate
                                      </span>
                                    )}
                                    {tender.targetAudienceTypes && tender.targetAudienceTypes.map((type) => (
                                      <span key={type} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-border text-muted-foreground bg-muted">
                                        {type === "company" ? "Companies" : type === "team" ? "Teams" : "Individuals"}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-sm font-medium text-muted-foreground line-clamp-2">
                                    {tender.description}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                  <Calendar className="h-4 w-4" />
                                  <span className={`font-mono ${isDeadlineSoon ? "text-red-500 font-semibold" : ""}`}>
                                    {formatDate(tender.deadline)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                  <Send className="h-4 w-4" />
                                  <span><span className="font-mono">{tender.offersCount}</span> offers</span>
                                </div>
                                {tender.submissionType && (
                                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <FileText className="h-4 w-4" />
                                    <span>{SUBMISSION_TYPE_LABELS[tender.submissionType]}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                  <FileText className="h-4 w-4" />
                                  <span>{tender.budgetRange || tender.budget || "No budget set"}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-2" /> View
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Copy className="h-4 w-4 mr-2" /> Copy Link
                                </Button>
                                {["draft", "published"].includes(tender.status) && (
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </Button>
                              </div>
                            </div>
                          </SpotlightCard>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              )}

              {/* ══════════════════════════════════════════════════════════
                  PROPOSALS TAB
              ══════════════════════════════════════════════════════════ */}
              <TabsContent value="proposals" className="space-y-6">
                <div className="mb-4">
                  <h2 className="font-display font-black text-3xl tracking-[-0.04em]">Proposals</h2>
                  <p className="text-muted-foreground">Track proposals you've submitted and review incoming ones.</p>
                </div>

                <Tabs value={proposalsSubTab} onValueChange={setProposalsSubTab} className="space-y-4">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="submitted" className="gap-2">
                      <Send className="h-4 w-4" />
                      My Proposals ({myOffers.length})
                    </TabsTrigger>
                    <TabsTrigger value="received" className="gap-2">
                      <Inbox className="h-4 w-4" />
                      Incoming ({incomingOffers.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* My submitted proposals */}
                  <TabsContent value="submitted" className="space-y-4">
                    {myOffers.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Send className="h-12 w-12 text-muted-foreground mb-3" />
                          <p className="font-display font-black text-2xl tracking-[-0.03em]">No proposals yet</p>
                          <p className="text-sm text-muted-foreground mt-1">Browse the marketplace to find RFPs to bid on.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {myOffers.map((offer) => {
                          const isExpired = new Date(offer.tender.deadline) < new Date();
                          const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          const sb = proposalStatusBadge(offer.status);

                          return (
                            <SpotlightCard
                              key={offer.id}
                              className="bg-card border-border"
                              spotlightColor={offer.status === "accepted" ? "green" : offer.status === "rejected" ? "red" : offer.status === "shortlisted" ? "blue" : "orange"}
                            >
                              <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 className="text-xl font-bold text-foreground cursor-pointer hover:text-[#FE3C01]">
                                        {offer.tender.title}
                                      </h3>
                                      <StatusBadge state={sb.state} label={sb.label} />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground line-clamp-2">
                                      {offer.tender.description || "No description provided."}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <Calendar className="h-4 w-4" />
                                    <span>Submitted {formatDate(offer.submittedAt)}</span>
                                  </div>
                                  <div className={`flex items-center gap-2 font-medium ${isExpired ? "text-red-600" : daysRemaining <= 3 ? "text-orange-600" : "text-muted-foreground"}`}>
                                    <Clock className="h-4 w-4" />
                                    <span>{isExpired ? "Deadline passed" : `${daysRemaining} days left`}</span>
                                  </div>
                                  {offer.notes && (
                                    <div className="flex items-center gap-2 text-muted-foreground font-medium col-span-2">
                                      <FileText className="h-4 w-4" />
                                      <span className="italic line-clamp-1">"{offer.notes}"</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-2" /> View Tender
                                  </Button>
                                  {offer.technicalFileUrl && (
                                    <Button variant="outline" size="sm">
                                      <FileText className="h-4 w-4 mr-2" /> Technical
                                    </Button>
                                  )}
                                  {offer.financialFileUrl && (
                                    <Button variant="outline" size="sm">
                                      <DollarSign className="h-4 w-4 mr-2" /> Financial
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </SpotlightCard>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Incoming offers */}
                  <TabsContent value="received" className="space-y-4">
                    {incomingOffers.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">No proposals received yet.</p>
                          <p className="text-sm text-muted-foreground mt-1">Publish an RFP to start receiving proposals.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {incomingOffers.map((offer) => {
                          const isExpired = new Date(offer.tender.deadline) < new Date();
                          const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                          return (
                            <SpotlightCard
                              key={offer.id}
                              className="bg-card border-border"
                              spotlightColor={offer.status === "accepted" ? "green" : offer.status === "rejected" ? "red" : "blue"}
                            >
                              <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 className="text-xl font-bold text-foreground">
                                        {offer.profile?.displayName || offer.company.name}
                                      </h3>
                                      {offer.company.verificationStatus === "verified" && (
                                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                                      )}
                                      {offer.status === "accepted" && (
                                        <Badge className="bg-green-100 text-green-800 text-xs">
                                          <CheckCircle className="h-3 w-3 mr-1" /> Accepted
                                        </Badge>
                                      )}
                                      {offer.status === "rejected" && (
                                        <Badge className="bg-muted text-muted-foreground text-xs">
                                          <XCircle className="h-3 w-3 mr-1" /> Rejected
                                        </Badge>
                                      )}
                                      {offer.status === "shortlisted" && (
                                        <Badge className="bg-blue-50 text-blue-800 text-xs">
                                          <Bookmark className="h-3 w-3 mr-1" /> Shortlisted
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                      For{" "}
                                      <span className="cursor-pointer hover:text-[#FE3C01] font-bold">
                                        {offer.tender.title}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <Calendar className="h-4 w-4" />
                                    <span>Received {formatDate(offer.submittedAt)}</span>
                                  </div>
                                  <div className={`flex items-center gap-2 font-medium ${isExpired ? "text-red-600" : daysRemaining <= 3 ? "text-orange-600" : "text-muted-foreground"}`}>
                                    <Clock className="h-4 w-4" />
                                    <span>{isExpired ? "Deadline passed" : `${daysRemaining} days left`}</span>
                                  </div>
                                  {offer.company.category && (
                                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                      <Building2 className="h-4 w-4" />
                                      <span>{offer.company.category}</span>
                                    </div>
                                  )}
                                  {offer.quotePrice && (
                                    <div className="flex items-center gap-2 font-medium text-green-600">
                                      <DollarSign className="h-4 w-4" />
                                      <span>SAR {offer.quotePrice.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>

                                {offer.notes && (
                                  <p className="text-sm mb-4 text-muted-foreground italic">"{offer.notes}"</p>
                                )}

                                <div className="flex flex-wrap gap-2">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-2" /> View
                                  </Button>
                                  {offer.technicalFileUrl && (
                                    <Button variant="outline" size="sm">
                                      <FileText className="h-4 w-4 mr-2" /> Proposal
                                    </Button>
                                  )}
                                  {offer.financialFileUrl && (
                                    <Button variant="outline" size="sm">
                                      <DollarSign className="h-4 w-4 mr-2" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    className="bg-[#FE3C01] hover:bg-[#d54d35] text-white"
                                    onClick={() => setSelectedProposal(offer)}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" /> View Tender
                                  </Button>
                                </div>
                              </div>
                            </SpotlightCard>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* ══════════════════════════════════════════════════════════
                  VENDORS BASE TAB
              ══════════════════════════════════════════════════════════ */}
              {canManage && (
                <TabsContent value="vendors" className="space-y-6">
                  <div className="mb-4">
                    <h2 className="font-display font-black text-3xl tracking-[-0.04em]">Vendors Base</h2>
                    <p className="text-muted-foreground">Your private network of trusted vendors.</p>
                  </div>

                  {/* Traction link card */}
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#FE3C01]/10 flex items-center justify-center">
                            <Link2 className="h-4 w-4 text-[#FE3C01]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Your Traction Link</p>
                            <p className="text-xs text-muted-foreground">Share this link with vendors to let them join your base.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
                            https://bid.sa/traction/acme
                          </div>
                          <Button variant="outline" size="sm">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Paintbrush className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Tabs value={vendorsSubTab} onValueChange={setVendorsSubTab} className="space-y-4">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="vendors-list" className="gap-2">
                        <Users className="h-4 w-4" />
                        Vendors Base ({vendors.length})
                      </TabsTrigger>
                      <TabsTrigger value="join-requests" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Pending Requests
                        {pendingRequests.length > 0 && (
                          <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    {/* Vendors list */}
                    <TabsContent value="vendors-list" className="space-y-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search vendors…"
                              value={vendorSearchQuery}
                              onChange={(e) => setVendorSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Filter className="h-4 w-4" />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="w-full sm:w-[160px] h-9">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {uniqueCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={cityFilter} onValueChange={setCityFilter}>
                          <SelectTrigger className="w-full sm:w-[160px] h-9">
                            <SelectValue placeholder="All Cities" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Cities</SelectItem>
                            {uniqueCities.map((city) => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                          <SelectTrigger className="w-full sm:w-[160px] h-9">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="not_verified">Unverified</SelectItem>
                          </SelectContent>
                        </Select>
                        {activeFilterCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2 text-muted-foreground"
                            onClick={() => { setCategoryFilter("all"); setCityFilter("all"); setVerificationFilter("all"); }}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Clear filters
                          </Button>
                        )}
                      </div>

                      {filteredVendors.length === 0 ? (
                        <Card>
                          <CardContent className="flex flex-col items-center justify-center py-16">
                            <Users className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="font-display font-black text-2xl mb-2 tracking-[-0.03em]">No vendors yet</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                              Add trusted vendors to your base by sharing your Traction Link or inviting them directly.
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                          {filteredVendors.map((vendor) => (
                            <SpotlightCard key={vendor.id} className="bg-card border-border" spotlightColor="blue">
                              <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                      <Building2 className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-foreground">{vendor.company}</h3>
                                        {vendor.verificationStatus === "verified" && (
                                          <Badge variant="secondary" className="gap-1">
                                            <CheckCircle className="h-3 w-3" /> Verified
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm font-medium text-muted-foreground">{vendor.category}</p>
                                    </div>
                                  </div>
                                  <Badge variant={vendor.joinMethod === "invitation" ? "default" : "outline"}>
                                    {vendor.joinMethod === "invitation" ? "Invited" : vendor.joinMethod === "proposal_accepted" ? "Via Proposal" : "Applied via Link"}
                                  </Badge>
                                </div>

                                {vendor.bio && (
                                  <p className="text-sm font-medium text-muted-foreground line-clamp-2 mb-4">{vendor.bio}</p>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                  {vendor.city && (
                                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                      <Building2 className="h-4 w-4" />
                                      <span>{vendor.city}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-2" /> View
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4 mr-2" /> Remove
                                  </Button>
                                </div>
                              </div>
                            </SpotlightCard>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* Join requests */}
                    <TabsContent value="join-requests" className="space-y-4">
                      {pendingRequests.length === 0 ? (
                        <Card>
                          <CardContent className="flex flex-col items-center justify-center py-16">
                            <UserPlus className="h-12 w-12 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No pending join requests.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <UserPlus className="h-5 w-5" />
                              Pending Requests ({pendingRequests.length})
                            </h3>
                            <p className="text-sm text-muted-foreground">Review vendors who applied to join your base.</p>
                          </div>
                          <div className="space-y-3">
                            {pendingRequests.map((request) => {
                              const initials = (request.vendor?.company || "U")
                                .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                              return (
                                <SpotlightCard
                                  key={request.id}
                                  className="bg-card border-border"
                                  spotlightColor={request.vendor?.verificationStatus === "verified" ? "green" : "purple"}
                                >
                                  <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
                                          <span className="text-sm font-bold text-primary">{initials}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-foreground truncate">
                                              {request.vendor?.company || "Unknown Vendor"}
                                            </h3>
                                            <Badge
                                              variant="outline"
                                              className="bg-muted text-muted-foreground border-border text-xs px-2 py-0"
                                            >
                                              Not Verified
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {request.vendor?.bio && (
                                      <p className="text-sm font-medium text-muted-foreground line-clamp-2 mb-4">
                                        {request.vendor.bio}
                                      </p>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                      {request.vendor?.expertise && (
                                        <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                          <Briefcase className="h-4 w-4" />
                                          <span>{request.vendor.expertise}</span>
                                        </div>
                                      )}
                                      {request.vendor?.websiteUrl && (
                                        <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                          <Globe className="h-4 w-4" />
                                          <a href={request.vendor.websiteUrl} target="_blank" rel="noopener noreferrer"
                                            className="hover:underline hover:text-[#FE3C01] truncate max-w-[160px]">
                                            {request.vendor.websiteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                                          </a>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                        <Calendar className="h-4 w-4" />
                                        <span>{formatDate(request.createdAt)}</span>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <Button variant="outline" size="sm">
                                        <Eye className="h-4 w-4 mr-2" /> View
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-red-200 text-red-600 hover:bg-red-50"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" /> Reject
                                      </Button>
                                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                        <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                      </Button>
                                    </div>
                                  </div>
                                </SpotlightCard>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              )}

            </Tabs>
          </main>
        </SidebarInset>
      </SidebarProvider>

      {/* ── Proposal detail modal (same as real app) ── */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedProposal?.profile?.displayName || selectedProposal?.company.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProposal?.company.category || "No category"}
            </DialogDescription>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Company</h4>
                  <p className="text-sm">{selectedProposal.company.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Category</h4>
                  <p className="text-sm">{selectedProposal.company.category || "Not specified"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Verification</h4>
                  <Badge variant={selectedProposal.company.verificationStatus === "verified" ? "default" : "secondary"}>
                    {selectedProposal.company.verificationStatus === "verified" ? "Verified" : "Under Review"}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">For Tender</h4>
                  <p className="text-sm font-medium">{selectedProposal.tender.title}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Proposal Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{formatDate(selectedProposal.submittedAt)}</span>
                  </div>
                  {selectedProposal.notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Notes</span>
                      <p className="text-sm mt-1">{selectedProposal.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Submitted Materials</h4>
                {selectedProposal.quotePrice && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg mb-2">
                    <span className="text-sm text-muted-foreground">Price Quote</span>
                    <span className="text-lg font-bold text-green-700">SAR {selectedProposal.quotePrice.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {selectedProposal.technicalFileUrl && (
                    <Button variant="outline" size="sm" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" /> Technical Proposal
                    </Button>
                  )}
                  {selectedProposal.financialFileUrl && (
                    <Button variant="outline" size="sm" className="flex-1">
                      <DollarSign className="h-4 w-4 mr-2" /> Financial Proposal
                    </Button>
                  )}
                </div>
              </div>

              {(selectedProposal.status === "pending" || selectedProposal.status === "shortlisted") && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" size="sm"
                    onClick={() => setSelectedProposal(null)}>
                    <Check className="h-4 w-4 mr-2" /> Accept
                  </Button>
                  {selectedProposal.status === "pending" && (
                    <Button variant="outline" className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50" size="sm"
                      onClick={() => setSelectedProposal(null)}>
                      <BookmarkPlus className="h-4 w-4 mr-2" /> Shortlist
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" size="sm"
                    onClick={() => setSelectedProposal(null)}>
                    <X className="h-4 w-4 mr-2" /> Ignore
                  </Button>
                </div>
              )}

              {selectedProposal.status === "accepted" && (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg border-t mt-4 pt-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Accepted</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
