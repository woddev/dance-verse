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
            Producer Submission &amp; Option Agreement
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
              This Producer Submission &amp; Option Agreement ("Agreement") is entered into as of the date of electronic acceptance ("Effective Date") by and between Dance-Verse, Inc., a California corporation with its principal place of business at 111 North Harbor Blvd, Suite B, Fullerton, California 92832 ("Company"), and the undersigned individual or entity ("Producer").
            </p>

            <h3 className="text-foreground">1. Definitions</h3>
            <p>"Work" means any musical compositions, master recordings, beats, instrumentals, stems, session files, MIDI files, sound recordings, audiovisual elements, metadata, and related materials submitted by Producer.</p>
            <p>"Option Period" means the thirty (30) day period commencing upon Company's confirmed receipt of the Work.</p>

            <h3 className="text-foreground">2. Submission</h3>
            <p>Producer hereby submits the Work to Company for evaluation and potential commercial exploitation.</p>
            <p>Submission of the Work does not obligate Company to exploit, release, distribute, finance, or otherwise use the Work.</p>

            <h3 className="text-foreground">3. Ownership</h3>
            <p>Producer retains all right, title, and interest in and to the Work unless and until such rights are transferred pursuant to a subsequent written agreement executed by both parties.</p>
            <p>No license, assignment, or transfer of ownership is granted under this Agreement.</p>

            <h3 className="text-foreground">4. Exclusive Option</h3>
            <p>Producer hereby grants Company an exclusive option during the Option Period to enter into one or more definitive agreements with respect to the Work.</p>
            <p>During the Option Period, Producer shall not:</p>
            <p className="pl-4">(a) grant, assign, license, or otherwise transfer any rights in the Work to any third party; or</p>
            <p className="pl-4">(b) enter into any agreement that conflicts with Company's option rights.</p>

            <h3 className="text-foreground">5. Election Notice</h3>
            <p>At any time during the Option Period, Company may elect, in its sole discretion, to proceed with one of the following transactions (the "Election"):</p>
            <p className="pl-4">(a) Work-for-Hire &amp; Assignment Agreement</p>
            <p className="pl-4">(b) Co-Publishing Agreement</p>
            <p className="pl-4">(c) Co-Publishing Agreement with Advance &amp; Recoupment</p>
            <p className="pl-4">(d) Declination of the Work</p>
            <p>Company shall communicate such Election in writing ("Election Notice").</p>
            <p>No rights shall be transferred unless and until a definitive agreement corresponding to the Election is executed.</p>

            <h3 className="text-foreground">6. AI, Data, and Technological Use</h3>
            <p>Producer acknowledges and agrees that Company may analyze the Work using artificial intelligence, machine learning, audio recognition, and data analytics systems for internal purposes, including but not limited to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Evaluation and forecasting</li>
              <li>Platform development</li>
              <li>Recommendation systems</li>
              <li>Product development and testing</li>
            </ul>
            <p>Company may extract metadata, sonic characteristics, structural components, tempo, harmonic information, and engagement metrics.</p>
            <p>Company shall not commercially release, distribute, or exploit the Work without a subsequent executed agreement.</p>
            <p>Company shall not create or commercially release works falsely attributed to Producer without Producer's prior written consent.</p>
            <p>All AI models, datasets, analytical outputs, and technological systems derived from such analysis shall be exclusively owned by Company.</p>

            <h3 className="text-foreground">7. Representations and Warranties</h3>
            <p>Producer represents and warrants that:</p>
            <p className="pl-4">(a) Producer owns or controls all rights in the Work;</p>
            <p className="pl-4">(b) the Work does not infringe any third-party rights;</p>
            <p className="pl-4">(c) all collaborators have executed written agreements reflecting ownership splits;</p>
            <p className="pl-4">(d) the Work is free of liens, encumbrances, or prior conflicting grants.</p>
            <p>Producer shall indemnify and hold harmless Company from any claims arising from breach of the foregoing.</p>

            <h3 className="text-foreground">8. Termination</h3>
            <p>If Company does not issue an Election Notice within the Option Period, this Agreement shall automatically terminate, and Producer shall be free to exploit the Work without restriction.</p>

            <h3 className="text-foreground">9. Governing Law; Dispute Resolution</h3>
            <p>This Agreement shall be governed by the laws of the State of California.</p>
            <p>Any dispute shall be resolved by binding arbitration in Orange County, California pursuant to the rules of the American Arbitration Association.</p>

            <h3 className="text-foreground">10. Miscellaneous</h3>
            <p>This Agreement constitutes the entire understanding between the parties with respect to the subject matter hereof and may be modified only in writing signed by both parties.</p>

            <h3 className="text-foreground">Acknowledgment</h3>
            <p>By selecting "I Agree," Producer acknowledges having read this Agreement in its entirety, understands its terms including the exclusive option grant and AI/data usage provisions, and voluntarily agrees to be bound by this Agreement.</p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
