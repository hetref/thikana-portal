import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Share2,
  Download,
  Copy,
  Check,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const ShareBusinessDialog = ({ userData, buttonClassName, buttonText = "Share" }) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);
  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${userData?.username}?user=${userData?.uid}`
      : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = () => {
    if (!qrRef.current) return;

    const canvas = document.createElement("canvas");
    const svg = qrRef.current.querySelector("svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${userData?.businessName || "business"}-qrcode.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("QR Code downloaded successfully!");
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex items-center gap-2", buttonClassName)}
        >
          <Share2 className="h-4 w-4" />
          <span>{buttonText}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Business Profile</DialogTitle>
          <DialogDescription>
            Share your business profile with others
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="qrcode">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={profileUrl}
                className="flex-1 bg-muted/50"
              />
              <Button size="sm" onClick={handleCopyLink}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="mt-6">
              <div className="text-sm mb-2 text-muted-foreground">
                Share on social media
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() =>
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
                      "_blank"
                    )
                  }
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}&text=Check out ${userData?.businessName || "this business"} on Thikana!`,
                      "_blank"
                    )
                  }
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() =>
                    window.open(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
                      "_blank"
                    )
                  }
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() =>
                    window.open(
                      `mailto:?subject=Check out ${userData?.businessName || "this business"} on Thikana&body=${encodeURIComponent(profileUrl)}`,
                      "_blank"
                    )
                  }
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="qrcode"
            className="flex flex-col items-center space-y-4"
          >
            <div ref={qrRef} className="bg-white p-4 rounded-lg">
              <QRCode value={profileUrl} size={200} level="H" />
            </div>
            <p className="text-sm text-center">
              Scan this QR code to visit{" "}
              {userData?.businessName || "this business"} profile
            </p>
            <Button
              onClick={downloadQRCode}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download QR Code
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShareBusinessDialog;
