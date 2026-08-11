"use client";

import { useEffect, useState } from "react";
import {
  DecompositionWorkspace,
  LOCAL_PROJECT_ID,
} from "@/components/decomposition/decomposition-workspace";

export default function HomePage() {
  const [fixtureMode, setFixtureMode] = useState(false);

  useEffect(() => {
    setFixtureMode(
      new URLSearchParams(window.location.search).get("fixture") === "1"
    );
  }, []);

  return (
    <DecompositionWorkspace
      projectId={LOCAL_PROJECT_ID}
      fixtureMode={fixtureMode}
    />
  );
}
