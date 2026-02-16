import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const inquirySchema = z.object({
  contact_name: z.string().trim().min(1, "Contact name is required").max(100),
  company_name: z.string().trim().min(1, "Company / label name is required").max(150),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().max(30).optional(),
  artist_name: z.string().trim().min(1, "Artist name is required").max(100),
  song_title: z.string().trim().max(200).optional(),
  budget_range: z.string().optional(),
  message: z.string().trim().max(2000).optional(),
});

type InquiryForm = z.infer<typeof inquirySchema>;

const budgetOptions = [
  { value: "under_1k", label: "Under $1k" },
  { value: "1k_5k", label: "$1k – $5k" },
  { value: "5k_10k", label: "$5k – $10k" },
  { value: "10k_plus", label: "$10k+" },
];

export default function Inquire() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<InquiryForm>({
    contact_name: "",
    company_name: "",
    email: "",
    phone: "",
    artist_name: "",
    song_title: "",
    budget_range: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof InquiryForm, string>>>({});

  const handleChange = (field: keyof InquiryForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = inquirySchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.errors.forEach((err) => {
        const key = err.path[0] as keyof InquiryForm;
        if (!fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const payload = {
      contact_name: result.data.contact_name,
      company_name: result.data.company_name,
      email: result.data.email,
      phone: result.data.phone || null,
      artist_name: result.data.artist_name,
      song_title: result.data.song_title || null,
      budget_range: result.data.budget_range || null,
      message: result.data.message || null,
    };

    const { error } = await supabase.from("inquiries" as any).insert([payload] as any);
    setSubmitting(false);

    if (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
      return;
    }

    toast({ title: "Inquiry submitted!", description: "We'll be in touch soon." });
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 bg-background py-20">
        <div className="container mx-auto px-6 max-w-2xl">
          <h1 className="text-4xl font-bold mb-2">Get Started</h1>
          <p className="text-muted-foreground mb-10">
            Tell us about your project and we'll reach out to discuss how Dance-Verse can help promote your music.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <Field label="Contact Name *" error={errors.contact_name}>
                <Input value={form.contact_name} onChange={(e) => handleChange("contact_name", e.target.value)} placeholder="Your name" />
              </Field>
              <Field label="Company / Label *" error={errors.company_name}>
                <Input value={form.company_name} onChange={(e) => handleChange("company_name", e.target.value)} placeholder="Label or company" />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <Field label="Email *" error={errors.email}>
                <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="you@label.com" />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <Input type="tel" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="(optional)" />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <Field label="Artist Name *" error={errors.artist_name}>
                <Input value={form.artist_name} onChange={(e) => handleChange("artist_name", e.target.value)} placeholder="Artist to promote" />
              </Field>
              <Field label="Song / Project Title" error={errors.song_title}>
                <Input value={form.song_title} onChange={(e) => handleChange("song_title", e.target.value)} placeholder="(optional)" />
              </Field>
            </div>

            <Field label="Estimated Budget" error={errors.budget_range}>
              <Select value={form.budget_range} onValueChange={(v) => handleChange("budget_range", v)}>
                <SelectTrigger><SelectValue placeholder="Select a range" /></SelectTrigger>
                <SelectContent>
                  {budgetOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Message / Details" error={errors.message}>
              <Textarea value={form.message} onChange={(e) => handleChange("message", e.target.value)} placeholder="Tell us more about your campaign goals…" rows={4} />
            </Field>

            <Button type="submit" size="lg" disabled={submitting} className="w-full rounded-full text-lg py-6">
              {submitting ? "Submitting…" : "SUBMIT INQUIRY"}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
