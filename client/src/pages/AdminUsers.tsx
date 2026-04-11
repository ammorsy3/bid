import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, UserPlus, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";

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
    <AdminLayout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-page-title">
            {t('admin.userManagement')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.userManagementDesc')}
          </p>
        </div>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              {t('admin.promoteUserToAdmin')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('admin.promoteUserDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePromote} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-sm">{t('admin.userId')}</Label>
                <Input
                  id="userId"
                  placeholder={t('admin.userIdPlaceholder')}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  data-testid="input-user-id"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('admin.userIdHelper')}
                </p>
              </div>
              <Button
                type="submit"
                disabled={!userId.trim() || promoteMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-promote"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {promoteMutation.isPending ? t('admin.promoting') : t('admin.promoteToAdmin')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6 border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              {t('admin.importantNotes')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-amber-700 dark:text-amber-400">
            <p>{t('admin.adminNote1')}</p>
            <p>{t('admin.adminNote2')}</p>
            <p>{t('admin.adminNote3')}</p>
            <p>{t('admin.adminNote4')}</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
