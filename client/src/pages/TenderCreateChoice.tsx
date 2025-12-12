import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, PenLine, ArrowLeft } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";

export default function TenderCreateChoice() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="flex items-center justify-between px-8 py-6">
        <img
          src={logoPath}
          alt="Bid"
          className="h-10 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setLocation("/dashboard")}
          data-testid="logo-home"
        />
        <Button 
          variant="outline" 
          onClick={() => setLocation("/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How would you like to create your tender?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Choose the method that works best for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg hover:border-[#E25E45] transition-all duration-200 group"
            onClick={() => setLocation("/tenders/new/ai")}
            data-testid="card-create-with-ai"
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Create with AI
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Let AI help you craft the perfect tender. Just describe your project and we'll generate a professional tender for you.
              </p>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Sparkles className="h-4 w-4 mr-2" />
                Start with AI
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg hover:border-[#E25E45] transition-all duration-200 group"
            onClick={() => setLocation("/tenders/new/manual")}
            data-testid="card-create-manually"
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#E25E45] to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <PenLine className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Create Manually
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Build your tender step by step with our guided wizard. Perfect for when you know exactly what you need.
              </p>
              <Button className="w-full bg-[#E25E45] hover:bg-[#d54d35]">
                <PenLine className="h-4 w-4 mr-2" />
                Start Manually
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
