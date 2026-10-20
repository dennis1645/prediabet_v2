import React from "react";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-white/70 backdrop-blur-md border-t border-slate-200/60 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-2">
          <img src="/WajahMaskot2.png" alt="Predi" className="w-6 h-6 object-contain" />
          <span>&copy; {new Date().getFullYear()} PrediaBeat. Kendali Gula Darah di Genggaman Anda.</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span>Dibuat dengan</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
          <span>untuk pencegahan prediabetes & diabetes tipe 2 di Indonesia.</span>
        </div>
      </div>
    </footer>
  );
}
