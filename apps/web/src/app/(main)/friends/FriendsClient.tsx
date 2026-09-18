"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Clock,
  Search,
  MapPin,
  Heart,
  Droplet,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  Calendar,
  Phone,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FriendActionButton } from "@/components/friends/FriendActionButton";
import { apiClient } from "@/lib/api/client";
import { formatBloodGroup, FriendUser, BloodGroup } from "@repo/shared";
import { toast } from "sonner";

interface FriendsClientProps {
  initialFriends: FriendUser[];
  initialRequests: {
    received: FriendUser[];
    sent: FriendUser[];
  };
}

export function FriendsClient({
  initialFriends,
  initialRequests,
}: FriendsClientProps) {
  const [friends, setFriends] = useState<FriendUser[]>(initialFriends);
  const [requests, setRequests] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState("my-friends");

  // Search by Email state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [friendsRes, reqRes] = await Promise.all([
        apiClient.request<FriendUser[]>("/friends"),
        apiClient.request<{ received: FriendUser[]; sent: FriendUser[] }>(
          "/friends/requests",
        ),
      ]);
      if (Array.isArray(friendsRes)) setFriends(friendsRes);
      if (reqRes && Array.isArray(reqRes.received)) setRequests(reqRes);
    } catch {
      // offline / quiet catch
    }
  }, []);

  // Search handler
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await apiClient.request<FriendUser[]>(
        `/friends/search?q=${encodeURIComponent(query)}`,
      );
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err: any) {
      toast.error(err?.message || "Search failed");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const totalPendingReceived = requests.received.length;

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Social Blood Network
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Blood Donor Friends
            </h1>
            <p className="text-red-100 text-xs sm:text-sm">
              Connect with fellow life savers. When you or your friends create a
              blood request, friends get instantly notified regardless of
              blood type or location!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setActiveTab("search")}
              className="bg-white text-red-600 hover:bg-red-50 font-semibold text-xs sm:text-sm shadow-sm gap-2 h-10 px-4"
            >
              <UserPlus className="w-4 h-4" />
              Find by Email
            </Button>
          </div>
        </div>

        {/* Decorative background blur bubbles */}
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -top-8 w-44 h-44 rounded-full bg-rose-400/20 blur-2xl pointer-events-none" />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-xl grid grid-cols-3 max-w-xl h-11">
          <TabsTrigger
            value="my-friends"
            className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Users className="w-4 h-4" />
            <span>Friends</span>
            {friends.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 px-1.5 text-[10px] font-bold"
              >
                {friends.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="requests"
            className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg relative"
          >
            <Clock className="w-4 h-4" />
            <span>Requests</span>
            {totalPendingReceived > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
                {totalPendingReceived}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="search"
            className="text-xs sm:text-sm font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: My Friends */}
        <TabsContent value="my-friends" className="space-y-4">
          {friends.length === 0 ? (
            <Card className="border-dashed border-2 p-8 text-center bg-card/50">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">No friends added yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Build your trusted blood donor network! When your friends need
                  blood, you will get instant alerts directly.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setActiveTab("search")}
                  >
                    Search Donors by Email
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => {
                const initials = friend.name
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <Card
                    key={friend.id}
                    className="border bg-card hover:shadow-md transition-all group overflow-hidden"
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-red-100 dark:border-red-950/60 shrink-0">
                            <AvatarImage
                              src={friend.avatar_url || undefined}
                              alt={friend.name}
                            />
                            <AvatarFallback className="font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                              {initials || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-sm sm:text-base leading-tight group-hover:text-red-600 transition-colors">
                              {friend.name}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                              {friend.email}
                            </p>
                          </div>
                        </div>

                        {friend.blood_group && (
                          <Badge className="bg-red-600 text-white font-extrabold px-2 py-0.5 shrink-0 shadow-sm">
                            {formatBloodGroup(friend.blood_group)}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
                        {friend.area_name && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{friend.area_name}</span>
                          </div>
                        )}
                        {friend.is_available !== null && (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${friend.is_available ? "bg-emerald-500" : "bg-amber-500"}`}
                            />
                            <span>
                              {friend.is_available
                                ? "Available to donate"
                                : "In cooldown period"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/50">
                        <Link
                          href={`/friends/${friend.id}`}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                        >
                          View Profile & History
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        <FriendActionButton
                          targetUserId={friend.id}
                          initialStatus="FRIENDS"
                          initialFriendshipId={friend.friendship_id}
                          onStatusChange={refreshData}
                          size="sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Requests */}
        <TabsContent value="requests" className="space-y-6">
          {/* Received Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" />
                Received Requests ({requests.received.length})
              </h3>
            </div>

            {requests.received.length === 0 ? (
              <p className="text-xs text-muted-foreground italic bg-muted/30 p-4 rounded-xl">
                No pending received friend requests.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {requests.received.map((req) => (
                  <Card key={req.id} className="p-4 border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={req.avatar_url || undefined} />
                          <AvatarFallback className="font-bold text-xs bg-red-50 text-red-600">
                            {req.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {req.name}
                            </span>
                            {req.blood_group && (
                              <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] px-1.5 py-0 font-bold">
                                {formatBloodGroup(req.blood_group)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[170px]">
                            {req.area_name || req.email}
                          </p>
                        </div>
                      </div>

                      <FriendActionButton
                        targetUserId={req.id}
                        initialStatus="PENDING_RECEIVED"
                        initialFriendshipId={req.friendship_id}
                        onStatusChange={refreshData}
                        size="sm"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                Sent Requests ({requests.sent.length})
              </h3>
            </div>

            {requests.sent.length === 0 ? (
              <p className="text-xs text-muted-foreground italic bg-muted/30 p-4 rounded-xl">
                No pending sent friend requests.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {requests.sent.map((req) => (
                  <Card key={req.id} className="p-4 border bg-card/60 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={req.avatar_url || undefined} />
                          <AvatarFallback className="font-bold text-xs bg-muted text-foreground">
                            {req.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {req.name}
                            </span>
                            {req.blood_group && (
                              <Badge className="bg-muted text-foreground text-[10px] px-1.5 py-0">
                                {formatBloodGroup(req.blood_group)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[170px]">
                            {req.area_name || req.email}
                          </p>
                        </div>
                      </div>

                      <FriendActionButton
                        targetUserId={req.id}
                        initialStatus="PENDING_SENT"
                        initialFriendshipId={req.friendship_id}
                        onStatusChange={refreshData}
                        size="sm"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Search by Email or Name */}
        <TabsContent value="search" className="space-y-6">
          <Card className="p-6 border bg-card">
            <div className="space-y-4 max-w-xl">
              <div className="space-y-1">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-red-600" />
                  Search Donors & Users
                </h3>
                <p className="text-xs text-muted-foreground">
                  Find friends by entering their email address or full name.
                </p>
              </div>

              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter email address (e.g. john@example.com) or name..."
                    className="pl-9 h-11 text-xs sm:text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white h-11 px-5"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </form>
            </div>
          </Card>

          {/* Search Results */}
          {hasSearched && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-muted-foreground">
                Search Results ({searchResults.length})
              </h4>

              {searchResults.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-sm text-muted-foreground">
                    No users found matching &quot;{searchQuery}&quot;. Please check the
                    email and try again.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((user) => (
                    <Card key={user.id} className="p-4 border bg-card shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border shrink-0">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="font-bold text-xs bg-red-100 text-red-600">
                                {user.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-sm leading-tight">
                                {user.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          {user.blood_group && (
                            <Badge className="bg-red-600 text-white font-bold text-xs">
                              {formatBloodGroup(user.blood_group)}
                            </Badge>
                          )}
                        </div>

                        {user.area_name && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{user.area_name}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t flex items-center justify-between">
                          <Link
                            href={`/friends/${user.id}`}
                            className="text-xs text-red-600 font-semibold hover:underline"
                          >
                            View Profile
                          </Link>

                          <FriendActionButton
                            targetUserId={user.id}
                            initialStatus={user.friendship_status}
                            initialFriendshipId={user.friendship_id}
                            onStatusChange={refreshData}
                            size="sm"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
