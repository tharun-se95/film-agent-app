"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import ChannelModal from "@/components/ChannelModal";
import ProjectModal from "@/components/ProjectModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-inter selection:bg-primary/30 selection:text-white">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-[#080808] overflow-hidden relative overflow-y-auto custom-scrollbar border-l border-white/[0.03]">
         {children}
         
         {/* Global Action Modals */}
         <ChannelModal />
         <ProjectModal />
      </main>
    </div>
  );
}
