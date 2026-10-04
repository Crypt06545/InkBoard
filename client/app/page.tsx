import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import DemoBoard from "@/components/home/DemoBoard";
import ToolsStrip from "@/components/home/Toolsstrip";
import Features from "@/components/home/Features";
import CallToAction from "@/components/home/Calltoaction";
import Footer from "@/components/common/Footer";

export const metadata: Metadata = {
  title: "Inkboard: think together on one infinite canvas",
  description:
    "A real-time collaborative whiteboard with AI. Sketch, write and map ideas with your team.",
};

const HomePage = () => (
  <div
    id="top"
    className="home min-h-screen bg-hb-bg font-display text-hb-ink antialiased"
  >
    {/* the navbar is a direct child of the page wrapper (no overflow set), so sticky works everywhere */}
    <Navbar />
    <main>
      <Hero />
      <DemoBoard />
      <ToolsStrip />
      <Features />
      <CallToAction />
    </main>
    <Footer />
  </div>
);

export default HomePage;
