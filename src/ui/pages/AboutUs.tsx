import React from 'react';
import { ArrowRight, GraduationCap, Target, Users, Sparkles, Lightbulb, CheckCircle, Monitor, Layout, Code2, CheckCheck, Trash2, Send, ShieldCheck, AlertCircle, Rocket } from "lucide-react";
import { Link } from 'react-router-dom';

const AboutUs: React.FC = () => {
    return (
        <div>
            {/* ========================================== */}
            {/* ABOUT US HEADER */}
            {/* ========================================== */}
            {/* ========================================== */}
            {/* ABOUT US SECTION */}
            {/* ========================================== */}
            <section
                id="about"
                className="py-20 sm:py-24 bg-slate-50/50 dark:bg-slate-900"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6">

                    {/* Header */}
                    <div className="text-center max-w-3xl mx-auto mb-12">

                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                            About Us
                        </span>

                        <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                            Making Learning More
                            <span className="text-indigo-600 dark:text-indigo-400">
                                {" "}Structured & Accessible
                            </span>
                        </h2>

                        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            We are building a technology-driven learning platform that helps
                            schools, academies, instructors, and students create better
                            learning experiences through simple and practical digital tools.
                        </p>

                    </div>


                    {/* Main About Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Mission */}
                        <article className="bg-white dark:bg-slate-800/60 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all duration-300">

                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Target className="w-6 h-6" />
                            </div>

                            <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                                Our Mission
                            </h3>

                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Our mission is to make education technology easier to use,
                                helping educators manage learning while giving students the
                                structure and tools they need to succeed.
                            </p>

                        </article>


                        {/* Vision */}
                        <article className="bg-white dark:bg-slate-800/60 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all duration-300">

                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Lightbulb className="w-6 h-6" />
                            </div>

                            <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                                Our Vision
                            </h3>

                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                We envision a future where schools, instructors, and learners
                                can use technology to connect, collaborate, track progress,
                                and create meaningful learning outcomes.
                            </p>

                        </article>


                        {/* Our Approach */}
                        <article className="bg-white dark:bg-slate-800/60 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700/60 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all duration-300">

                            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <Users className="w-6 h-6" />
                            </div>

                            <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                                People First
                            </h3>

                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                We design around the people who use our platform. Every
                                feature is built with simplicity, accessibility, and the
                                everyday needs of educators and learners in mind.
                            </p>

                        </article>

                    </div>


                    {/* What We Do */}
                    <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Left */}
                        <div className="bg-indigo-600 rounded-3xl p-7 sm:p-9 text-white relative overflow-hidden">

                            <div className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-white/10 blur-3xl" />

                            <div className="relative">

                                <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-200">
                                    What We Do
                                </span>

                                <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold">
                                    Connecting education with technology.
                                </h3>

                                <p className="mt-4 text-sm text-indigo-100 leading-relaxed max-w-xl">
                                    Our platform brings together the essential tools needed to
                                    organize courses, onboard instructors, manage students,
                                    monitor learning progress, and create structured educational
                                    programs.
                                </p>

                                <div className="mt-7 grid grid-cols-2 gap-3">

                                    <div className="rounded-xl bg-white/10 border border-white/10 p-4">
                                        <GraduationCap className="w-5 h-5 text-white mb-3" />
                                        <p className="text-sm font-bold">
                                            Learning
                                        </p>
                                        <p className="mt-1 text-xs text-indigo-200">
                                            Structured courses & progress
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-white/10 border border-white/10 p-4">
                                        <Users className="w-5 h-5 text-white mb-3" />
                                        <p className="text-sm font-bold">
                                            Communities
                                        </p>
                                        <p className="mt-1 text-xs text-indigo-200">
                                            Students & instructors
                                        </p>
                                    </div>

                                </div>

                            </div>
                        </div>


                        {/* Right */}
                        <div className="bg-white dark:bg-slate-800/60 rounded-3xl p-7 sm:p-9 border border-slate-200 dark:border-slate-700/60">

                            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                                What We Believe
                            </span>

                            <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                                Technology should make things simpler.
                            </h3>

                            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Education already comes with enough complexity. Technology
                                should reduce that complexity rather than add to it.
                            </p>

                            <div className="mt-7 space-y-5">

                                <div className="flex items-start gap-4">
                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Simple by Design
                                        </h4>

                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                                            Clear tools and workflows that are easy to understand
                                            and use.
                                        </p>
                                    </div>
                                </div>


                                <div className="flex items-start gap-4">
                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Built for Reliability
                                        </h4>

                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                                            Dependable systems that institutions and learners can
                                            trust.
                                        </p>
                                    </div>
                                </div>


                                <div className="flex items-start gap-4">
                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <Sparkles className="w-5 h-5" />
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Always Improving
                                        </h4>

                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                                            We continuously learn, listen, and improve the platform
                                            around our community.
                                        </p>
                                    </div>
                                </div>

                            </div>

                        </div>

                    </div>


                    {/* Bottom CTA */}
                    <div className="mt-10 text-center">

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Want to build a better learning experience?
                        </p>

                        <Link
                            to="/onboard"
                            className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
                        >
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </Link>

                    </div>

                </div>
            </section>

            {/* ========================================== */}
            {/* MEET THE DEVELOPERS */}
            {/* ========================================== */}
            <section className="py-20 sm:py-24 bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">

                    {/* Header */}
                    <div className="text-center max-w-2xl mx-auto mb-12">

                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                            The Team
                        </span>

                        <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                            Meet the Developers
                        </h2>

                        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            Meet the engineers and developers building the technology behind
                            the platform and creating better digital experiences for learners
                            and educators.
                        </p>

                    </div>


                    {/* Developers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                        {/* Ekenedilichukwu */}
                        <article className="group bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:-translate-y-1 transition-all duration-300">

                            {/* Image */}
                            <div className="relative h-64 bg-slate-100 dark:bg-slate-900 overflow-hidden">

                                {/* Replace with actual image URL */}
                                <img
                                    src="https://placehold.co/600x700"
                                    alt="Ekenedilichukwu Okoli"
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                                />

                                {/* Gradient */}
                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />

                                {/* Number */}
                                <span className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-slate-950/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                    01
                                </span>

                            </div>

                            {/* Content */}
                            <div className="p-6">

                                <div className="flex items-start justify-between gap-3">

                                    <div>
                                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                            Ekenedilichukwu Okoli
                                        </h3>

                                        <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                            Lead Software Engineer
                                        </p>
                                    </div>

                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                        <Code2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                    </div>

                                </div>

                                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Leading the engineering direction and building scalable
                                    software systems that power the platform.
                                </p>

                            </div>
                        </article>


                        {/* Ogochukwu */}
                        <article className="group bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300">

                            <div className="relative h-64 bg-slate-100 dark:bg-slate-900 overflow-hidden">

                                <img
                                    src="https://placehold.co/600x700"
                                    alt="Ogochukwu Okoli"
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                                />

                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />

                                <span className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-slate-950/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                    02
                                </span>

                            </div>

                            <div className="p-6">

                                <div className="flex items-start justify-between gap-3">

                                    <div>
                                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                            Ogochukwu Okoli
                                        </h3>

                                        <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                            AI Developer
                                        </p>
                                    </div>

                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                                    </div>

                                </div>

                                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Working on intelligent systems and AI-powered experiences
                                    that improve how users interact with technology.
                                </p>

                            </div>
                        </article>


                        {/* Richard */}
                        <article className="group bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 overflow-hidden hover:border-purple-300 dark:hover:border-purple-500/30 hover:-translate-y-1 transition-all duration-300">

                            <div className="relative h-64 bg-slate-100 dark:bg-slate-900 overflow-hidden">

                                <img
                                    src="https://placehold.co/600x700"
                                    alt="Richard Oyenchi"
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                                />

                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />

                                <span className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-slate-950/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                    03
                                </span>

                            </div>

                            <div className="p-6">

                                <div className="flex items-start justify-between gap-3">

                                    <div>
                                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                            Richard Oyenchi
                                        </h3>

                                        <p className="mt-1 text-sm font-semibold text-purple-600 dark:text-purple-400">
                                            Frontend Engineer
                                        </p>
                                    </div>

                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                        <Layout className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                    </div>

                                </div>

                                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Building responsive and intuitive interfaces that make
                                    the platform simple and enjoyable to use.
                                </p>

                            </div>
                        </article>


                        {/* Stella */}
                        <article className="group bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 overflow-hidden hover:border-pink-300 dark:hover:border-pink-500/30 hover:-translate-y-1 transition-all duration-300">

                            <div className="relative h-64 bg-slate-100 dark:bg-slate-900 overflow-hidden">

                                <img
                                    src="https://placehold.co/600x700"
                                    alt="Stella Eneh"
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                                />

                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />

                                <span className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-slate-950/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                    04
                                </span>

                            </div>

                            <div className="p-6">

                                <div className="flex items-start justify-between gap-3">

                                    <div>
                                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                            Stella Eneh
                                        </h3>

                                        <p className="mt-1 text-sm font-semibold text-pink-600 dark:text-pink-400">
                                            Frontend Engineer
                                        </p>
                                    </div>

                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                                        <Monitor className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                                    </div>

                                </div>

                                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Creating polished frontend experiences and helping turn
                                    product ideas into accessible, responsive interfaces.
                                </p>

                            </div>
                        </article>

                    </div>


                    {/* Bottom Statement */}
                    <div className="mt-12 text-center">

                        <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                            <span className="w-8 h-px bg-slate-300 dark:bg-slate-800" />

                            <span>
                                Built by people who care about technology and education
                            </span>

                            <span className="w-8 h-px bg-slate-300 dark:bg-slate-800" />
                        </div>

                    </div>

                </div>
            </section>
        </div>
    )
}

export default AboutUs