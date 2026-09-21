import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { AlertCircle } from "lucide-react";
import { apiRequest, extractApiErrorMessage, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AiSettingsPayload {
  dailyTokenLimit: number | null;
  updatedAt: string | null;
}

interface AiUsageRow {
  businessId: string | null;
  businessName: string | null;
  tokens: number;
  requests: number;
}

export default function AiSettingsPage() {
  const { toast } = useToast();
  const [limitInput, setLimitInput] = useState(""); // "" = unlimited

  usePageHeader("AI Settings", "Set the daily AI token limit and monitor today's usage");

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });
  const sdpRole = (currentUser as any)?.sdpRole;
  const isAdmin = sdpRole === "sdp_super_admin" || sdpRole === "sdp_admin";

  const { data: settings } = useQuery<AiSettingsPayload>({
    queryKey: ["/api/ai/admin/settings"],
    enabled: isAdmin,
  });

  const { data: usage } = useQuery<{ items: AiUsageRow[] }>({
    queryKey: ["/api/ai/admin/usage"],
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    setLimitInput(settings?.dailyTokenLimit ? String(settings.dailyTokenLimit) : "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (dailyTokenLimit: number | null) => {
      const res = await apiRequest("PUT", "/api/ai/admin/settings", { dailyTokenLimit });
      return (await res.json()) as AiSettingsPayload;
    },
    onSuccess: () => {
      toast({ title: "AI settings saved", description: "The daily token limit has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/admin/settings"] });
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: extractApiErrorMessage(err, "Could not save the AI settings."),
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const trimmed = limitInput.trim();
    if (trimmed === "") {
      saveMutation.mutate(null);
      return;
    }
    const value = Number(trimmed);
    if (!Number.isInteger(value) || value < 0) {
      toast({
        title: "Invalid limit",
        description: "The daily token limit must be a whole number of tokens (or empty for unlimited).",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(value);
  };

  if (userLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: You need Admin privileges to access AI settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const limit = settings?.dailyTokenLimit ?? null;
  const usageRows = usage?.items ?? [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily token limit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="dailyTokenLimit">Tokens per business per day</Label>
            <Input
              id="dailyTokenLimit"
              type="number"
              min={0}
              step={1}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="Unlimited"
            />
            <p className="text-sm text-secondary-500">
              Tokens (input + output) each business may use per UTC day across all AI features —
              AI search, contract drafting, country intel, and role suggestions. Leave empty for
              unlimited. SDP internal users are not limited.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's usage (UTC day)</CardTitle>
        </CardHeader>
        <CardContent>
          {usageRows.length === 0 ? (
            <p className="text-sm text-secondary-500">No AI usage yet today.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  {limit !== null && <TableHead className="text-right">% of limit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageRows.map((row) => {
                  const overLimit = limit !== null && row.businessId !== null && row.tokens >= limit;
                  return (
                    <TableRow key={row.businessId ?? "unattributed"}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {row.businessName ?? (row.businessId ? "Unknown business" : "SDP internal / unattributed")}
                          {overLimit && <Badge variant="destructive">Over limit</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{row.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.tokens.toLocaleString()}</TableCell>
                      {limit !== null && (
                        <TableCell className="text-right">
                          {row.businessId ? `${Math.round((row.tokens / limit) * 100)}%` : "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
