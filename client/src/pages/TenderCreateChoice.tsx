import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AILoader } from "@/components/ui/ai-loader";
import { useAuthStore } from "@/lib/auth";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

export default function TenderCreateChoice() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';

  return (
    <div className="relative min-h-screen bg-white flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <FlickeringGrid
          className="size-full"
          squareSize={4}
          gridGap={6}
          color="rgb(226, 94, 69)"
          maxOpacity={0.3}
          flickerChance={0.1}
        />
      </div>

      <div className="relative z-10">
        <header className="pt-12 pb-8">
          <h1 className="text-center text-4xl font-bold text-[#E25E45] tracking-tight">
            Bid
          </h1>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="mb-8">
            <AILoader size={100} />
          </div>

          <div className="text-center max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome, {firstName}!
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              Let's create your tender
            </p>
            <p className="text-sm text-gray-500 mb-10">
              Post a tender in just a few clicks and start receiving bids from qualified vendors.
            </p>

            <div className="space-y-3 max-w-sm mx-auto">
              <Button
                onClick={() => setLocation("/tenders/new/ai")}
                className="w-full h-12 bg-[#E25E45] hover:bg-[#d54d35] text-white text-base font-medium rounded-lg"
                data-testid="button-create-with-ai"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Get Started using AI
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/tenders/new/manual")}
                className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium rounded-lg"
                data-testid="button-create-manually"
              >
                I'll do it without AI
              </Button>
            </div>

            <p className="text-xs text-gray-400 mt-8">
              Takes about 2 minutes to complete
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
