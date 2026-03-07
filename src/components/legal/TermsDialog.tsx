import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsDialogProps {
  trigger: React.ReactNode;
}

export default function TermsDialog({ trigger }: TermsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg leading-snug">
            Terms of Participation, Content License, Release &amp; Independent Contractor Agreement
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
              By selecting "I Agree," I ("Participant") acknowledge that I have read, understand, and agree to be legally bound by the following Terms with Dance-Verse, Inc., a California corporation ("Dance-Verse").
            </p>

            <h3 className="text-foreground">1. Independent Contractor Relationship</h3>
            <p>Participant acknowledges and agrees that participation is strictly as an independent contractor and not as an employee, agent, partner, joint venturer, or representative of Dance-Verse. Nothing contained herein shall be construed to create an employment, partnership, joint venture, or agency relationship. Participant is solely responsible for all federal, state, and local taxes, insurance, licenses, permits, and legal compliance obligations arising from participation. Participant has no authority to bind or obligate Dance-Verse in any manner whatsoever.</p>

            <h3 className="text-foreground">2. Scope of Participation</h3>
            <p>Participant may submit dance performances, audiovisual works, choreography, images, social media links, promotional materials, recordings, creative assets, and related materials (collectively, the "Content") and may participate in campaigns, promotions, marketing initiatives, or related services (the "Services"). Dance-Verse retains sole and absolute discretion to accept, reject, remove, edit, modify, distribute, monetize, or otherwise exploit any Content or participation. Submission of Content does not guarantee selection, placement, compensation, or continued participation.</p>

            <h3 className="text-foreground">3. Representations and Warranties</h3>
            <p>Participant represents and warrants that Participant is at least eighteen (18) years of age or has valid parental or guardian consent on file; has full legal authority to enter into this Agreement; owns or controls all rights necessary to grant the rights and licenses described herein; and that the Content does not infringe upon or violate any copyright, trademark, right of publicity, privacy right, contract right, or other proprietary or personal right of any third party. Participant further represents that no agreement exists that conflicts with this Agreement, that Participant will comply with all applicable laws, FTC guidelines, advertising disclosure rules, and social media platform policies, and that Participant will not engage in unlawful conduct or conduct involving moral turpitude that could reasonably harm the reputation or business interests of Dance-Verse.</p>

            <h3 className="text-foreground">4. Content Ownership and License</h3>

            <h4 className="text-foreground">4.1 Ownership</h4>
            <p>Participant retains ownership of original Content submitted, subject to the licenses granted herein.</p>

            <h4 className="text-foreground">4.2 Irrevocable License Grant</h4>
            <p>Participant hereby grants to Dance-Verse, Inc., and its parents, subsidiaries, affiliates, successors, assigns, licensees, sponsors, advertising partners, record labels, distribution partners, digital service providers, regional representatives, media outlets, and marketing partners a perpetual, irrevocable, worldwide, royalty-free, fully paid, transferable, sublicensable license to use, reproduce, copy, edit, adapt, modify, reformat, synchronize with music or audiovisual works, publicly perform, publicly display, distribute, transmit, broadcast, stream, archive, create derivative works from, and otherwise exploit and monetize the Content in any and all media, formats, channels, or technologies now known or hereafter developed, for commercial, promotional, advertising, marketing, entertainment, analytics, licensing, distribution, and business purposes. This license expressly includes the right to combine the Content with other materials, incorporate it into compilations, trailers, advertisements, promotional reels, branded content, paid media campaigns, or derivative productions, and to exploit the Content in connection with Dance-Verse's platform operations and related ventures.</p>

            <h4 className="text-foreground">4.3 Third-Party Platform Submissions</h4>
            <p>If Participant submits Content through third-party platforms such as Instagram, TikTok, YouTube, Facebook, Snapchat, or similar services, Participant represents that Participant has the authority to grant the rights described herein and authorizes Dance-Verse to embed, repost, reformat, capture excerpts, distribute, and otherwise exploit such Content consistent with applicable platform terms. Participant acknowledges that Dance-Verse may use such Content outside of the originating platform and waives claims arising from platform removal, demonetization, or technical limitations beyond Dance-Verse's control.</p>

            <h4 className="text-foreground">4.4 Sublicensing</h4>
            <p>Participant acknowledges and agrees that Dance-Verse may sublicense the rights granted under this Agreement to third parties, including without limitation record labels, sponsors, advertising agencies, distributors, digital service providers, brand partners, media companies, and regional representatives, for commercial exploitation, marketing, promotional campaigns, licensing opportunities, distribution arrangements, and related business purposes, without additional approval from Participant unless otherwise agreed in writing.</p>

            <h4 className="text-foreground">4.5 Monetization</h4>
            <p>Participant understands and agrees that Dance-Verse may monetize the Content in its sole discretion through advertising revenue, sponsorships, brand partnerships, paid media, streaming revenue, licensing fees, subscription services, data monetization, promotional campaigns, or other revenue-generating mechanisms. Participant is not entitled to compensation unless expressly provided in a separate written agreement or campaign-specific terms.</p>

            <h4 className="text-foreground">4.6 Artificial Intelligence, Machine Learning &amp; Data Usage</h4>
            <p>Participant acknowledges and agrees that Dance-Verse may use the Content, metadata, performance data, engagement metrics, analytics, and related materials for purposes of data analysis, audience measurement, algorithm training, artificial intelligence model development, machine learning systems, automated editing tools, content optimization systems, recommendation engines, and other technological applications now known or later developed. Participant grants Dance-Verse the right to analyze, process, adapt, reproduce, transform, and incorporate the Content into datasets and AI-driven systems for commercial, operational, research, marketing, and product development purposes. Participant waives any claim related to such uses and acknowledges that no additional compensation is owed for such technological or analytical uses.</p>

            <h4 className="text-foreground">4.7 Moral Rights Waiver</h4>
            <p>To the fullest extent permitted by applicable law, Participant waives any moral rights, rights of attribution, integrity rights, or similar rights in the Content.</p>

            <h4 className="text-foreground">4.8 Survival</h4>
            <p>The licenses granted herein shall survive termination of participation and remain in effect perpetually unless otherwise agreed in writing.</p>

            <h3 className="text-foreground">5. Use of Name, Likeness and Biographical Material</h3>
            <p>Participant irrevocably grants Dance-Verse the perpetual, worldwide right to use Participant's name, nickname, likeness, image, voice, signature, biographical information, social media identifiers, and performance in connection with the Content and any related promotional, advertising, commercial, platform, marketing, licensing, AI training, data analytics, or distribution activities in any media now known or later developed, without additional compensation unless expressly agreed otherwise in writing.</p>

            <h3 className="text-foreground">6. Assumption of Risk</h3>
            <p>Participant acknowledges that dance performance, rehearsals, filming, travel, and related activities may involve inherent risks of serious injury, disability, death, or property damage, and Participant voluntarily assumes all such risks.</p>

            <h3 className="text-foreground">7. General Release and Waiver of Liability</h3>
            <p>Participant fully and forever releases and discharges Dance-Verse, Inc., its owners, officers, directors, employees, contractors, affiliates, agents, successors, and assigns from any and all claims, demands, liabilities, damages, losses, or causes of action arising from or related to participation or exploitation of the Content.</p>

            <h3 className="text-foreground">8. California Civil Code Section 1542 Waiver</h3>
            <p>Participant expressly waives any rights under California Civil Code Section 1542 and acknowledges understanding of such waiver.</p>

            <h3 className="text-foreground">9. Confidentiality</h3>
            <p>Participant agrees to keep confidential any non-public business information obtained through participation.</p>

            <h3 className="text-foreground">10. Indemnification</h3>
            <p>Participant agrees to indemnify, defend, and hold harmless Dance-Verse, Inc., its parents, affiliates, successors, assigns, officers, directors, employees, contractors, and agents from and against any and all claims, demands, actions, liabilities, damages, losses, judgments, settlements, costs, and expenses, including reasonable attorneys' fees, arising out of or related to any breach of this Agreement, misrepresentation, violation of law, infringement claim, ownership dispute, or misconduct by Participant.</p>

            <h3 className="text-foreground">11. Termination</h3>
            <p>Dance-Verse may terminate participation at any time in its sole discretion. Termination does not revoke licenses granted herein.</p>

            <h3 className="text-foreground">12. Force Majeure</h3>
            <p>Dance-Verse shall not be liable for delays or failures due to causes beyond its reasonable control.</p>

            <h3 className="text-foreground">13. Governing Law and Arbitration</h3>
            <p>This Agreement shall be governed by the laws of the State of California. Any dispute shall be resolved by binding arbitration in Orange County, California under the Commercial Arbitration Rules of the American Arbitration Association. The prevailing party shall be entitled to reasonable attorneys' fees and costs.</p>

            <h3 className="text-foreground">14. Severability</h3>
            <p>If any provision is found invalid, the remaining provisions shall remain enforceable.</p>

            <h3 className="text-foreground">15. Entire Agreement</h3>
            <p>This Agreement constitutes the entire understanding between Participant and Dance-Verse and supersedes all prior discussions.</p>

            <h3 className="text-foreground">17. Acknowledgment</h3>
            <p>By selecting "I Agree," Participant acknowledges that Participant has read this Agreement in its entirety, understands that substantial legal rights are being granted and waived, understands that the Content may be commercially exploited and used in connection with artificial intelligence and data-driven technologies, and voluntarily agrees to be bound by these Terms without reliance on any oral representations.</p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
