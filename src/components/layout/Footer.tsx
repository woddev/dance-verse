export default function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-6">
        <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-70">
          <div className="flex gap-8">
            <a href="#" className="hover:opacity-100 transition-opacity py-2 px-3">Contact Us</a>
            <a href="#" className="hover:opacity-100 transition-opacity py-2 px-3">Terms & Support</a>
            <a href="#" className="hover:opacity-100 transition-opacity py-2 px-3">Privacy Policy</a>
          </div>
          <p>&copy; {new Date().getFullYear()} Dance-Verse. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
