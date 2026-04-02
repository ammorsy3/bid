import { useState, useEffect } from "react";
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
import { useI18n } from "@/lib/i18n";

const getPostOnboardingRedirect = () => {
  const redirect = localStorage.getItem('postOnboardingRedirect');
  if (redirect) {
    localStorage.removeItem('postOnboardingRedirect');
    return redirect;
  }
  return '/dashboard';
};

export default function CompanyOnboarding() {
  const [, setLocation] = useLocation();
  const { user, token, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    legalName: "",
    crNumber: "",
    vatNumber: "",
    city: "",
    category: ""
  });

  const userRole = activeCompany?.role || 'viewer';
  const canEditCompany = ['owner', 'admin'].includes(userRole);

  const isCreating = !activeCompany;
  const isCompletingDraft = activeCompany && activeCompany.onboardingState === 'draft' && canEditCompany;
  const isEditingCompleted = activeCompany && activeCompany.onboardingState === 'completed' && canEditCompany;

  useEffect(() => {
    if (activeCompany && !canEditCompany) {
      setLocation('/dashboard');
    }
  }, [activeCompany, canEditCompany, setLocation]);

  // Pre-populate form when completing draft or editing completed profile
  useEffect(() => {
    if (activeCompany) {
      if (isCompletingDraft) {
        setFormData({
          name: activeCompany.profile?.displayName || activeCompany.name || "",
          legalName: "",
          crNumber: "",
          vatNumber: "",
          city: "",
          category: ""
        });
      } else if (isEditingCompleted) {
        // Pre-populate with existing company data
        setFormData({
          name: activeCompany.profile?.displayName || activeCompany.name || "",
          legalName: activeCompany.legalName || "",
          crNumber: activeCompany.crNumber || "",
          vatNumber: activeCompany.vatNumber || "",
          city: activeCompany.city || "",
          category: activeCompany.category || ""
        });
      }
    }
  }, [activeCompany, isCompletingDraft, isEditingCompleted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isCompletingDraft) {
        // Update company profile (draft completion)
        const response = await apiRequest('PUT', `/api/companies/${activeCompany.id}/profile`, {
          displayName: formData.name,
          bio: `${formData.category} company based in ${formData.city || 'Saudi Arabia'}`
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update company profile");
        }

        toast({
          title: t('onboarding.profileCompleted'),
          description: t('onboarding.companyProfileUpdated'),
        });

        // Refresh auth to get updated company
        await useAuthStore.getState().checkAuth();
        setLocation(getPostOnboardingRedirect());
      } else if (isEditingCompleted) {
        // Update company profile and company details (editing completed profile)
        const response = await apiRequest('PUT', `/api/companies/${activeCompany.id}/profile`, {
          displayName: formData.name,
          bio: `${formData.category} company based in ${formData.city || 'Saudi Arabia'}`,
          legalName: formData.legalName,
          crNumber: formData.crNumber,
          vatNumber: formData.vatNumber,
          city: formData.city,
          category: formData.category
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update company profile");
        }

        toast({
          title: t('onboarding.profileUpdated'),
          description: t('onboarding.companyProfileUpdated'),
        });

        // Refresh auth to get updated company
        await useAuthStore.getState().checkAuth();
        setLocation(getPostOnboardingRedirect());
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
          title: t('onboarding.companyCreated'),
          description: t('onboarding.companyCreatedDesc'),
        });

        setLocation(getPostOnboardingRedirect());
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('onboarding.error'),
        description: error.message || t('onboarding.somethingWentWrong'),
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
            {isEditingCompleted ? t('onboarding.editCompanyProfile') : isCompletingDraft ? t('onboarding.completeCompanyProfile') : t('onboarding.createYourCompany')}
          </CardTitle>
          <CardDescription>
            {isEditingCompleted
              ? t('onboarding.editDesc')
              : isCompletingDraft
              ? t('onboarding.completeDesc')
              : t('onboarding.createDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" data-testid="label-company-name">{t('onboarding.companyDisplayName')}</Label>
              <Input
                id="name"
                data-testid="input-company-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('onboarding.companyDisplayNamePlaceholder')}
                required
              />
            </div>

            {(isCreating || isEditingCompleted) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="legalName" data-testid="label-legal-name">{t('onboarding.legalName')}</Label>
                  <Input
                    id="legalName"
                    data-testid="input-legal-name"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    placeholder={t('onboarding.legalNamePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crNumber" data-testid="label-cr-number">{t('onboarding.crNumber')}</Label>
                  <Input
                    id="crNumber"
                    data-testid="input-cr-number"
                    value={formData.crNumber}
                    onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                    placeholder={t('onboarding.crNumberPlaceholder')}
                    required
                    pattern="[0-9]+"
                    title={t('onboarding.numericOnly')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatNumber" data-testid="label-vat-number">{t('onboarding.vatNumber')}</Label>
                  <Input
                    id="vatNumber"
                    data-testid="input-vat-number"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                    placeholder={t('onboarding.vatNumberPlaceholder')}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="city" data-testid="label-city">{t('onboarding.city')}</Label>
              <Input
                id="city"
                data-testid="input-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder={t('onboarding.cityPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" data-testid="label-category">{t('onboarding.category')}</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder={t('onboarding.categoryPlaceholder')} />
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
              {loading ? t('onboarding.processing') : (isEditingCompleted ? t('onboarding.updateProfile') : isCompletingDraft ? t('onboarding.completeProfile') : t('onboarding.createCompany'))}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
