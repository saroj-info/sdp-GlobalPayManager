import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserPlus, Mail, Trash2, X, Crown, Clock } from "lucide-react";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Member {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "owner" | "member";
  isActive: boolean | null;
  createdAt: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
}

export default function TeamMembers() {
  usePageHeader("Team Members", "Invite teammates to access this business");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  // Used to mark the "you" row in the members table.
  const currentUserId: string | undefined = (user as any)?.id;

  // Members + pending invites both refresh together — they share a single
  // "team" view and one mutation should invalidate both.
  const { data: membersData, isLoading: membersLoading } = useQuery<{ members: Member[] }>({
    queryKey: ["/api/business-users/members"],
  });
  const { data: invitesData, isLoading: invitesLoading } = useQuery<PendingInvite[]>({
    queryKey: ["/api/business-users/invites"],
  });

  const members: Member[] = membersData?.members ?? [];
  // Equal-power membership: every team member has the same capabilities as
  // the owner. The only thing UI prevents is showing a Remove button on the
  // owner's own row (the server also rejects that). No `isOwner` gate.
  const pendingInvites: PendingInvite[] = Array.isArray(invitesData)
    ? invitesData.filter((i: any) => !i.acceptedAt && new Date(i.expiresAt) > new Date())
    : [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/business-users/members"] });
    queryClient.invalidateQueries({ queryKey: ["/api/business-users/invites"] });
  };

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/business-users/invite", { email });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `An email is on its way to ${inviteEmail}.`,
      });
      setInviteEmail("");
      setShowInviteDialog(false);
      invalidateAll();
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't send invite",
        description: err?.message || "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await apiRequest("DELETE", `/api/business-users/invites/${inviteId}`);
    },
    onSuccess: () => {
      toast({ title: "Invite cancelled" });
      invalidateAll();
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't cancel invite",
        description: err?.message || "Try again.",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/business-users/members/${userId}`);
    },
    onSuccess: () => {
      toast({ title: "Member removed", description: "They no longer have access to this business." });
      setMemberToRemove(null);
      invalidateAll();
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't remove member",
        description: err?.message || "Try again.",
        variant: "destructive",
      });
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    inviteMutation.mutate(email);
  };

  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Current members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary-600" />
                Team members
              </CardTitle>
              <CardDescription>
                People who can log in and act on this business account.
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              data-testid="button-open-invite"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite member
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {membersLoading ? (
              <div className="p-8 text-center text-secondary-500 text-sm">Loading…</div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-secondary-500 text-sm">No members yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(m => {
                    const isMe = m.id === currentUserId;
                    return (
                      <TableRow key={m.id} data-testid={`row-member-${m.id}`}>
                        <TableCell className="font-medium text-sm">
                          {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                          {isMe && <span className="ml-2 text-xs text-secondary-500">(you)</span>}
                        </TableCell>
                        <TableCell className="text-sm text-secondary-600">{m.email || "—"}</TableCell>
                        <TableCell>
                          {m.role === "owner" ? (
                            <Badge className="bg-amber-100 text-amber-800 text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Owner
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Member</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-secondary-600">{fmtDate(m.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {m.role === "owner" ? (
                            // Owner row is never removable by anyone via this
                            // endpoint (server also enforces). Other members
                            // always show the Remove button — equal-power
                            // semantics.
                            <span className="text-xs text-secondary-400">—</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-600"
                              onClick={() => setMemberToRemove(m)}
                              disabled={removeMemberMutation.isPending}
                              data-testid={`button-remove-${m.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Remove
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pending invitations — visible and actionable to every member. */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-secondary-600" />
              Pending invitations
              {pendingInvites.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{pendingInvites.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {invitesLoading ? (
              <div className="p-8 text-center text-secondary-500 text-sm">Loading…</div>
            ) : pendingInvites.length === 0 ? (
              <div className="p-8 text-center text-secondary-500 text-sm">No pending invitations.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map(inv => (
                    <TableRow key={inv.id} data-testid={`row-invite-${inv.id}`}>
                      <TableCell className="text-sm font-medium">{inv.email}</TableCell>
                      <TableCell className="text-sm text-secondary-600">{fmtDate(inv.createdAt)}</TableCell>
                      <TableCell className="text-sm text-secondary-600 whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5 inline mr-1" />
                        {fmtDate(inv.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => cancelInviteMutation.mutate(inv.id)}
                          disabled={cancelInviteMutation.isPending}
                          data-testid={`button-cancel-invite-${inv.id}`}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They'll get an email with a link to set up their account. They'll
              be required to enable two-factor authentication when they sign up.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
                autoFocus
                data-testid="input-invite-email"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                data-testid="button-send-invite"
              >
                {inviteMutation.isPending ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm-remove dialog */}
      <Dialog open={!!memberToRemove} onOpenChange={open => !open && setMemberToRemove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              {memberToRemove && (
                <>
                  <strong>{[memberToRemove.firstName, memberToRemove.lastName].filter(Boolean).join(" ") || memberToRemove.email}</strong>{" "}
                  will lose access to this business immediately. Their account
                  itself stays active and they can still sign in if they belong
                  to other businesses.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)} disabled={removeMemberMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => memberToRemove && removeMemberMutation.mutate(memberToRemove.id)}
              disabled={removeMemberMutation.isPending}
              data-testid="button-confirm-remove"
            >
              {removeMemberMutation.isPending ? "Removing…" : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
