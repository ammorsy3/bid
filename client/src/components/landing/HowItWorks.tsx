import { PenTool, Users, GitCompareArrows, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: <PenTool className="h-8 w-8 text-purple-600" />,
    title: "Create Sourcing Request",
    description: "AI guides you to build clear RFPs & RFQs.",
  },
  {
    icon: <Users className="h-8 w-8 text-purple-600" />,
    title: "Match with Suppliers",
    description: "Instantly find and invite vendors from our database.",
  },
  {
    icon: <GitCompareArrows className="h-8 w-8 text-purple-600" />,
    title: "Compare Proposals",
    description: "Analyze proposals side-by-side in a standardized view.",
  },
  {
    icon: <CheckCircle2 className="h-8 w-8 text-purple-600" />,
    title: "Select the Best Supplier",
    description: "Make data-driven decisions and award the project.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            From Need to Award in 4 Simple Steps
          </h2>
        </div>
        <div className="mt-16 relative">
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => (
              <div key={index} className="text-center flex flex-col items-center">
                <div className="relative z-10 flex items-center justify-center h-20 w-20 bg-white border-2 border-gray-200 rounded-full shadow-md">
                  <div className="flex items-center justify-center h-16 w-16 bg-purple-100 rounded-full">
                    {step.icon}
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-800">{step.title}</h3>
                <p className="mt-1 text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
