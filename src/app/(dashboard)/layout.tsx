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
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative overflow-y-auto custom-scrollbar">
         {children}
         
         {/* Global Action Modals */}
         <ChannelModal />
         <ProjectModal />
      </main>
    </div>
  );
}
