import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Database, GitCompareArrows } from "lucide-react";

const features = [
  {
    icon: <Database className="h-8 w-8 text-white" />,
    title: "Centralized Supplier Matching",
    description: "Vendors submit profiles once. Companies search, filter, and invite relevant suppliers instantly. No more repetitive data entry.",
    visual: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
  },
  {
    icon: <GitCompareArrows className="h-8 w-8 text-white" />,
    title: "Side-by-Side Proposal Comparison",
    description: "Easily compare vendor proposals in a standardized format. Analyze pricing, timelines, and qualifications to make data-driven decisions.",
    visual: "https://images.unsplash.com/photo-1630514926196-509348585950?q=80&w=800&auto=format&fit=crop",
  },
  {
    icon: <Sparkles className="h-8 w-8 text-white" />,
    title: "AI-Powered RFX Creation",
    description: "Conversational AI interviews stakeholders, extracts requirements, and generates crystal-clear RFPs and RFQs in 30 minutes—not weeks.",
    visual: "https://images.unsplash.com/photo-1587440871875-191322ee64b0?q=80&w=800&auto=format&fit=crop",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-20 lg:py-28 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Three Core Features. One Seamless Platform.
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-1 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-bold text-white">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600">{feature.description}</p>
                <div className="mt-6">
                  <img src={feature.visual} alt={`${feature.title} mockup`} className="rounded-md border border-gray-200 shadow-sm aspect-[3/2] object-cover" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
