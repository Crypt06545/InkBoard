"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  FilePlus2,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const recentBoards = [
  {
    id: "1",
    title: "SaaS Architecture",
    description: "Backend architecture and service communication",
    updatedAt: "Updated 12 min ago",
    type: "Architecture",
  },
  {
    id: "2",
    title: "E-commerce Flow",
    description: "Customer journey and order processing",
    updatedAt: "Updated yesterday",
    type: "Flowchart",
  },
  {
    id: "3",
    title: "Product Roadmap",
    description: "Features, milestones and product ideas",
    updatedAt: "Updated 3 days ago",
    type: "Planning",
  },
];

const DashBoardPage = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Workspace</p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Good morning 👋
          </h1>

          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Turn your ideas into visual thinking with your AI-powered
            whiteboard.
          </p>
        </div>

        <Link href="/dashboard/boards/new">
          <Button>
            <Plus className="mr-2 size-4" />
            New board
          </Button>
        </Link>
      </section>

      {/* AI Banner */}
      <Card className="overflow-hidden">
        <CardContent className="relative p-5 sm:p-6">
          <div className="absolute right-0 top-0 size-40 rounded-full bg-muted/60 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-background">
                <Sparkles className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold">Start with AI</h2>

                <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                  Describe what you want to visualize and let AI generate a
                  starting point for your board.
                </p>
              </div>
            </div>

            <Link href="/dashboard/boards/new?ai=true">
              <Button variant="outline" className="shrink-0">
                Generate with AI
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Quick start</h2>

            <p className="text-sm text-muted-foreground">
              Choose how you want to begin.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/boards/new"
            className="group rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
              <FilePlus2 className="size-5" />
            </div>

            <h3 className="font-medium">Blank board</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Start drawing from scratch.
            </p>

            <ArrowRight className="mt-4 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/dashboard/boards/new?ai=true"
            className="group rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
              <Sparkles className="size-5" />
            </div>

            <h3 className="font-medium">Generate with AI</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Describe an idea and generate a board.
            </p>

            <ArrowRight className="mt-4 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/dashboard/boards"
            className="group rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
              <LayoutGrid className="size-5" />
            </div>

            <h3 className="font-medium">Browse boards</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Open and manage your existing boards.
            </p>

            <ArrowRight className="mt-4 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Recent boards */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Recent boards</h2>

            <p className="text-sm text-muted-foreground">
              Continue where you left off.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input placeholder="Search boards..." className="w-56 pl-9" />
            </div>

            <Link href="/dashboard/boards">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recentBoards.map((board) => (
            <Card
              key={board.id}
              className="group transition-shadow hover:shadow-sm"
            >
              {/* Board preview */}
              <div className="relative aspect-[16/9] overflow-hidden rounded-t-xl border-b bg-muted/30">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted))_1px,transparent_1px)] bg-[size:20px_20px] opacity-50" />

                <div className="absolute left-[18%] top-[30%] h-10 w-24 rounded-md border bg-background shadow-sm" />

                <div className="absolute left-[52%] top-[45%] h-10 w-28 rounded-md border bg-background shadow-sm" />

                <div className="absolute left-[32%] top-[68%] h-8 w-20 rounded-md border bg-background shadow-sm" />
              </div>

              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">
                    {board.title}
                  </CardTitle>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {board.type}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Open board</DropdownMenuItem>
                    <DropdownMenuItem>Rename</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>

                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent>
                <p className="line-clamp-1 text-sm text-muted-foreground">
                  {board.description}
                </p>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {board.updatedAt}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashBoardPage;
