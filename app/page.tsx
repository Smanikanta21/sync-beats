"use client";
import { Music, PlayCircle, Users2, Menu, Radio, Smartphone, Headphones, MessageSquare, Mail, User, X } from 'lucide-react';
import { CiInstagram } from "react-icons/ci";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { useState } from 'react';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignUpPage';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showSignup, setShowSignup] = useState<boolean>(false);
  return (
    <>
      {showLogin ? (<div className='fixed md:inset-50 backdrop-blur-md bg-transparent z-50 flex items-center justify-center'>
        <div className='w-screen transition-all duration-150 ease-in-out'>
          <LoginPage setShowLogin={setShowLogin} setShowSignup={setShowSignup} />
        </div>
      </div>) : null}
      {showSignup ? (<div className='fixed md:inset-50 backdrop-blur-md bg-transparent z-50 flex items-center justify-center'>
        <div className='w-screen'>
          <SignupPage setShowLogin={setShowLogin} setShowSignup={setShowSignup} />
        </div>
      </div>) : null}
      <div className="fixed z-40 flex justify-center w-full pt-4">
        <div className="flex flex-col md:flex-row w-[90%] md:w-[60%] md:justify-baseline justify-between rounded-xl shadow-md md:gap-28 px-4 py-4 md:py-2 bg-white/5 backdrop-blur-lg text-white">
          <div className='md:hidden fixed top-3 left-3' onClick={() => { setIsMenuOpen(!isMenuOpen) }}>{isMenuOpen ? <X size={28} /> : <Menu size={28} />}</div>
          <div className='flex md:pl-0 pl-8 flex-row items-center justify-center gap-1'><Music className='text-[#00e5ff]' size={28} /><a href="#" className='font-bold text-lg'>Sync Beats</a></div>
          {isMenuOpen ? (<div className='flex-col flex md:flex-row items-center justify-center gap-4 md:mt-0 mt-4'>
            <a className='text-sm text-white/60 hover:scale-110 transition-all duration-120 cursor-pointer text-shadow-cyan-400 hover:text-shadow-2xs' href="#">Features</a>
            <a className='text-sm text-white/60 hover:scale-110 transition-all duration-120 cursor-pointer text-shadow-cyan-400 hover:text-shadow-2xs' href="#">About</a>
            <a className='text-sm text-white/60 hover:scale-110 transition-all duration-120 cursor-pointer text-shadow-cyan-400 hover:text-shadow-2xs' href="#">Contact</a>
          </div>) : null}

          <div className='flex flex-row md:items-center md:justify-center float-right gap-4'>
            <button className='hidden md:flex bg-gradient-to-br from-[#00e5ff] to-[#a78bfa] px-4 py-2 rounded-xl cursor-pointer text-black hover:scale-110 ease-in-out duration-135' onClick={() => { setShowSignup(!showSignup) }}>Sign Up</button>
            <button className='md:flex hidden bg-white/10 px-4 py-2 rounded-xl hover:scale-110 ease-in-out cursor-pointer duration-135' onClick={() => { setShowLogin(!showLogin) }}>Login</button>
          </div>
        </div>
      </div>
      <div className="relative pt-20">
        <section className="relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(rgba(10,11,18,0.75), rgba(10,11,18,0.9)), url(https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2400&auto=format&fit=crop)', backgroundSize: "cover", backgroundPosition: "center", }}>
          <div className="">
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
                {/* <a href="#" onClick={() => { setShowLogin(!showLogin) }} className="sb-btn sb-btn-primary">
                  Get started
                </a> */}
                <button onClick={() => { setShowSignup(!showSignup) }} className="sb-btn sb-btn-ghost">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Try the player
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className='md:px-38 px-8 mt-12'>
        <div className='w-full grid-cols-1 md:grid-cols-3 grid gap-4 md:gap-12'>
          <div className='flex flex-start flex-col rounded-xl gap-2 p-8 sb-glass'>
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
              <Radio className="h-5 w-5" />
            </div>
            <h1 className='font-bold'>Perfect Sync</h1>
            <p className='text-sm text-white/60'>Sub-second synchronization using clock alignment and drift correction, so every beat hits together.</p>
          </div>
          <div className='rounded-xl flex flex-start flex-col gap-2 p-8 sb-glass'>
            <div className='mb-3 inline-flex h-10 w-10 rounded-xl items-center justify-center bg-purple-500/20 text-purple-300'>
              <Users2 className='h-5 w-5' />
            </div>
            <h1 className='font-bold'>Invite & control</h1>
            <p className='text-sm text-white/60'>Host sessions, invite friends, and control playback from any device.</p>
          </div>
          <div className='rounded-xl flex flex-start flex-col gap-2 p-8 sb-glass'>
            <div className='mb-3 inline-flex h-10 w-10 rounded-xl items-center justify-center bg-yellow-500/20 text-yellow-300'>
              <Smartphone className='h-5 w-5' />
            </div>
            <h1 className='font-bold'>Cross-platform</h1>
            <p className='text-sm text-white/60'>Available on Android, iOS, Windows, and Mac. Sync your music across all your devices seamlessly.</p>
          </div>
        </div>
        <div className='w-full sb-glass rounded-xl mt-12 p-8 flex flex-col gap-4'>
          <h1 className='text-2xl font-bold'>How it works</h1>
          <p>Sync Beats uses a combination of clock synchronization and drift correction to ensure that all devices in a session are perfectly in sync. Here is how it works:</p>
          <ol className='list-decimal pl-6'>
            <li>When a session is started,  the host device sends its clock time to all connected devices.</li>
            <li>Each device adjusts its internal clock to match the {"host's"} clock.</li>
            <li>As music plays, devices continuously check their clock against the {"host's"} clock to detect any drift.</li>
            <li>If drift is detected, devices adjust their playback speed slightly to correct it.</li>
            <li>All devices play the same music at the same time, ensuring perfect synchronization.</li>
            <li>Users can control playback, pause, and skip tracks from any device, and all changes are reflected across the session.</li>
          </ol>
        </div>
        <div className='flex flex-col md:flex-row justify-between gap-4 mt-12 w-full sb-glass rounded-xl p-8'>
          <div className='flex flex-col gap-2'>
            <h1 className='font-bold text-xl'>Apple Music and Spotify support</h1>
            <p className='text-sm text-white/60'>Link your accounts to control playback and sync tracks across devices. Seamless switching and shared queues.</p>
          </div>
          <div className='flex flex-row gap-4'>
            <button className='sb-btn hover:cursor-pointer sb-btn-primary'>Open Player</button>
            <button className='sb-btn sb-btn-ghost hover:cursor-pointer'>Host Controls</button>
          </div>
        </div>
        <div className='flex md:flex-row flex-col gap-4 md:justify-between  mt-12 w-full rounded-xl'>
          <div className='sb-glass flex flex-col p-8 rounded-xl'>
            <div className='flex flex-row items-center gap-2 mb-4'>
              <div><Headphones className='text-cyan-300' /></div>
              <h1 className='text-xl font-bold'>Immersive audio</h1>
            </div>
            <p className='text-sm text-white/60'>High-quality playback that stays in sync — perfect for parties, workouts, and shared listening.</p>
          </div>
          <div className='sb-glass md:w-1/2 flex flex-col p-8 rounded-xl'>
            <div className='flex flex-row items-center gap-2 mb-4'>
              <div><Smartphone className='text-purple-300' /></div>
              <h1 className='text-xl font-bold'>Simple to join</h1>
            </div>
            <p className='text-sm text-white/60'>Open the app, pick a session, and you are in. No cables, no hassle.</p>
          </div>
        </div>
      </div>
      <div className='md:mx-40 mx-8 mt-12 rounded-xl'>
        <div className='flex flex-col md:flex-row justify-center'>
          <div className=" p-10 flex flex-col gap-6 sb-glass rounded-xl ">
            <h1 className="text-3xl font-bold text-white">Contact Me</h1>
            <p className="text-white/60">Have questions, feedback, or just want to say hi? Fill out the formbelow or reach me at{" "}
              <a href="mailto:siraprapuabhinay21@gmail.com" className="text-cyan-300 hover:underline">
                siraprapuabhinay21@gmail.com
              </a>
            </p>

            <form className="flex flex-col gap-4">
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <User className="text-cyan-300" size={20} />
                <input type="text" placeholder="Your Name" required className="bg-transparent w-full outline-none text-white placeholder-white/50" />
              </div>

              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <Mail className="text-purple-300" size={20} />
                <input type="email" placeholder="Your Email" required className="bg-transparent w-full outline-none text-white placeholder-white/50" />
              </div>

              <div className="flex items-start gap-2 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <MessageSquare className="text-yellow-300 mt-1" size={20} />
                <textarea placeholder="Your Message" required rows={4} className="bg-transparent w-full outline-none text-white placeholder-white/50 resize-none" />
              </div>

              <button type="submit" className="sb-btn sb-btn-primary hover:scale-105 transition-all cursor-pointer">Send Message</button>
            </form>
          </div>
        </div>
      </div>
      <footer className='sb-glass mt-12 rounded-xl p-8'>
        <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
          <div className='text-white/60 text-sm'>© 2025 Sync Beats. All rights reserved.</div>
          <div className='flex flex-row gap-4'>
            <a href="#" className='text-white/60 hover:text-cyan-300'>Privacy Policy</a>
            <a href="#" className='text-white/60 hover:text-cyan-300'>Terms of Service</a>
          </div>
        </div>
      </footer>
    </>
  );
}
