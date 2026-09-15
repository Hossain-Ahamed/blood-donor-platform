"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Server,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalDonorProfiles: number;
  totalRequests: number;
  requestsByStatus: Record<string, number>;
  requestsToday: number;
  requestsThisWeek: number;
  availableDonorsByGroup: Record<string, number>;
  pendingReports: number;
  systemStatus: {
    dbReachable: boolean;
    redisReachable: boolean;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.request<{ data: DashboardStats }>(
          "/admin/dashboard/stats",
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setStats(data as any); // Might need adjusting based on NestJS interceptor
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-100">
        <div className="animate-spin text-gray-500">
          <Activity size={32} />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          Error: {error}
        </div>
      </div>
    );
  }

  // Handle both possible response shapes (NestJS might wrap in `{ data: ... }`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeStats = (stats as any).data ? (stats as any).data : stats;

  const bloodGroupChartData = Object.entries(
    activeStats.availableDonorsByGroup || {},
  ).map(([group, count]) => ({
    name: group.replace("_", " "),
    count,
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {activeStats.totalDonorProfiles} registered as donors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeStats.requestsByStatus?.["OPEN"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {activeStats.totalRequests} total requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reports
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeStats.pendingReports}
            </div>
            <p className="text-xs text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeStats.requestsToday}
            </div>
            <p className="text-xs text-muted-foreground">
              Requests created today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Available Donors by Blood Group</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-75">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bloodGroupChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-8">
              <div className="flex items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 mr-4">
                  <Server className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Database (Postgres)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeStats.systemStatus?.dbReachable
                      ? "Connected and healthy"
                      : "Unreachable"}
                  </p>
                </div>
                <div className="ml-auto">
                  {activeStats.systemStatus?.dbReachable ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 mr-4">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Cache (Redis)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeStats.systemStatus?.redisReachable
                      ? "Connected and healthy"
                      : "Unreachable"}
                  </p>
                </div>
                <div className="ml-auto">
                  {activeStats.systemStatus?.redisReachable ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>

              <div className="pt-4 border-t mt-6">
                <h4 className="text-sm font-medium mb-3">
                  Fulfillment Progress
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Fulfilled</span>
                    <span className="font-medium">
                      {activeStats.requestsByStatus?.["FULFILLED"] || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Partially Fulfilled</span>
                    <span className="font-medium">
                      {activeStats.requestsByStatus?.["PARTIALLY_FULFILLED"] ||
                        0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Expired / Cancelled</span>
                    <span className="font-medium">
                      {(activeStats.requestsByStatus?.["EXPIRED"] || 0) +
                        (activeStats.requestsByStatus?.["CANCELLED"] || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
