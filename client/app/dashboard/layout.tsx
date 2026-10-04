"use client";

import Link from "next/link";
import {
  Bot,
  FilePlus2,
  Home,
  LayoutDashboard,
  Menu,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface DashboardPageLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Boards",
    href: "/dashboard/boards",
    icon: Home,
  },
  {
    label: "Shared with me",
    href: "/dashboard/shared",
    icon: Users,
  },
];

const secondaryNavigation = [
  {
    label: "AI Assistant",
    href: "/dashboard/ai",
    icon: Sparkles,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

function SidebarContent() {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Bot className="size-4" />
          </div>

          <span className="text-base font-semibold tracking-tight">
            Whiteboard AI
          </span>
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex-1 space-y-6 overflow-y-auto p-3">
        {/* Workspace */}
        <div>
          <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" />

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tools */}
        <div>
          <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
            Tools
          </p>

          <nav className="space-y-1">
            {secondaryNavigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" />

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* AI Card */}
      <div className="p-3">
        <div className="rounded-xl border bg-muted/40 p-4">
          <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-background shadow-sm">
            <Sparkles className="size-4" />
          </div>

          <p className="text-sm font-semibold">Create with AI</p>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Turn your ideas into diagrams, mind maps and visual plans.
          </p>

          <Link
            href="/dashboard/boards/new"
            className="mt-3 flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            <FilePlus2 className="mr-2 size-4" />
            New board
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPageLayout({
  children,
}: DashboardPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur lg:hidden">
        <Sheet>
          <SheetTrigger>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="size-5" />

              <span className="sr-only">Open navigation</span>
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-72 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
            <Bot className="size-3.5" />
          </div>

          <span className="text-sm font-semibold">Whiteboard AI</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
