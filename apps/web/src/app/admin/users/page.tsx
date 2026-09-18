"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isActive, setIsActive] = useState<string>("all");
  const [role, setRole] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Dialog state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogAction, setDialogAction] = useState<
    "block" | "unblock" | "role" | null
  >(null);
  const [newRole, setNewRole] = useState<UserRole | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // TanStack Query for users list
  const { data: usersData, isLoading: loading } = useQuery({
    queryKey: ["admin-users", { page, debouncedSearch, isActive, role }],
    queryFn: async () => {
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

      return {
        users: (data.data || []) as User[],
        totalPages: (data.meta?.totalPages ?? 1) as number,
      };
    },
  });

  const users = usersData?.users ?? [];
  const totalPages = usersData?.totalPages ?? 1;

  // Mutation for user actions (block / unblock / role change)
  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !dialogAction) return;
      let updateData = {};
      if (dialogAction === "block") updateData = { is_active: false };
      if (dialogAction === "unblock") updateData = { is_active: true };
      if (dialogAction === "role" && newRole) updateData = { role: newRole };

      return apiClient.request(`/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      closeDialog();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user",
      );
    },
  });

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
        actionLoading={actionMutation.isPending}
        onClose={closeDialog}
        onConfirm={() => actionMutation.mutate()}
      />
    </div>
  );
}
