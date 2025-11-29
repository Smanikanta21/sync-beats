"use client";
import { useState, useEffect } from 'react';
import { Music, Menu, X, Radio, Wifi, ArrowRight, Smartphone, Monitor, Laptop, Moon, Sun, PlayCircle, Users2, Zap, Share2, Globe, CheckCircle2 } from 'lucide-react';
// import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
// import { useRouter } from 'next/navigation';
// import SignUpPage from './components/SignUpPage';
import LoginPage from './components/LoginPage';
import { useTheme } from './context/ThemeContext';
import SignupPage from './components/SignUpPage';

export default function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const [showLogin, setShowLogin] = useState<boolean>(false);
    const [showSignup, setShowSignup] = useState<boolean>(false);
    // const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    // const { scrollY } = useScroll();
    // const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);
    // const headerY = useTransform(scrollY, [0, 100], [-20, 0]);

    useEffect(() => {
        if (showLogin || showSignup) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
    }, [showLogin, showSignup]);

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="min-h-screen bg-[var(--sb-bg)] text-[var(--sb-text-main)] selection:bg-[var(--sb-primary)] selection:text-white overflow-x-hidden font-sans">

            {/* Modals */}
            <AnimatePresence>
                {showLogin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4'
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className='w-full max-w-md relative'
                        >
                            <button
                                onClick={() => setShowLogin(false)}
                                className="absolute -top-12 right-0 text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <LoginPage setShowLogin={setShowLogin} setShowSignup={setShowSignup} />
                        </motion.div>
                    </motion.div>
                )}

                {showSignup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4'
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className='w-full max-w-md relative'
                        >
                            <button
                                onClick={() => setShowSignup(false)}
                                className="absolute -top-12 right-0 text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <SignupPage setShowLogin={setShowLogin} setShowSignup={setShowSignup} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navbar */}
            <motion.nav
                className="fixed top-0 left-0 right-0 z-40 px-6 py-6 flex justify-center"
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="glass-panel rounded-full px-8 py-4 flex items-center justify-between w-full max-w-6xl transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--sb-primary)] to-[var(--sb-secondary)] flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary-glow),0.5)]">
                            <Wifi className="text-white" size={20} />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Sync Beats</span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors">Features</a>
                        <a href="#platforms" className="text-sm font-medium text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors">Platforms</a>
                        <a href="#how-it-works" className="text-sm font-medium text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors">How it Works</a>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                        <button
                            onClick={() => setShowLogin(true)}
                            className="text-sm font-medium hover:text-[var(--sb-primary)] transition-colors"
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => setShowSignup(true)}
                            className="btn-primary px-6 py-2.5 rounded-full text-sm shadow-lg shadow-blue-500/20"
                        >
                            Get Started
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)]"
                        >
                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                        <button
                            className="p-2 text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)]"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-30 bg-[var(--sb-bg)] pt-32 px-6 md:hidden"
                    >
                        <div className="flex flex-col gap-8 text-center">
                            <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold">Features</a>
                            <a href="#platforms" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold">Platforms</a>
                            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-2xl font-bold">How it Works</a>
                            <hr className="border-[var(--sb-border)] my-4" />
                            <button onClick={() => { setShowLogin(true); setIsMenuOpen(false) }} className="text-xl font-medium">Log in</button>
                            <button onClick={() => { setShowSignup(true); setIsMenuOpen(false) }} className="btn-primary py-4 rounded-xl text-xl font-bold">Get Started</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center text-center mt-20 px-6 pt-20 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--sb-primary)] opacity-[0.15] blur-[120px] rounded-full pointer-events-none animate-pulse-glow" />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--sb-secondary)] opacity-[0.1] blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--sb-primary)]/30 bg-[var(--sb-primary)]/10 mb-8 backdrop-blur-md"
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--sb-primary)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--sb-primary)]"></span>
                        </span>
                        <span className="text-xs font-bold tracking-wide uppercase text-[var(--sb-primary)]">Sync Everything</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
                    >
                        AirPlay for the <br />
                        <span className="text-gradient-primary glow-text">rest of us.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="text-lg md:text-xl text-[var(--sb-text-muted)] max-w-2xl mx-auto mb-12 leading-relaxed"
                    >
                        Seamlessly synchronize music across Android, iOS, Windows, and Mac. <br className="hidden md:block" /> No ecosystem lock-in. Just perfect harmony.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto"
                    >
                        <button onClick={() => setShowSignup(true)} className="btn-primary px-8 py-4 rounded-full text-lg flex items-center gap-3 w-full sm:w-auto justify-center group">
                            <PlayCircle size={20} className="fill-white/20" />
                            Start Syncing Now
                        </button>
                        <button className="btn-secondary px-8 py-4 rounded-full text-lg flex items-center gap-3 w-full sm:w-auto justify-center group">
                            Watch Demo
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </div>

                {/* Hero Visual - Connected Devices */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="mt-24 relative w-full max-w-6xl mx-auto h-[400px] md:h-[500px]"
                >
                    {/* Central Hub */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#0a0b12] border border-[var(--sb-primary)] shadow-[0_0_60px_rgba(59,130,246,0.4)] flex items-center justify-center relative animate-pulse-glow">
                            <Wifi size={48} className="text-[var(--sb-primary)]" />
                            {/* Orbiting dots */}
                            <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-[var(--sb-primary)]/30 w-[150%] h-[150%] -left-1/4 -top-1/4"></div>
                        </div>
                    </div>

                    {/* Floating Devices */}
                    <motion.div className="absolute top-10 left-10 md:left-1/4 animate-float" style={{ animationDelay: '0s' }}>
                        <div className="glass-card p-4 rounded-2xl flex flex-col items-center gap-2 w-32 border-[var(--sb-primary)]/20">
                            <Smartphone size={32} className="text-[var(--sb-text-muted)]" />
                            <span className="text-xs font-mono text-[var(--sb-primary)]">iPhone 15</span>
                        </div>
                    </motion.div>

                    <motion.div className="absolute bottom-20 right-10 md:right-1/4 animate-float" style={{ animationDelay: '2s' }}>
                        <div className="glass-card p-4 rounded-2xl flex flex-col items-center gap-2 w-40 border-[var(--sb-secondary)]/20">
                            <Laptop size={32} className="text-[var(--sb-text-muted)]" />
                            <span className="text-xs font-mono text-[var(--sb-secondary)]">MacBook Pro</span>
                        </div>
                    </motion.div>

                    <motion.div className="absolute top-20 right-4 md:right-1/3 animate-float" style={{ animationDelay: '1s' }}>
                        <div className="glass-card p-4 rounded-2xl flex flex-col items-center gap-2 w-32 border-[var(--sb-accent)]/20">
                            <Smartphone size={32} className="text-[var(--sb-text-muted)]" />
                            <span className="text-xs font-mono text-[var(--sb-accent)]">Pixel 8</span>
                        </div>
                    </motion.div>

                    <motion.div className="absolute bottom-10 left-4 md:left-1/3 animate-float" style={{ animationDelay: '3s' }}>
                        <div className="glass-card p-4 rounded-2xl flex flex-col items-center gap-2 w-40 border-[var(--sb-primary)]/20">
                            <Monitor size={32} className="text-[var(--sb-text-muted)]" />
                            <span className="text-xs font-mono text-[var(--sb-primary)]">Windows PC</span>
                        </div>
                    </motion.div>

                    {/* Connecting Lines (Visual only) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                        <line x1="50%" y1="50%" x2="25%" y2="20%" stroke="url(#grad1)" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="75%" y2="80%" stroke="url(#grad2)" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="66%" y2="20%" stroke="url(#grad3)" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="33%" y2="80%" stroke="url(#grad1)" strokeWidth="2" />
                        <defs>
                            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--sb-primary)" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--sb-secondary)" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                            <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--sb-accent)" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                        </defs>
                    </svg>
                </motion.div>
            </section>

            {/* Platform Grid */}
            <section id="platforms" className="py-32 px-6 relative bg-[var(--sb-surface-1)]">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-20"
                    >
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Works on <span className="text-gradient-primary">everything.</span></h2>
                        <p className="text-[var(--sb-text-muted)] text-lg max-w-2xl mx-auto">
                            Don&apos;t let your OS dictate your music. Sync Beats bridges the gap between ecosystems.
                        </p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        {[
                            { name: "iOS", icon: <Smartphone />, color: "var(--sb-primary)" },
                            { name: "Android", icon: <Smartphone />, color: "var(--sb-accent)" },
                            { name: "Windows", icon: <Monitor />, color: "var(--sb-primary)" },
                            { name: "macOS", icon: <Laptop />, color: "var(--sb-secondary)" }
                        ].map((platform, i) => (
                            <motion.div
                                key={i}
                                variants={fadeInUp}
                                className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center gap-4 group hover:bg-[var(--sb-surface-2)] transition-colors cursor-default"
                            >
                                <div className="p-4 rounded-full bg-[var(--sb-surface-3)] group-hover:scale-110 transition-transform duration-300" style={{ color: platform.color }}>
                                    {platform.icon}
                                </div>
                                <span className="font-bold text-lg">{platform.name}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="glass-card p-10 rounded-3xl md:col-span-2 relative overflow-hidden group neon-border"
                        >
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 scale-150">
                                <Zap size={300} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--sb-primary)]/10 border border-[var(--sb-primary)]/20 text-[var(--sb-primary)] flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                                    <Zap size={28} />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Zero Latency Engine</h3>
                                <p className="text-[var(--sb-text-muted)] text-lg max-w-lg leading-relaxed">
                                    Our proprietary clock synchronization algorithm ensures every device is aligned within <span className="text-[var(--sb-text-main)] font-semibold">2 milliseconds</span>. Drift correction happens automatically in the background, so the beat never drops.
                                </p>
                            </div>
                        </motion.div>

                        {/* Feature 2 */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="glass-card p-10 rounded-3xl relative overflow-hidden group"
                        >
                            <div className="absolute bottom-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                                <Music size={200} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--sb-secondary)]/10 border border-[var(--sb-secondary)]/20 text-[var(--sb-secondary)] flex items-center justify-center mb-8">
                                    <Share2 size={28} />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Any Source</h3>
                                <p className="text-[var(--sb-text-muted)] leading-relaxed">
                                    Spotify, Apple Music, YouTube Music, or local files. If it plays audio, we can sync it.
                                </p>
                            </div>
                        </motion.div>

                        {/* Feature 3 */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="glass-card p-10 rounded-3xl relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                                <Users2 size={200} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--sb-accent)]/10 border border-[var(--sb-accent)]/20 text-[var(--sb-accent)] flex items-center justify-center mb-8">
                                    <Users2 size={28} />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">Party Mode</h3>
                                <p className="text-[var(--sb-text-muted)] leading-relaxed">
                                    Let guests vote on the queue or take over DJ duties. Perfect for house parties and road trips.
                                </p>
                            </div>
                        </motion.div>

                        {/* Feature 4 */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                            className="glass-card p-10 rounded-3xl md:col-span-2 relative overflow-hidden group"
                        >
                            <div className="absolute bottom-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 scale-150">
                                <Wifi size={300} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center mb-8">
                                    <Globe size={28} />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">No Internet? No Problem.</h3>
                                <p className="text-[var(--sb-text-muted)] text-lg max-w-lg leading-relaxed">
                                    Sync Beats works over local Wi-Fi or by creating a hotspot. Take the party to the beach, the woods, or anywhere off the grid.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section id="how-it-works" className="py-32 px-6 bg-[var(--sb-surface-1)]">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-20"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Sync in seconds</h2>
                        <p className="text-[var(--sb-text-muted)]">No complex setup. It just works.</p>
                    </motion.div>

                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--sb-primary)] via-[var(--sb-secondary)] to-transparent hidden md:block"></div>

                        <div className="space-y-12">
                            {[
                                {
                                    step: "01",
                                    title: "Host",
                                    desc: "Open the app on your main device. It becomes the master clock.",
                                    icon: <Radio size={24} />
                                },
                                {
                                    step: "02",
                                    title: "Join",
                                    desc: "Scan the QR code with any other device to connect instantly.",
                                    icon: <Smartphone size={24} />
                                },
                                {
                                    step: "03",
                                    title: "Play",
                                    desc: "Hit play. Audio starts simultaneously on all devices.",
                                    icon: <PlayCircle size={24} />
                                }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: i * 0.2 }}
                                    className={`flex flex-col md:flex-row gap-8 items-center ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                                >
                                    <div className="flex-1 w-full">
                                        <div className="glass-card p-8 rounded-2xl hover:border-[var(--sb-primary)] transition-colors group">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-3 rounded-xl bg-[var(--sb-surface-2)] text-[var(--sb-primary)] group-hover:text-white group-hover:bg-[var(--sb-primary)] transition-colors">
                                                    {item.icon}
                                                </div>
                                                <h3 className="text-xl font-bold">{item.title}</h3>
                                            </div>
                                            <p className="text-[var(--sb-text-muted)]">{item.desc}</p>
                                        </div>
                                    </div>

                                    {/* Number Bubble */}
                                    <div className="w-16 h-16 rounded-full bg-[var(--sb-bg)] border border-[var(--sb-border)] flex items-center justify-center font-bold text-xl z-10 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative">
                                        <div className="absolute inset-0 rounded-full bg-[var(--sb-primary)]/20 animate-pulse"></div>
                                        {item.step}
                                    </div>

                                    <div className="flex-1 hidden md:block"></div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6 text-center overflow-hidden">
                <div className="max-w-5xl mx-auto relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--sb-primary)] to-[var(--sb-secondary)] opacity-20 blur-[100px] rounded-full pointer-events-none"></div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative z-10 glass-card rounded-3xl p-12 md:p-24 border-[var(--sb-primary)]/30"
                    >
                        <h2 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">Ready to <span className="text-gradient-primary">amplify?</span></h2>
                        <p className="text-xl text-[var(--sb-text-muted)] mb-12 max-w-2xl mx-auto">
                            Turn every device in the room into a speaker system. Experience the future of shared audio today.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button onClick={() => setShowSignup(true)} className="btn-primary px-12 py-5 rounded-full text-xl font-bold shadow-xl shadow-[var(--sb-primary)]/20 hover:shadow-[var(--sb-primary)]/40 transition-shadow w-full sm:w-auto">
                                Get Started for Free
                            </button>
                        </div>
                        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-[var(--sb-text-muted)]">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-[var(--sb-success)]" />
                                <span>No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-[var(--sb-success)]" />
                                <span>Free forever plan</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-[var(--sb-border)] bg-[var(--sb-bg)]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--sb-surface-3)] flex items-center justify-center">
                            <Wifi size={16} className="text-[var(--sb-text-muted)]" />
                        </div>
                        <span className="font-bold text-lg text-[var(--sb-text-muted)]">Sync Beats</span>
                    </div>

                    <div className="flex gap-8 text-sm text-[var(--sb-text-muted)]">
                        <a href="#" className="hover:text-[var(--sb-text-main)] transition-colors">Privacy</a>
                        <a href="#" className="hover:text-[var(--sb-text-main)] transition-colors">Terms</a>
                        <a href="#" className="hover:text-[var(--sb-text-main)] transition-colors">Twitter</a>
                        <a href="#" className="hover:text-[var(--sb-text-main)] transition-colors">GitHub</a>
                    </div>

                    <div className="text-sm text-[var(--sb-text-muted)]">
                        © 2025 Sync Beats.
                    </div>
                </div>
            </footer>
        </div>
    );
}
