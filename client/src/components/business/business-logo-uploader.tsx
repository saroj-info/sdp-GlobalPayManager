/**
 * Upload, preview and remove a business's logo. Used on the business's own
 * profile page and, in `compact` form, on the SDP admin's Businesses page.
 *
 * Saves immediately: `PUT /api/businesses/:id/logo` with the file as the
 * body, `DELETE /api/businesses/:id/logo` to remove. The caller gets the
 * updated business row through `onUpdated` and refreshes its own cache.
 *
 * Same rules as ObjectUploader: a real <button type="button"> clicks a hidden
 * <input type="file"> through a ref (never a <button> inside a <label>).
 */

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Building2, ImageUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, apiUpload, extractApiErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BUSINESS_LOGO_ACCEPT,
  BUSINESS_LOGO_HELP,
  BUSINESS_LOGO_MAX_BYTES,
  BUSINESS_LOGO_SNIFF_BYTES,
  detectImageType,
} from "@shared/businessLogo";
import type { Business } from "@shared/schema";

interface BusinessLogoUploaderProps {
  business: Pick<Business, "id" | "name" | "logoUrl">;
  onUpdated: (updated: Business) => void;
  /** Smaller preview and inline buttons (SDP Businesses page). */
  compact?: boolean;
  disabled?: boolean;
}

export function BusinessLogoUploader({ business, onUpdated, compact = false, disabled = false }: BusinessLogoUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: Blob) => {
      const res = await apiUpload("PUT", `/api/businesses/${business.id}/logo`, file);
      return (await res.json()) as Business;
    },
    onSuccess: (updated) => {
      setPreviewFailed(false);
      toast({ title: "Logo saved", description: "The logo now shows in place of the SDP Global Pay logo." });
      onUpdated(updated);
    },
    onError: (err) => {
      toast({ title: "Couldn't save the logo", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/businesses/${business.id}/logo`);
      return (await res.json()) as Business;
    },
    onSuccess: (updated) => {
      toast({ title: "Logo removed", description: "The SDP Global Pay logo shows again." });
      onUpdated(updated);
    },
    onError: (err) => {
      toast({ title: "Couldn't remove the logo", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    },
  });

  const busy = disabled || uploadMutation.isPending || removeMutation.isPending;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input so picking the same file again fires onChange.
    event.target.value = "";
    if (!file) return;

    if (file.size > BUSINESS_LOGO_MAX_BYTES) {
      toast({ title: "Logo too large", description: BUSINESS_LOGO_HELP, variant: "destructive" });
      return;
    }
    // Type from the bytes, not the file name: the server checks the same way.
    const head = new Uint8Array(await file.slice(0, BUSINESS_LOGO_SNIFF_BYTES).arrayBuffer());
    const type = detectImageType(head);
    if (!type) {
      toast({ title: "Unsupported image", description: BUSINESS_LOGO_HELP, variant: "destructive" });
      return;
    }
    uploadMutation.mutate(new Blob([file], { type }));
  };

  const hasLogo = !!business.logoUrl && !previewFailed;
  const previewBox = compact ? "h-12 w-40" : "h-16 w-56";

  const preview = hasLogo ? (
    <img
      src={business.logoUrl!}
      alt={business.name}
      className={`${previewBox} object-contain`}
      onError={() => setPreviewFailed(true)}
      data-testid="img-business-logo-preview"
    />
  ) : (
    <div
      className={`${previewBox} flex items-center justify-center gap-2 text-xs text-muted-foreground`}
      data-testid="placeholder-business-logo"
    >
      <Building2 className="h-4 w-4" />
      {compact ? "No logo" : "No logo yet"}
    </div>
  );

  const buttons = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        data-testid="button-upload-business-logo"
      >
        {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
        {uploadMutation.isPending ? "Uploading..." : hasLogo ? "Change logo" : "Upload logo"}
      </Button>
      {!!business.logoUrl && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => removeMutation.mutate()}
          data-testid="button-remove-business-logo"
        >
          {removeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Remove logo
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={BUSINESS_LOGO_ACCEPT}
        style={{ display: "none" }}
        onChange={handleFileChange}
        data-testid="input-business-logo-file"
      />
    </>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3" data-testid="business-logo-uploader">
        <div className="rounded-lg border bg-white p-1">{preview}</div>
        <div className="flex flex-wrap items-center gap-2">{buttons}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="business-logo-uploader">
      <div className="inline-block rounded-lg border bg-white p-2">{preview}</div>
      <div className="flex flex-wrap items-center gap-2">{buttons}</div>
      <p className="text-xs text-muted-foreground">
        {BUSINESS_LOGO_HELP} {hasLogo ? "It shows in the app instead of the SDP Global Pay logo." : "Without a logo the SDP Global Pay logo is shown."}
      </p>
    </div>
  );
}
