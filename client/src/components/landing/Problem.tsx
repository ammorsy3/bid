import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MessagesSquare, FileQuestion } from "lucide-react";

const painPoints = [
  {
    icon: <Clock className="h-8 w-8 text-purple-600" />,
    title: "RFPs take 2-4 weeks to draft",
  },
  {
    icon: <MessagesSquare className="h-8 w-8 text-purple-600" />,
    title: "Endless back-and-forth with vendors",
  },
  {
    icon: <FileQuestion className="h-8 w-8 text-purple-600" />,
    title: "Suppliers submit the same information repeatedly",
  },
];

export const Problem = () => {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Stop Wasting Weeks on Unclear Requirements
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {painPoints.map((point, index) => (
            <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
              <CardHeader>
                <div className="mx-auto bg-purple-100 rounded-full p-4 w-fit">
                  {point.icon}
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg font-semibold text-gray-800">{point.title}</CardTitle>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-16 grid lg:grid-cols-2 gap-8 items-center">
          <div className="p-8 bg-red-50 border-2 border-dashed border-red-200 rounded-lg">
            <h3 className="text-xl font-bold text-red-800 text-center">Before Bid</h3>
            <img src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=1470&auto=format&fit=crop" alt="A person overwhelmed with sticky notes representing a chaotic process" className="mt-4 mx-auto rounded-md aspect-video object-cover" />
          </div>
          <div className="p-8 bg-green-50 border-2 border-dashed border-green-200 rounded-lg">
            <h3 className="text-xl font-bold text-green-800 text-center">After Bid</h3>
            <img src="https://images.unsplash.com/photo-1586953208448-b95a79798f07?q=80&w=1470&auto=format&fit=crop" alt="A clean, modern dashboard on a screen representing a streamlined process" className="mt-4 mx-auto rounded-md aspect-video object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};
