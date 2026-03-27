import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProducerTermsDialogProps {
  trigger: React.ReactNode;
}

export default function ProducerTermsDialog({ trigger }: ProducerTermsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg leading-snug">
            Track Submission Terms &amp; Content License Agreement
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6 max-h-[65vh]">
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-4 pr-4">
            <p className="font-medium text-foreground">
              Dance-Verse, Inc.<br />
              111 North Harbor Blvd, Suite B<br />
              Fullerton, California 92832
            </p>
            <p>
              By selecting "I Agree," I ("Producer") acknowledge that I have read, understand, and agree to be legally bound by the following Terms with Dance-Verse, Inc., a California corporation ("Dance-Verse").
            </p>

            <h3 className="text-foreground">1. License Grant</h3>
            <p>Producer hereby grants to Dance-Verse a non-exclusive, worldwide, perpetual, irrevocable, royalty-free (except as set forth in a separate deal agreement), transferable, sublicensable license to use, reproduce, distribute, publicly perform, publicly display, synchronize, stream, broadcast, and otherwise exploit the submitted musical work(s) and associated artwork (collectively, the "Track") in connection with dance campaigns, promotional content, social media marketing, advertising, digital distribution, streaming platforms, compilation albums, and any other media or format now known or hereafter developed.</p>

            <h3 className="text-foreground">2. Rights Representations &amp; Warranties</h3>
            <p>Producer represents and warrants that: (a) Producer is the sole owner or has obtained all necessary rights, licenses, consents, and clearances to grant the rights described herein; (b) the Track is an original work and does not infringe upon any copyright, trademark, right of publicity, or other intellectual property or proprietary right of any third party; (c) all samples, interpolations, or third-party elements contained in the Track have been properly cleared and licensed; (d) Producer has the legal capacity and authority to enter into this Agreement; and (e) no other agreement exists that would conflict with or limit the rights granted herein.</p>

            <h3 className="text-foreground">3. Master &amp; Publishing Ownership</h3>
            <p>Producer acknowledges that the ownership percentages declared during track submission accurately reflect Producer's ownership interest in the master recording and publishing rights. Producer agrees to promptly notify Dance-Verse of any changes to ownership, splits, or rights affecting the Track. Any revenue distributions will be based on the ownership percentages declared at the time of submission unless amended by mutual written agreement.</p>

            <h3 className="text-foreground">4. Revenue Share &amp; Compensation</h3>
            <p>Producer acknowledges that compensation for the Track, including revenue share percentages, buyout amounts, and payment terms, shall be governed by a separate deal offer and contract. Submission of a Track does not guarantee any offer, compensation, or continued use. Dance-Verse retains sole discretion in determining which Tracks receive offers and under what terms.</p>

            <h3 className="text-foreground">5. Content ID &amp; Platform Distribution</h3>
            <p>Producer acknowledges that Dance-Verse may register the Track with content identification systems (e.g., YouTube Content ID, TikTok Sound Library, Instagram Music) and digital distribution platforms. Producer agrees not to file competing or conflicting content claims against Dance-Verse or its authorized creators' use of the Track in connection with approved campaigns.</p>

            <h3 className="text-foreground">6. Artificial Intelligence &amp; Data Usage</h3>
            <p>Producer acknowledges and agrees that Dance-Verse may use the Track, associated metadata, performance data, engagement metrics, and analytics for purposes of data analysis, algorithm training, artificial intelligence model development, machine learning systems, content recommendation engines, and other technological applications now known or later developed, for commercial, operational, research, and product development purposes.</p>

            <h3 className="text-foreground">7. Explicit Content</h3>
            <p>Producer agrees to accurately flag any Track containing explicit language, themes, or content. Misrepresentation of content classification may result in removal of the Track and termination of any associated deal.</p>

            <h3 className="text-foreground">8. Indemnification</h3>
            <p>Producer agrees to indemnify, defend, and hold harmless Dance-Verse, its officers, directors, employees, affiliates, partners, and agents from and against any and all claims, demands, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to any breach of these Terms, any misrepresentation regarding rights ownership, any third-party infringement claim, or any violation of applicable law by Producer.</p>

            <h3 className="text-foreground">9. Takedown &amp; Termination</h3>
            <p>Dance-Verse reserves the right to remove any Track at any time and for any reason, including but not limited to rights disputes, content policy violations, or business decisions. Termination of a specific Track does not affect the validity of any executed contracts or earned revenue obligations.</p>

            <h3 className="text-foreground">10. Governing Law &amp; Arbitration</h3>
            <p>This Agreement shall be governed by the laws of the State of California. Any dispute shall be resolved by binding arbitration in Orange County, California under the Commercial Arbitration Rules of the American Arbitration Association. The prevailing party shall be entitled to reasonable attorneys' fees and costs.</p>

            <h3 className="text-foreground">11. Entire Agreement</h3>
            <p>These Terms, together with any separate deal offer or contract, constitute the entire understanding between Producer and Dance-Verse regarding the submission and use of the Track. These Terms supersede all prior discussions, representations, or agreements relating to track submission.</p>

            <h3 className="text-foreground">12. Acknowledgment</h3>
            <p>By selecting "I Agree," Producer acknowledges having read this Agreement in its entirety, understands that substantial legal rights are being granted, and voluntarily agrees to be bound by these Terms without reliance on any oral representations.</p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
