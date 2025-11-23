import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    quote: "Bid reduced our RFP cycle time from 6 weeks to 2 weeks. The AI requirement tool is a game-changer.",
    name: "Sarah Johnson",
    title: "VP of Procurement",
    company: "TechManufacturing Inc.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop",
  },
  {
    quote: "The centralized supplier database saved us hundreds of hours. Onboarding new vendors is now a breeze.",
    name: "Michael Chen",
    title: "Sourcing Manager",
    company: "ConstructWell",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1887&auto=format&fit=crop",
  },
];

export const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Trusted by Procurement Leaders
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-white shadow-lg">
              <CardContent className="p-8">
                <p className="text-gray-700 italic">"{testimonial.quote}"</p>
                <div className="mt-6 flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.title}, {testimonial.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
