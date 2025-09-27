"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Tema değiştir" className="h-9 w-9">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = (theme === "dark") || (theme === "system" && resolvedTheme === "dark");

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Tema değiştir"
        className="h-9 w-9"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title={isDark ? "Açık tema" : "Koyu tema"}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </div>
  );
}
