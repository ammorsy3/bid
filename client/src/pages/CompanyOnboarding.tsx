import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function CompanyOnboarding() {
  const [, setLocation] = useLocation();
  const { user, token, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    legalName: "",
    crNumber: "",
    vatNumber: "",
    city: "",
    category: ""
  });

  // If user has active company but it's in draft state, we're completing profile
  const isCompletingProfile = activeCompany && activeCompany.onboardingState === 'draft';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isCompletingProfile) {
        // Update company profile
        const response = await apiRequest('PUT', `/api/companies/${activeCompany.id}/profile`, {
          displayName: formData.name,
          bio: `${formData.category} company based in ${formData.city || 'Saudi Arabia'}`
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update company profile");
        }

        toast({
          title: "Profile completed!",
          description: "Your company profile has been updated successfully."
        });

        // Refresh auth to get updated company
        await useAuthStore.getState().checkAuth();
        setLocation("/dashboard");
      } else {
        // Create new company
        const response = await apiRequest('POST', '/api/companies', formData);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create company");
        }

        const data = await response.json();

        // Update auth store with new token and company
        localStorage.setItem('token', data.token);
        await useAuthStore.getState().checkAuth();

        toast({
          title: "Company created!",
          description: "Your company has been created and is pending verification."
        });

        setLocation("/dashboard");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>
            {isCompletingProfile ? "Complete Your Company Profile" : "Create Your Company"}
          </CardTitle>
          <CardDescription>
            {isCompletingProfile 
              ? "Add details to your company profile to get started"
              : "Set up your company to start using the platform"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" data-testid="label-company-name">Company Name</Label>
              <Input
                id="name"
                data-testid="input-company-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
                required
                disabled={isCompletingProfile}
              />
            </div>

            {!isCompletingProfile && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="legalName" data-testid="label-legal-name">Legal Name</Label>
                  <Input
                    id="legalName"
                    data-testid="input-legal-name"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    placeholder="Enter legal company name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crNumber" data-testid="label-cr-number">CR Number</Label>
                  <Input
                    id="crNumber"
                    data-testid="input-cr-number"
                    value={formData.crNumber}
                    onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                    placeholder="Commercial Registration Number"
                    required
                    pattern="[0-9]+"
                    title="CR number must contain only numbers"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatNumber" data-testid="label-vat-number">VAT Number (Optional)</Label>
                  <Input
                    id="vatNumber"
                    data-testid="input-vat-number"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                    placeholder="VAT Number"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="city" data-testid="label-city">City</Label>
              <Input
                id="city"
                data-testid="input-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" data-testid="label-category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category} data-testid={`option-${category}`}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? "Processing..." : (isCompletingProfile ? "Complete Profile" : "Create Company")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
