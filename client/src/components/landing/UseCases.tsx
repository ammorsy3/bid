import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, HardHat, Server } from "lucide-react";

const useCases = [
  {
    icon: <Factory className="h-8 w-8 text-blue-600" />,
    title: "Manufacturing",
    description: "Streamline supplier sourcing for materials and equipment.",
  },
  {
    icon: <HardHat className="h-8 w-8 text-blue-600" />,
    title: "Construction",
    description: "Manage complex multi-vendor projects with clear scoping.",
  },
  {
    icon: <Server className="h-8 w-8 text-blue-600" />,
    title: "IT Services",
    description: "Source software, consulting, and technical services faster.",
  },
];

export const UseCases = () => {
  return (
    <section id="use-cases" className="py-20 lg:py-28 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Built for Procurement Teams Across Industries
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
              <CardHeader>
                <div className="mx-auto bg-blue-100 rounded-full p-4 w-fit">
                  {useCase.icon}
                </div>
                <CardTitle className="pt-4">{useCase.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{useCase.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
