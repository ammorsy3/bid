import { Zap, Linkedin, Twitter, Youtube } from "lucide-react";

const footerLinks = {
  "Product": ["Features", "Pricing", "About", "Contact"],
  "Resources": ["Blog", "Help Center", "Security"],
  "Legal": ["Privacy Policy", "Terms of Service"],
};

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-1">
            <a href="#" className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-purple-400" />
              <span className="text-2xl font-bold">Bid</span>
            </a>
            <p className="mt-4 text-gray-400 text-sm">Modern Sourcing & RFX Management.</p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-gray-200">{title}</h4>
              <ul className="mt-4 space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Bid. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <a href="#" className="text-gray-500 hover:text-white"><Linkedin className="h-5 w-5" /></a>
            <a href="#" className="text-gray-500 hover:text-white"><Twitter className="h-5 w-5" /></a>
            <a href="#" className="text-gray-500 hover:text-white"><Youtube className="h-5 w-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};
