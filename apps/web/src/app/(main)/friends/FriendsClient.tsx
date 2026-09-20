"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  X,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FriendActionButton } from "@/components/friends/FriendActionButton";
import { apiClient } from "@/lib/api/client";
import { formatBloodGroup, FriendUser, BloodGroup } from "@repo/shared";
import { toast } from "sonner";

interface FriendsClientProps {
  initialFriends: FriendUser[];
  initialHasMore?: boolean;
  initialRequests: {
    received: FriendUser[];
    sent: FriendUser[];
  };
}

export function FriendsClient({
  initialFriends,
  initialHasMore = false,
  initialRequests,
}: FriendsClientProps) {
  // Friends search & blood group filter state
  const [nameSearch, setNameSearch] = useState("");
  const [debouncedNameSearch, setDebouncedNameSearch] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("all");

  // Infinite scroll pagination state
  const [friends, setFriends] = useState<FriendUser[]>(initialFriends);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Find friends (search exclusively by exact email/phone) tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedTerm, setSearchedTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [requests, setRequests] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState("my-friends");

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameSearch(nameSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [nameSearch]);

  // Backend search on debounced filter change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let isSubscribed = true;
    const fetchFilteredFriends = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "10",
        });
        if (debouncedNameSearch.trim()) {
          params.append("search", debouncedNameSearch.trim());
        }
        if (bloodGroupFilter !== "all") {
          params.append("blood_group", bloodGroupFilter);
        }

        const res = await apiClient.request<
          | { data: FriendUser[]; meta?: { page: number; limit: number; hasMore: boolean } }
          | FriendUser[]
        >(`/friends?${params.toString()}`);

        if (!isSubscribed) return;

        let items: FriendUser[] = [];
        let more = false;
        if (Array.isArray(res)) {
          items = res;
          more = res.length >= 10;
        } else if (res && Array.isArray((res as any).data)) {
          items = (res as any).data;
          more = Boolean((res as any).meta?.hasMore);
        }

        setFriends(items);
        setPage(1);
        setHasMore(more);
      } catch (err: any) {
        if (isSubscribed) {
          toast.error(err?.message || "Failed to search friends");
        }
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    fetchFilteredFriends();

    return () => {
      isSubscribed = false;
    };
  }, [debouncedNameSearch, bloodGroupFilter]);

  // Scroll to load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: "10",
      });
      if (debouncedNameSearch.trim()) {
        params.append("search", debouncedNameSearch.trim());
      }
      if (bloodGroupFilter !== "all") {
        params.append("blood_group", bloodGroupFilter);
      }

      const res = await apiClient.request<
        | { data: FriendUser[]; meta?: { page: number; limit: number; hasMore: boolean } }
        | FriendUser[]
      >(`/friends?${params.toString()}`);

      let items: FriendUser[] = [];
      let more = false;
      if (Array.isArray(res)) {
        items = res;
        more = res.length >= 10;
      } else if (res && Array.isArray((res as any).data)) {
        items = (res as any).data;
        more = Boolean((res as any).meta?.hasMore);
      }

      setFriends((prev) => {
        const existingIds = new Set(prev.map((f) => f.id));
        const newUnique = items.filter((f) => !existingIds.has(f.id));
        return [...prev, ...newUnique];
      });
      setPage(nextPage);
      setHasMore(more);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load more friends");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoading, hasMore, page, debouncedNameSearch, bloodGroupFilter]);

  // IntersectionObserver for infinite scroll sentinel
  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "250px" },
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  const refreshData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "10",
      });
      if (debouncedNameSearch.trim()) {
        params.append("search", debouncedNameSearch.trim());
      }
      if (bloodGroupFilter !== "all") {
        params.append("blood_group", bloodGroupFilter);
      }

      const [friendsRes, reqRes] = await Promise.all([
        apiClient.request<
          | { data: FriendUser[]; meta?: { page: number; limit: number; hasMore: boolean } }
          | FriendUser[]
        >(`/friends?${params.toString()}`),
        apiClient.request<{ received: FriendUser[]; sent: FriendUser[] }>(
          "/friends/requests",
        ),
      ]);

      if (Array.isArray(friendsRes)) {
        setFriends(friendsRes);
        setHasMore(friendsRes.length >= 10);
      } else if (friendsRes && Array.isArray((friendsRes as any).data)) {
        setFriends((friendsRes as any).data);
        setHasMore(Boolean((friendsRes as any).meta?.hasMore));
      }
      setPage(1);

      if (reqRes && Array.isArray(reqRes.received)) setRequests(reqRes);
    } catch {
      // offline / quiet catch
    }
  }, [debouncedNameSearch, bloodGroupFilter]);

  // Search handler
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchedTerm(query);
    try {
      const results = await apiClient.request<FriendUser[]>(
        `/friends/search?q=${encodeURIComponent(query)}`,
      );
      setSearchResults(Array.isArray(results) ? results : []);
      setHasSearched(true);
    } catch (err: any) {
      toast.error(err?.message || "Search failed");
      setSearchResults([]);
      setHasSearched(true);
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
              Find Friends
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
          {/* Search & Blood Group Filter Bar */}
          <div className="bg-card p-3 sm:p-4 rounded-xl border shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends by name, email, or phone..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs sm:text-sm"
                />
                {nameSearch && (
                  <button
                    type="button"
                    onClick={() => setNameSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Blood Group Select */}
              <Select
                value={bloodGroupFilter}
                onValueChange={(val: string | null) => setBloodGroupFilter(val || "all")}
              >
                <SelectTrigger className="h-9 w-full sm:w-[170px] text-xs sm:text-sm">
                  <SelectValue placeholder="All Blood Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blood Groups</SelectItem>
                  <SelectItem value="A_POS">A+ (A Positive)</SelectItem>
                  <SelectItem value="A_NEG">A- (A Negative)</SelectItem>
                  <SelectItem value="B_POS">B+ (B Positive)</SelectItem>
                  <SelectItem value="B_NEG">B- (B Negative)</SelectItem>
                  <SelectItem value="AB_POS">AB+ (AB Positive)</SelectItem>
                  <SelectItem value="AB_NEG">AB- (AB Negative)</SelectItem>
                  <SelectItem value="O_POS">O+ (O Positive)</SelectItem>
                  <SelectItem value="O_NEG">O- (O Negative)</SelectItem>
                </SelectContent>
              </Select>

              {(nameSearch || bloodGroupFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNameSearch("");
                    setBloodGroupFilter("all");
                  }}
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* List-Wise Table */}
          {friends.length === 0 && !nameSearch && bloodGroupFilter === "all" && !isLoading ? (
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
            <div className="space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border bg-card animate-pulse gap-3"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-muted shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded-md w-3/4" />
                        <div className="h-5 bg-muted rounded-full w-16" />
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-muted rounded-lg shrink-0" />
                  </div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <Card className="p-8 text-center border-dashed bg-card/50">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs py-4">
                  <Users className="w-8 h-8 text-muted-foreground/40" />
                  <span className="font-semibold text-foreground text-sm">
                    No friends found
                  </span>
                  <span className="text-xs text-muted-foreground max-w-sm">
                    No donors match your search and blood group filters.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNameSearch("");
                      setBloodGroupFilter("all");
                    }}
                    className="mt-2 text-xs"
                  >
                    Reset Filters
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {friends.map((friend) => {
                  const initials = friend.name
                    .split(" ")
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <div
                      key={friend.id}
                      className="group relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border bg-card hover:bg-muted/40 transition-all duration-150 shadow-2xs hover:shadow-xs gap-3"
                    >
                      {/* Clickable Profile Area (Image + Name + Blood Group) */}
                      <Link
                        href={`/friends/${friend.id}`}
                        className="flex items-center gap-3.5 min-w-0 flex-1 group/profile"
                      >
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border shrink-0 shadow-2xs overflow-hidden">
                          <AvatarImage
                            src={friend.avatar_url || undefined}
                            alt={friend.name}
                            className="object-cover rounded-xl"
                          />
                          <AvatarFallback className="font-bold text-base sm:text-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-xl">
                            {initials || "U"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-bold text-sm sm:text-base text-foreground group-hover/profile:text-red-600 group-hover/profile:underline transition-colors truncate">
                            {friend.name}
                          </p>
                          <div>
                            {friend.blood_group ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200/80 dark:border-red-900/60 px-2.5 py-0.5 rounded-full">
                                <Droplet className="w-3 h-3 fill-red-500 text-red-500" />
                                {formatBloodGroup(friend.blood_group)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/60 italic">
                                Unknown
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Simple Friend / Unfriend Button */}
                      <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FriendActionButton
                          targetUserId={friend.id}
                          targetUserName={friend.name}
                          initialStatus="FRIENDS"
                          initialFriendshipId={friend.friendship_id}
                          onStatusChange={(newStatus) => {
                            if (newStatus !== "FRIENDS") {
                              setFriends((prev) =>
                                prev.filter((f) => f.id !== friend.id),
                              );
                            }
                          }}
                          size="sm"
                          simple={true}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scroll Sentinel for Facebook-style Infinite Scroll */}
            <div
              ref={sentinelRef}
              className="py-5 flex items-center justify-center min-h-[50px]"
            >
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                  <span>Loading more friends...</span>
                </div>
              ) : hasMore ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Load more friends
                </Button>
              ) : friends.length > 10 ? (
                <span className="text-xs text-muted-foreground/70">
                  You&apos;ve reached the end of your friends list
                </span>
              ) : null}
            </div>
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

        {/* Tab 3: Search exclusively by Email or Phone Number */}
        <TabsContent value="search" className="space-y-6">
          <Card className="p-6 border bg-card">
            <div className="space-y-4 max-w-xl">
              <div className="space-y-1">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-red-600" />
                  Find Friends by Email or Phone Number
                </h3>
                <p className="text-xs text-muted-foreground">
                  Search requires an exact email address or exact phone number.
                </p>
              </div>

              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter exact email (user@example.com) or phone number (019XXXXXXXX)..."
                    className="pl-9 pr-9 h-11 text-xs sm:text-sm"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHasSearched(false);
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setHasSearched(false);
                        setSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      title="Clear input"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white h-11 px-5 font-semibold"
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
                    No user found matching &quot;{searchedTerm}&quot;. Please make sure you entered the exact email address or complete phone number.
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
