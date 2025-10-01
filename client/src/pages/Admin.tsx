import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Shield, ShieldOff, Users } from "lucide-react";
import type { User } from "@shared/schema";

interface UserStats {
  totalEntries: number;
  totalHours: number;
  lieuBalance: number;
  lastEntryDate: string | null;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: users = [], isLoading: usersLoading, error } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const { data: userStatsMap = {} } = useQuery<Record<string, UserStats>>({
    queryKey: ["/api/admin/user-stats", users],
    queryFn: async () => {
      const statsMap: Record<string, UserStats> = {};
      for (const user of users) {
        try {
          const stats = await fetch(`/api/admin/users/${user.id}/stats`, {
            credentials: "include",
          }).then((res) => res.json());
          statsMap[user.id] = stats;
        } catch (err) {
          console.error(`Failed to fetch stats for user ${user.id}`, err);
        }
      }
      return statsMap;
    },
    enabled: users.length > 0,
  });

  const updateAdminStatusMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/admin-status`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Admin status updated successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
  });

  if (error) {
    const errorMessage = (error as any)?.message || "Unknown error";
    if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      return (
        <div className="flex items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You do not have admin permissions to view this page.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6" data-testid="page-admin">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Panel</h2>
          <p className="text-muted-foreground mt-1">
            Manage users and view system statistics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold" data-testid="stat-total-users">
                  {users.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Admin Users</p>
                <p className="text-2xl font-bold" data-testid="stat-admin-users">
                  {users.filter((u) => u.isAdmin).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ShieldOff className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Regular Users</p>
                <p className="text-2xl font-bold" data-testid="stat-regular-users">
                  {users.filter((u) => !u.isAdmin).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Entries</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
                <TableHead className="text-right">Lieu Balance</TableHead>
                <TableHead className="text-right">Last Entry</TableHead>
                <TableHead className="text-center">Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const stats = userStatsMap[user.id];
                return (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-right">
                      {stats?.totalEntries || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats?.totalHours?.toFixed(1) || "0.0"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={stats?.lieuBalance && stats.lieuBalance < 0 ? "text-destructive" : ""}>
                        {stats?.lieuBalance?.toFixed(1) || "0.0"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {stats?.lastEntryDate || "Never"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={user.isAdmin}
                          onCheckedChange={(checked) =>
                            updateAdminStatusMutation.mutate({
                              userId: user.id,
                              isAdmin: checked,
                            })
                          }
                          disabled={updateAdminStatusMutation.isPending}
                          data-testid={`switch-admin-${user.id}`}
                        />
                        {user.isAdmin && (
                          <Badge variant="default" data-testid={`badge-admin-${user.id}`}>
                            Admin
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
