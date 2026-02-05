"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateUserInitialBalance } from "@/lib/admin-user-actions";

type User = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean | null;
  initialLieuBalance: number | null;
};

export function UsersManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<{ id: string; success: boolean } | null>(null);

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditValue(String(user.initialLieuBalance ?? 0));
    setSaveStatus(null);
  };

  const handleSave = (userId: string) => {
    const newBalance = parseFloat(editValue);
    if (isNaN(newBalance) || newBalance < 0) {
      return;
    }

    startTransition(async () => {
      const result = await updateUserInitialBalance(userId, newBalance);
      if (result.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, initialLieuBalance: newBalance } : u
          )
        );
        setSaveStatus({ id: userId, success: true });
      } else {
        setSaveStatus({ id: userId, success: false });
      }
      setEditingId(null);
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Set initial lieu balance for users migrating from other systems.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Admin</th>
                <th className="px-3 py-2 text-left">Initial Lieu Balance (hrs)</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-3 py-2">{user.name ?? "—"}</td>
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2">{user.isAdmin ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">
                    {editingId === user.id ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      <span className="font-medium">
                        {(user.initialLieuBalance ?? 0).toFixed(2)}
                        {saveStatus?.id === user.id && (
                          <span
                            className={`ml-2 text-xs ${
                              saveStatus.success ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {saveStatus.success ? "✓ Saved" : "✗ Failed"}
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === user.id ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(user.id)}
                          disabled={isPending}
                        >
                          {isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancel}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                      >
                        Edit Balance
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Setting an initial balance will recalculate the user&apos;s lieu ledger, adding this
          starting amount before any earned overtime.
        </p>
      </CardContent>
    </Card>
  );
}
