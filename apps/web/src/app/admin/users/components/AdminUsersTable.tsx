"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Shield, UserX, UserCheck } from "lucide-react";
import { User, UserRole } from "@repo/shared";
import { useAuth } from "@/hooks/useAuth";

interface AdminUsersTableProps {
  users: User[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onOpenDialog: (user: User, action: "block" | "unblock" | "role") => void;
}

export function AdminUsersTable({
  users,
  loading,
  page,
  totalPages,
  onPageChange,
  onOpenDialog,
}: AdminUsersTableProps) {
  const { user: currentUser } = useAuth();
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                Loading users...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{u.name}</span>
                    {currentUser?.id === u.id && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 bg-red-50 dark:bg-red-950 font-bold"
                      >
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>{u.phone || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={u.role === UserRole.ADMIN ? "default" : "secondary"}
                  >
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.is_active ? "outline" : "destructive"}>
                    {u.is_active ? "Active" : "Blocked"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(u.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {currentUser?.id === u.id ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                          Self-account protected
                        </div>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => onOpenDialog(u, "role")}>
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          {u.is_active ? (
                            <DropdownMenuItem
                              onClick={() => onOpenDialog(u, "block")}
                              className="text-destructive focus:text-destructive"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Block User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onOpenDialog(u, "unblock")}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Unblock User
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
