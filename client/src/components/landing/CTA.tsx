import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export const CTA = () => {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Ready to Modernize Your Sourcing Process?
        </h2>
        <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
          Join 500+ procurement teams transforming their sourcing process with Bid.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" variant="secondary" className="bg-white text-purple-600 hover:bg-gray-100 shadow-lg transform hover:scale-105" data-testid="button-cta-signup">
              Try Bid Now
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 shadow-lg transform hover:scale-105" data-testid="button-schedule-demo">
              Learn More
            </Button>
          </a>
        </div>
        <div className="mt-8 text-sm text-blue-200">
          No credit card required | 14-day free trial | Setup in 5 minutes
        </div>
      </div>
    </section>
  );
};
