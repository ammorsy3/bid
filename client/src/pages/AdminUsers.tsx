import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, UserPlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsers() {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");

  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/promote`);
    },
    onSuccess: () => {
      toast({
        title: "User Promoted",
        description: "The user has been successfully promoted to admin.",
      });
      setUserId("");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to promote user. Please check the user ID and try again.";
      toast({
        title: "Error",
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
            User Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage user roles and permissions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Promote User to Admin
            </CardTitle>
            <CardDescription>
              Grant admin privileges to an existing user. This will allow them to access the admin panel
              and perform administrative operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePromote} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="Enter user ID (UUID)"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  data-testid="input-user-id"
                />
                <p className="text-sm text-gray-500">
                  You can find the user ID in the database or from user profile endpoints.
                </p>
              </div>
              <Button
                type="submit"
                disabled={!userId.trim() || promoteMutation.isPending}
                data-testid="button-promote"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {promoteMutation.isPending ? "Promoting..." : "Promote to Admin"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• Admin users have full access to all platform operations</p>
            <p>• Admins can verify vendors, manage join requests, and unblock awards</p>
            <p>• All admin actions are logged in the audit trail</p>
            <p>• Admin privileges cannot be revoked through this interface (requires database access)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
