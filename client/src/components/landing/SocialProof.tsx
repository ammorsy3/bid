const logos = [
  "Manufacturing",
  "Construction",
  "Tech",
  "Services",
  "Healthcare",
  "Logistics",
  "Finance",
  "Retail",
];

export const SocialProof = () => {
  const duplicatedLogos = [...logos, ...logos];

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Trusted by 500+ procurement teams
        </h3>
        <div className="mt-8 relative w-full overflow-hidden">
          <div className="flex animate-ticker-scroll">
            {duplicatedLogos.map((logo, index) => (
              <div key={index} className="flex-shrink-0 mx-6 flex items-center justify-center h-12 w-40 bg-white border border-gray-200 rounded-md shadow-sm">
                <span className="text-gray-700 font-medium">{logo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
