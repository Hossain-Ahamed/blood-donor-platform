"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { User, UserRole } from "@repo/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreHorizontal,
  Shield,
  UserX,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isActive, setIsActive] = useState<string>("all");
  const [role, setRole] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogAction, setDialogAction] = useState<
    "block" | "unblock" | "role" | null
  >(null);
  const [newRole, setNewRole] = useState<UserRole | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (isActive !== "all") params.append("is_active", isActive);
      if (role !== "all") params.append("role", role);

      const response = await apiClient.request<PaginatedResponse<User>>(
        `/admin/users?${params.toString()}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (response as any).data?.data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (response as any).data
        : response;
      setUsers(data.data as User[]);
      setTotalPages(data.meta.totalPages as number);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, isActive, role, page]);

  useEffect(() => {
    const loadData = async () => {
      await fetchUsers();
    };
    loadData();
  }, [fetchUsers]);

  const handleAction = async () => {
    if (!selectedUser || !dialogAction) return;

    setActionLoading(true);
    try {
      let updateData = {};
      if (dialogAction === "block") updateData = { is_active: false };
      if (dialogAction === "unblock") updateData = { is_active: true };
      if (dialogAction === "role" && newRole) updateData = { role: newRole };

      await apiClient.request(`/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });

      toast.success("User updated successfully");
      fetchUsers();
      closeDialog();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  const closeDialog = () => {
    setSelectedUser(null);
    setDialogAction(null);
    setNewRole(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            className="pl-8"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Select
            value={isActive}
            onValueChange={(val: string | null) => {
              setIsActive(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={role}
            onValueChange={(val: string | null) => {
              setRole(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-25">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "secondary"}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "outline" : "destructive"}>
                      {user.is_active ? "Active" : "Blocked"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.is_active ? (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setDialogAction("block");
                            }}
                          >
                            <UserX className="mr-2 h-4 w-4 text-destructive" />
                            <span className="text-destructive">Block User</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setDialogAction("unblock");
                            }}
                          >
                            <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                            <span className="text-green-600">Unblock User</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setDialogAction("role");
                            setNewRole(
                              user.role === "ADMIN"
                                ? UserRole.USER
                                : UserRole.ADMIN,
                            );
                          }}
                        >
                          {user.role === "ADMIN" ? (
                            <ShieldAlert className="mr-2 h-4 w-4" />
                          ) : (
                            <Shield className="mr-2 h-4 w-4" />
                          )}
                          <span>
                            Make {user.role === "ADMIN" ? "User" : "Admin"}
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog
        open={!!dialogAction}
        onOpenChange={(open: boolean) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "block" && "Block User"}
              {dialogAction === "unblock" && "Unblock User"}
              {dialogAction === "role" && "Change User Role"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "block" &&
                `Are you sure you want to block ${selectedUser?.name}? They will not be able to log in.`}
              {dialogAction === "unblock" &&
                `Are you sure you want to unblock ${selectedUser?.name}? They will regain access to the platform.`}
              {dialogAction === "role" &&
                `Are you sure you want to change ${selectedUser?.name}'s role to ${newRole}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={dialogAction === "block" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
