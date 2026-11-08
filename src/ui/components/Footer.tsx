import React from "react";
import { Link } from "react-router-dom";
import { BlueBackpack3DIcon } from "./BlueBackpack3DIcon";
import {
  ArrowRight,
  Globe,
  Share2,
  Mail,
  MessageCircle,
  Heart,
} from "lucide-react";

const resources = [
  { name: "About Us", link: "/about" },
  { name: "Careers", link: "/careers" },
  { name: "Impact Report", link: "/impact-report" },
  { name: "Privacy Policy", link: "/privacy-policy" },
  {
    name: "Terms of Service",
    link: "/terms-of-service",
  },
  { name: "Events", link: "/events" },
];

const Footer: React.FC = () => {
  return (
    <footer className="pt-12 border-t border-slate-200 dark:border-slate-700 font-body">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 text-xs">
        <div className="space-y-3">
          <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">Backpack Inc.</h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Empowering educational organizations and students across Africa through accessible, borderless digital learning.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold font-heading text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Platform</h4>
          <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
            <li><Link to="/explore" className="hover:text-[#0078d4]">Explore Courses</Link></li>
            <li><Link to="/signup" className="hover:text-[#0078d4]">Create Account</Link></li>
            <li><Link to="/login" className="hover:text-[#0078d4]">Sign In</Link></li>
            <li><Link to="/onboard" className="hover:text-[#0078d4]">Register Institution</Link></li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold font-heading text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Resources</h4>
          <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
            <li><Link to="/about-us" className="hover:text-[#0078d4]">About Us</Link></li>
            <li><Link to="/privacy" className="hover:text-[#0078d4]">Privacy Policy</Link></li>
            <li><Link to="/privacy" className="hover:text-[#0078d4]">Terms of Service</Link></li>
            <li><Link to="/events" className="hover:text-[#0078d4]">Academic Events</Link></li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold font-heading text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Support</h4>
          <p className="text-slate-600 dark:text-slate-400">Questions or institutional inquiries?</p>
          <a href="mailto:support@backpack-edu.com" className="text-[#0078d4] font-medium hover:underline block">
            support@backpack-edu.com
          </a>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
        <p>© {new Date().getFullYear()} Backpack Education Inc. All rights reserved.</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/privacy" className="hover:text-[#0078d4]">Privacy</Link>
          <Link to="/privacy" className="hover:text-[#0078d4]">Terms</Link>
          <Link to="/events" className="hover:text-[#0078d4]">Events</Link>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            v0.1.9
          </span>¸
        </div>
      </div>
    </footer>
  );
};

export default Footer;
