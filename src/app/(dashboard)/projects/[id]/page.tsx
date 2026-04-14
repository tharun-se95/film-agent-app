"use client";

import React from "react";
import { useParams } from "next/navigation";
import ProjectEditor from "@/components/ProjectEditor";

export default function ProjectPage() {
  const { id } = useParams();

  return <ProjectEditor projectId={id as string} />;
}
