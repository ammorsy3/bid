import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Zap, Target, Users, TrendingUp } from "lucide-react";

const stats = [
  {
    icon: <Zap className="h-8 w-8 text-purple-600" />,
    value: "60% Faster",
    label: "RFP cycle time reduction",
  },
  {
    icon: <Target className="h-8 w-8 text-purple-600" />,
    value: "90% Accuracy",
    label: "AI requirement extraction rate",
  },
  {
    icon: <Users className="h-8 w-8 text-purple-600" />,
    value: "500+ Suppliers",
    label: "In our verified database",
  },
  {
    icon: <TrendingUp className="h-8 w-8 text-purple-600" />,
    value: "30% Savings",
    label: "Average cost savings identified",
  },
];

export const Results = () => {
  return (
    <section className="py-20 lg:py-28 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Measurable Impact from Day One
          </h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
              <CardHeader>
                <div className="mx-auto bg-purple-100 rounded-full p-4 w-fit">
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-purple-600">{stat.value}</p>
                <p className="mt-2 text-gray-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
