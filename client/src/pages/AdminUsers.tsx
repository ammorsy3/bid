import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, UserPlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

export default function AdminUsers() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [userId, setUserId] = useState("");

  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/promote`);
    },
    onSuccess: () => {
      toast({
        title: t('admin.userPromoted'),
        description: t('admin.userPromotedDesc'),
      });
      setUserId("");
    },
    onError: (error: any) => {
      const errorMessage = error.message || t('admin.failedPromoteUser');
      toast({
        title: t('admin.error'),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handlePromote = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim()) {
      promoteMutation.mutate(userId.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
            {t('admin.userManagement')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('admin.userManagementDesc')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('admin.promoteUserToAdmin')}
            </CardTitle>
            <CardDescription>
              {t('admin.promoteUserDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePromote} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">{t('admin.userId')}</Label>
                <Input
                  id="userId"
                  placeholder={t('admin.userIdPlaceholder')}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  data-testid="input-user-id"
                />
                <p className="text-sm text-gray-500">
                  {t('admin.userIdHelper')}
                </p>
              </div>
              <Button
                type="submit"
                disabled={!userId.trim() || promoteMutation.isPending}
                data-testid="button-promote"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {promoteMutation.isPending ? t('admin.promoting') : t('admin.promoteToAdmin')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('admin.importantNotes')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>{t('admin.adminNote1')}</p>
            <p>{t('admin.adminNote2')}</p>
            <p>{t('admin.adminNote3')}</p>
            <p>{t('admin.adminNote4')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
