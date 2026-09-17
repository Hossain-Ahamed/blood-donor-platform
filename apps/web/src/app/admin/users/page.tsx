"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { User, UserRole } from "@repo/shared";
import { toast } from "sonner";
import { AdminUsersFilters } from "./components/AdminUsersFilters";
import { AdminUsersTable } from "./components/AdminUsersTable";
import { AdminUserActionDialog } from "./components/AdminUserActionDialog";

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
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch users",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, isActive, role, page]);

  useEffect(() => {
    fetchUsers();
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
      toast.error(
        error instanceof Error ? error.message : "Failed to update user",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const closeDialog = () => {
    setSelectedUser(null);
    setDialogAction(null);
    setNewRole(null);
  };

  const handleOpenDialog = (
    user: User,
    action: "block" | "unblock" | "role",
  ) => {
    setSelectedUser(user);
    setDialogAction(action);
    if (action === "role") {
      setNewRole(user.role === "ADMIN" ? UserRole.USER : UserRole.ADMIN);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
      </div>

      <AdminUsersFilters
        search={search}
        isActive={isActive}
        role={role}
        onSearchChange={setSearch}
        onStatusChange={(val) => {
          setIsActive(val);
          setPage(1);
        }}
        onRoleChange={(val) => {
          setRole(val);
          setPage(1);
        }}
      />

      <AdminUsersTable
        users={users}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onOpenDialog={handleOpenDialog}
      />

      <AdminUserActionDialog
        dialogAction={dialogAction}
        selectedUser={selectedUser}
        newRole={newRole}
        actionLoading={actionLoading}
        onClose={closeDialog}
        onConfirm={handleAction}
      />
    </div>
  );
}
