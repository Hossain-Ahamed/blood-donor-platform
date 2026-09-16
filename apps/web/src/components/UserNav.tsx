"use client";

import Link from "next/link";
import { User, LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/actions/auth";

type UserNavProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar_url?: string;
  };
  isAdminLayout?: boolean;
};

export function UserNav({ user, isAdminLayout = false }: UserNavProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center outline-none hover:bg-accent hover:text-accent-foreground relative h-10 w-10 rounded-full border">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {user.role === "ADMIN" && (
            <>
              {isAdminLayout ? (
                <Link
                  href="/browse"
                  className="cursor-pointer flex items-center relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Public Site</span>
                </Link>
              ) : (
                <Link
                  href="/admin"
                  className="cursor-pointer flex items-center text-primary font-medium relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          {!isAdminLayout && (
            <>
              <Link
                href="/profile"
                className="cursor-pointer relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                Profile
              </Link>
              <Link
                href="/history"
                className="cursor-pointer relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                History
              </Link>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 cursor-pointer focus:text-red-600"
          onClick={() => logoutAction()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
