import { Music, PlayCircle,Menu } from 'lucide-react';
import Link from 'next/link'

export default function LandingPage() {
  return (
    <>
      <div className="fixed z-50 flex justify-center w-full pt-4">
        <div className="flex flex-row w-[90%] md:w-[80%] md:justify-around justify-between rounded-xl shadow-md md:gap-28 px-4 md:px-0 py-4 md:py-2 bg-white/5 backdrop-blur-lg text-white">
          <div className='md:hidden fixed top-6 left-3'><Menu size={28}/></div>
          <div className='flex md:pl-0 pl-8 flex-row items-center justify-center gap-1'><Music className='text-[#00e5ff]' size={28} /><a href="#" className='font-bold text-lg'>Sync Beats</a></div>
          <div className='hidden md:flex flex-row items-center justify-center gap-4'>
            <a href="#">About</a>
            <a href="#">Features</a>
            <a href="#">Contact</a>
          </div>
          <div className='flex flex-row md:items-center md:justify-center float-right gap-4'>
            <a href="#" className='md:flex hidden bg-[#67F7F7] px-4 py-2 rounded-lg text-black font-semibold'>Sign Up</a>
            <a href="#" className='md:flex hidden bg-transparent border border-white/20 px-4 py-2 rounded-lg text-white font-semibold'>Login</a>
            <a href="#" className='md:hidden bg-transparent border border-white/20 px-3.5 py-2 rounded-lg text-white flex justify-center items-center'>GetStarted</a>
          </div>
        </div>
      </div>
      <div className="relative pt-20">
        <section className="relative overflow-hidden" style={{backgroundImage:'linear-gradient(rgba(10,11,18,0.75), rgba(10,11,18,0.9)), url(https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2400&auto=format&fit=crop)',backgroundSize: "cover",backgroundPosition: "center",}}>
          <div className="absolute inset-0">
            <div className="sb-spotlight inset-0" />
          </div>
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-28 lg:py-36">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80">
                <Music className="h-4 w-4 text-cyan-300" />
                Play music everywhere in sync
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl sb-neon-text">
                Sync Beats
              </h1>
              <p className="mt-5 max-w-2xl text-balance text-white/80 md:text-lg">
                A cross-platform music synchronization platform for Android, iOS, Windows, and Mac.
                Stream from Apple Music or Spotify and keep every device perfectly in time.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                <Link href="/connect" className="sb-btn sb-btn-primary">
                  Get started
                </Link>
                <Link href="/player" className="sb-btn sb-btn-ghost">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Try the player
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div>

      </div>
      </>
      );
}
