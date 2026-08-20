"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareGraphicToWhatsapp } from "./api";

interface PassportShareBarProps {
  graphicId: string;
  playerName: string;
  shareUrl: string;
}

// §5 G2: "one-tap share sized for WhatsApp status and Instagram stories."
// No navigator.share usage exists anywhere else in this app (confirmed —
// only a copy-link pattern did, on the squad status page) — this is the
// first real native-share-sheet integration, with that same copy-link
// pattern kept as the fallback for browsers without the Web Share API.
export function PassportShareBar({ graphicId, playerName, shareUrl }: PassportShareBarProps) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${playerName}'s player passport`, url: shareUrl });
      } catch {
        // user dismissed the share sheet — not an error
      }
      return;
    }

    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareWhatsapp() {
    try {
      const { whatsappUrl } = await shareGraphicToWhatsapp(graphicId);
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to open WhatsApp share");
    }
  }

  return (
    <div className="flex gap-2">
      <Button className="flex-1" onClick={share}>
        {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
        {copied ? "Link copied" : "Share"}
      </Button>
      <Button variant="outline" className="flex-1" onClick={shareWhatsapp}>
        Share to WhatsApp
      </Button>
    </div>
  );
}
