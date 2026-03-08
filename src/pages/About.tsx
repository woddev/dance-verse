import Navbar from "@/components/layout/Navbar";

const About = () => {
  return (
    <div className="min-h-screen bg-foreground text-background">
      <Navbar />
      <section className="py-24 pt-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="flex justify-center mb-8">
              <iframe
                width="672"
                height="378"
                src="https://www.youtube.com/embed/4AIpNR9JA3s"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg shadow-2xl max-w-full"
              />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-8">About Dance-Verse</h1>
            <div className="space-y-6 text-lg lg:text-xl leading-relaxed">
              <p>Welcome to the new era of dance — where your moves don't just inspire, they earn.</p>
              <p>
                We're building a platform that empowers dancers to turn their creativity and influence into real income. By joining our community, you'll get exclusive access to paid campaigns from major label music artists, brands, and entertainment companies — all looking for dancers like you to bring their projects to life through movement.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
