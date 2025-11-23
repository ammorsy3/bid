import { Info } from "lucide-react";

export const UniqueSellingPoint = () => {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-lg shadow-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-gray-900">What Makes Bid Unique</h3>
                <div className="mt-2 text-base text-gray-700">
                  <p>
                    Bid is the new industry standard for managing sourcing requests and supplier proposals. It is not a signature or contract platform. We are a new concept: a streamlined, AI-powered sourcing and matching tool for modern teams.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
