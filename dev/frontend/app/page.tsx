import { Mail, MapPin } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { InstagramIcon } from "../components/InstagramFollowButton";
import { MouseGradient } from "../components/MouseGradient";
import { FeaturesExplanation } from "../components/FeaturesExplanation";
import { CircularJoinRing } from "../components/CircularJoinRing";
import { HowItWorksScroll } from "../components/HowItWorksScroll";
import { LandingNavbar } from "../components/LandingNavbar";
import { ContactForm } from "../components/ContactForm";
import { LandingFooterLinks } from "../components/LandingFooterLinks";

export default function LandingPage() {
  return (
    <div className={cn('w-full', 'bg-transparent', 'text-foreground', 'overflow-x-clip', 'font-sans', 'relative', 'selection:bg-foreground', 'selection:text-background', 'custom-scrollbar')}>
      
      {/* Dynamic Instant Ambient Background */}
      <MouseGradient />

      {/* Dynamic Snapping Navbar Wrapper */}
      <LandingNavbar />

      {/* SECTION 1: Central Immersive Core */}
      <section className={cn('relative', 'z-10', 'w-full', 'min-h-dvh', 'md:snap-start', 'md:snap-always', 'shrink-0', 'flex', 'flex-col', 'items-center', 'justify-center', 'px-4', 'pt-28', 'pb-16', 'md:py-24')}>
        
        {/* Massive Typography Behind — Server-rendered for SEO */}
        <div className={cn('absolute', 'inset-0', 'flex', 'items-center', 'justify-center', 'pointer-events-none', 'opacity-[0.03]', 'dark:opacity-5', 'select-none', 'overflow-hidden')}>
          <h1 className={cn('text-[18vw]', 'md:text-[25vw]', 'font-black', 'tracking-tighter', 'leading-none', 'whitespace-nowrap', 'blur-[1px]')}>SPATIAL</h1>
        </div>

        {/* SEO-visible description — visually hidden but crawlable */}
        <div className="sr-only">
          <h2>SyncBeats — Synchronized Music Playback Across Multiple Devices</h2>
          <p>
            SyncBeats lets you play the same song on multiple phones, tablets, and laptops in perfect sync — under 25 milliseconds of latency.
            Create a room, share the code, and turn every device into a speaker. Free, no app download required.
            Features include spatial audio routing, NTP-style clock synchronization, drag-and-drop surround sound positioning,
            queue management, and WebTorrent P2P file sharing. Works on iOS, Android, macOS, Windows, and Linux.
            The best AmpMe and BeatSync alternative for synchronized group listening parties.
          </p>
        </div>

        {/* The Core Ring UI */}
        <CircularJoinRing className="mb-6 md:mb-10" />

        {/* Scroll Hint */}
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-20">
          <span className={cn('text-[10px]', 'font-bold', 'uppercase', 'tracking-widest', 'text-foreground/40')}>Scroll to explore</span>
          <div className="w-5 h-8 rounded-full border-2 border-foreground/15 flex justify-center pt-1 animate-bounce">
            <div className="w-1 h-2 rounded-full bg-foreground/30" />
          </div>
        </div>

      </section>

      {/* SECTION 2: How It Works (Lenis Scroll-Driven Interactive Animation) */}
      <HowItWorksScroll />

      {/* SECTION 3: GSAP Features Deep Dive */}
      <FeaturesExplanation />

      {/* SECTION 4: Footer CTA & Contact */}
      <section className={cn('relative', 'z-10', 'w-full', 'flex', 'flex-col', 'items-center', 'justify-between', 'px-4', 'sm:px-6', 'py-16', 'md:py-24')}>
        
        {/* Contact Section */}
        <div id="contact" className={cn('max-w-7xl', 'mx-auto', 'w-full', 'mt-12', 'md:mt-24', 'mb-12', 'flex', 'flex-col', 'gap-8', 'md:gap-12')}>
           <div className="text-center">
             <h2 className={cn('text-3xl', 'md:text-5xl', 'font-black', 'tracking-tight', 'mb-3', 'md:mb-4')}>Contact Us</h2>
             <p className={cn('text-foreground/50', 'font-medium', 'text-sm', 'md:text-base', 'max-w-2xl', 'mx-auto')}>Have questions, feedback, or need support? We'd love to hear from you.</p>
           </div>
           
           <div className={cn('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6', 'md:gap-8')}>
             {/* Contact Info — Server-rendered static content */}
             <div className={cn('glass-panel', 'p-6', 'md:p-12', 'rounded-3xl', 'md:rounded-[2.5rem]', 'border', 'border-foreground/10', 'flex', 'flex-col', 'justify-center', 'shadow-lg', 'hover:bg-background/20', 'dark:hover:bg-black/20', 'hover:backdrop-blur-3xl', 'hover:shadow-2xl', 'transition-all', 'duration-500')}>
               <h3 className={cn('text-xl', 'md:text-2xl', 'font-bold', 'mb-6', 'md:mb-8')}>Get in touch</h3>
               <div className="space-y-6">
                 <div className={cn('flex', 'items-center', 'gap-4')}>
                   <div className={cn('w-10', 'h-10', 'md:w-12', 'md:h-12', 'rounded-full', 'bg-foreground/5', 'flex', 'items-center', 'justify-center', 'shrink-0')}>
                     <Mail className={cn('w-5', 'h-5', 'text-foreground/80')} />
                   </div>
                   <div>
                     <p className={cn('text-[10px]', 'md:text-xs', 'font-bold', 'uppercase', 'tracking-widest', 'text-foreground/50', 'mb-0.5')}>Email</p>
                     <a href="mailto:support@syncbeats.in" className={cn('text-base', 'md:text-lg', 'font-bold', 'hover:opacity-80', 'transition-opacity')}>support@syncbeats.in</a>
                   </div>
                 </div>
                 <div className={cn('flex', 'items-center', 'gap-4')}>
                   <div className={cn('w-10', 'h-10', 'md:w-12', 'md:h-12', 'rounded-full', 'bg-foreground/5', 'flex', 'items-center', 'justify-center', 'shrink-0')}>
                     <MapPin className={cn('w-5', 'h-5', 'text-foreground/80')} />
                   </div>
                   <div>
                     <p className={cn('text-[10px]', 'md:text-xs', 'font-bold', 'uppercase', 'tracking-widest', 'text-foreground/50', 'mb-0.5')}>Location</p>
                     <p className={cn('text-base', 'md:text-lg', 'font-bold')}>India</p>
                   </div>
                 </div>
                 <div className={cn('flex', 'items-center', 'gap-4')}>
                   <div className={cn('w-10', 'h-10', 'md:w-12', 'md:h-12', 'rounded-full', 'bg-foreground/5', 'flex', 'items-center', 'justify-center', 'shrink-0')}>
                     <InstagramIcon className={cn('w-5', 'h-5', 'text-foreground/80')} />
                   </div>
                   <div>
                     <p className={cn('text-[10px]', 'md:text-xs', 'font-bold', 'uppercase', 'tracking-widest', 'text-foreground/50', 'mb-0.5')}>Instagram</p>
                     <a href="https://www.instagram.com/syncbeats.in/" target="_blank" rel="noopener noreferrer" className={cn('text-base', 'md:text-lg', 'font-bold', 'hover:opacity-80', 'transition-opacity')}>@syncbeats.in</a>
                   </div>
                 </div>
               </div>
             </div>

             {/* Contact Form — Client component */}
             <ContactForm />
           </div>
        </div>

        {/* Footer — Server-rendered with client links */}
        <footer className={cn('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8', 'w-full', 'flex', 'flex-col', 'md:flex-row', 'items-center', 'justify-between', 'pt-8', 'mt-6', 'md:mt-12', 'text-xs', 'font-bold', 'uppercase', 'tracking-widest', 'text-foreground/75', 'border-t', 'border-foreground/5')}>
           <div className={cn('flex', 'items-center', 'gap-3', 'mb-4', 'md:mb-0')}>
             <Image src="/syncbeats-icon.svg" alt="Logo" width={20} height={20} className="opacity-50 grayscale block" />
             SYNCBEATS © {new Date().getFullYear()}
           </div>
           <LandingFooterLinks />
        </footer>
      </section>

    </div>
  );
}
