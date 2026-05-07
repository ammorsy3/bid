import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, UserPlus, Search, Crown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { format } from "date-fns";
import AdminLayout from "@/components/AdminLayout";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/promote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t('admin.userPromoted'),
        description: t('admin.userPromotedDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.failedPromoteUser'),
        variant: "destructive",
      });
    },
  });

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-black text-3xl text-gray-900 dark:text-foreground tracking-[-0.04em]" data-testid="text-page-title">
            {t('admin.userManagement')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.userManagementDesc')}
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('admin.searchUsersPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* User list */}
        <Card className="border-border dark:border-border bg-white dark:bg-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              {t('admin.platformUsers')}
            </CardTitle>
            <CardDescription className="text-xs">
              {users ? (searchQuery ? t('admin.usersCountMatching', { count: users.length, query: searchQuery }) : t('admin.usersCountRecent', { count: users.length })) : t('admin.loadingEllipsis')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-14 bg-gray-100 dark:bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !users || users.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery ? t('admin.noUsersMatching', { query: searchQuery }) : t('admin.noUsersFound')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-card flex items-center justify-center text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex-shrink-0">
                        {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate">{user.name || user.username}</p>
                          {user.isAdmin && (
                            <Badge className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] px-1.5 py-0">
                              <Crown className="h-2.5 w-2.5 mr-0.5" />
                              {t('admin.adminBadge')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email} &middot; {t('admin.joinedOn', { date: format(new Date(user.createdAt), 'PP') })}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {user.isAdmin ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{t('admin.platformAdmin')}</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => promoteMutation.mutate(user.id)}
                          disabled={promoteMutation.isPending}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          {t('admin.promoteBtn')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
