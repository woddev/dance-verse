import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, CheckCircle, XCircle, Send } from "lucide-react";

const EMAIL_TEMPLATES = [
  {
    id: "application-received",
    name: "Application Received",
    trigger: "When a producer submits their application",
    subject: "We Received Your DanceVerse Producer Application",
    from: "DanceVerse <noreply@dance-verse.com>",
    icon: Mail,
    badgeLabel: "Submission",
    html: (name: string) => `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e7eb;">
  <h1 style="color:#111;font-size:24px;margin:0 0 16px;">Application Received! 🎵</h1>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Hi ${name},</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Thanks for applying to the DanceVerse producer program. We've received your application and our team will review it shortly.</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">You'll receive an email once a decision has been made. In the meantime, feel free to reach out if you have any questions.</p>
  <p style="color:#6b7280;font-size:14px;margin-top:24px;">— The DanceVerse Team</p>
</div></body></html>`,
  },
  {
    id: "producer-approved",
    name: "Producer Approved",
    trigger: "When an admin approves a producer application",
    subject: "Your DanceVerse Producer Application Has Been Approved!",
    from: "DanceVerse <noreply@dance-verse.com>",
    icon: CheckCircle,
    badgeLabel: "Approval",
    html: (name: string) => `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e7eb;">
  <h1 style="color:#111;font-size:24px;margin:0 0 16px;">Welcome to DanceVerse! 🎶</h1>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Hi ${name},</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Great news — your producer application has been <strong>approved</strong>!</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">You'll receive a separate email with a link to set up your account. Once you're in, you can start submitting tracks and receiving offers.</p>
  <p style="color:#6b7280;font-size:14px;margin-top:24px;">— The DanceVerse Team</p>
</div></body></html>`,
  },
  {
    id: "producer-rejected",
    name: "Producer Rejected",
    trigger: "When an admin rejects a producer application",
    subject: "Update on Your DanceVerse Application",
    from: "DanceVerse <noreply@dance-verse.com>",
    icon: XCircle,
    badgeLabel: "Rejection",
    html: (name: string, reason?: string) => `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:40px 0;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e5e7eb;">
  <h1 style="color:#111;font-size:24px;margin:0 0 16px;">Application Update</h1>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Hi ${name},</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">Thank you for your interest in the DanceVerse producer program. After reviewing your application, we're unable to move forward at this time.</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;"><strong>Reason:</strong> ${reason || "Does not meet our current requirements."}</p>
  <p style="color:#374151;font-size:16px;line-height:1.6;">You're welcome to reapply in the future. We appreciate your time and talent.</p>
  <p style="color:#6b7280;font-size:14px;margin-top:24px;">— The DanceVerse Team</p>
</div></body></html>`,
  },
];

export default function EmailTemplates() {
  const [activeTab, setActiveTab] = useState(EMAIL_TEMPLATES[0].id);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">
            Preview all transactional emails sent via Resend from{" "}
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">noreply@dance-verse.com</span>
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EMAIL_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <Card
                key={tmpl.id}
                className={`cursor-pointer transition-all ${
                  activeTab === tmpl.id
                    ? "ring-2 ring-primary"
                    : "hover:border-primary/40"
                }`}
                onClick={() => setActiveTab(tmpl.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="secondary" className="text-xs">
                      {tmpl.badgeLabel}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{tmpl.name}</CardTitle>
                  <CardDescription className="text-xs">{tmpl.trigger}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Template detail + preview */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {EMAIL_TEMPLATES.map((tmpl) => (
              <TabsTrigger key={tmpl.id} value={tmpl.id}>
                {tmpl.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {EMAIL_TEMPLATES.map((tmpl) => (
            <TabsContent key={tmpl.id} value={tmpl.id}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Template Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">From</p>
                      <p className="font-mono text-xs">{tmpl.from}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Subject</p>
                      <p className="font-medium">{tmpl.subject}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Trigger</p>
                      <p>{tmpl.trigger}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Delivery</p>
                      <div className="flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Via Resend API</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Status</p>
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm">Email Preview</CardTitle>
                    <CardDescription className="text-xs">
                      This is how the email looks in the recipient's inbox
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-border overflow-hidden">
                      {/* Email client header mock */}
                      <div className="bg-muted px-4 py-3 border-b border-border space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-12">From:</span>
                          <span className="font-medium">{tmpl.from}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-12">To:</span>
                          <span>producer@example.com</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-12">Subject:</span>
                          <span className="font-medium">{tmpl.subject}</span>
                        </div>
                      </div>
                      {/* Email body */}
                      <iframe
                        srcDoc={tmpl.html(
                          "Alex Rivera",
                          tmpl.id === "producer-rejected"
                            ? "We're looking for producers with more experience in dance music at this time."
                            : undefined
                        )}
                        title={`${tmpl.name} preview`}
                        className="w-full border-0"
                        style={{ height: 380 }}
                        sandbox=""
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
