"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { UserRole } from "@repo/shared";

interface AdminUsersFiltersProps {
  search: string;
  isActive: string;
  role: string;
  onSearchChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onRoleChange: (val: string) => void;
}

export function AdminUsersFilters({
  search,
  isActive,
  role,
  onSearchChange,
  onStatusChange,
  onRoleChange,
}: AdminUsersFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          className="pl-8"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex gap-4">
        <Select
          value={isActive}
          onValueChange={(val: string | null) => onStatusChange(val || "all")}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" label="All Status">All Status</SelectItem>
            <SelectItem value="true" label="Active">Active</SelectItem>
            <SelectItem value="false" label="Blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={role}
          onValueChange={(val: string | null) => onRoleChange(val || "all")}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" label="All Roles">All Roles</SelectItem>
            {Object.values(UserRole).map((r) => (
              <SelectItem key={r} value={r} label={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
