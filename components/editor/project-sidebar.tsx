"use client";

import * as React from "react";
import { useQRCode } from "next-qrcode";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme } from "@/components/theme-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCanvasSettings } from "./canvas-settings-provider";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Folder01Icon,
  FloppyDiskIcon,
  Download01Icon,
  UserGroupIcon,
  Refresh01Icon,
  Sun01Icon,
  Moon01Icon,
  GridIcon,
  ComputerIcon
} from "@hugeicons/core-free-icons";

export const THEME_OPTIONS = [
  { value: "light", icon: Sun01Icon },
  { value: "dark", icon: Moon01Icon },
  { value: "system", icon: ComputerIcon },
] as const;

export const PREDEFINED_COLORS = ['#ffffff', '#f8f9fa', '#e9ecef', '#212529'] as const;

export type LiveParticipant = {
  name: string;
  role: "host" | "guest";
  joinedAt: string;
};

export type CollaborationPresence = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  connected: boolean;
};

export type LiveSession = {
  id: string;
  displayName: string;
  link: string;
  status: "active" | "stopped";
  participants: LiveParticipant[];
};

export function ProjectSidebar({
  onExport,
  onImport,
  onReset,
  onExportImage,
  onStartSession,
  onJoinSession,
  onStopSession,
  liveSession,
  presence,
  connectionStatus,
  sessionName: activeSessionName,
  onSessionNameChange,
}: {
  onExport?: () => void;
  onImport?: () => void;
  onReset?: () => void;
  onExportImage?: () => void;
  onStartSession?: (name: string) => Promise<LiveSession | void>;
  onJoinSession?: (name: string) => Promise<LiveSession | void>;
  onStopSession?: () => Promise<void> | void;
  liveSession?: LiveSession | null;
  presence?: CollaborationPresence[];
  connectionStatus?: "connecting" | "connected" | "offline";
  sessionName?: string;
  onSessionNameChange?: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [isSessionDialogOpen, setIsSessionDialogOpen] = React.useState(false);
  const [sessionName, setSessionName] = React.useState("");
  const [sessionError, setSessionError] = React.useState("");
  const [isSubmittingSession, setIsSubmittingSession] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { settings, setSettings } = useCanvasSettings();
  const { Canvas: QRCodeCanvas } = useQRCode();
  const hasSessionQuery = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("session");
  const isJoiningViaLink = Boolean(hasSessionQuery && !liveSession);
  const collaboratorList = React.useMemo(() => {
    const source = presence && presence.length > 0
      ? presence.map((participant) => ({
        name: participant.name,
        role: "guest" as const,
        joinedAt: new Date().toISOString(),
      }))
      : liveSession?.participants ?? [];

    const seen = new Set<string>();
    return source.filter((participant) => {
      const signature = `${participant.name}::${participant.joinedAt ?? "unknown"}`;
      if (seen.has(signature)) {
        return false;
      }
      seen.add(signature);
      return true;
    });
  }, [liveSession, presence]);

  const handleSessionCopy = React.useCallback(async () => {
    if (!liveSession?.link) return;

    try {
      await navigator.clipboard.writeText(liveSession.link);
    } catch (error) {
      console.error("Failed to copy session link", error);
    }
  }, [liveSession]);

  const handleSubmitSession = React.useCallback(async () => {
    const trimmedName = sessionName.trim();

    if (!trimmedName) {
      setSessionError("Please enter a display name.");
      return;
    }

    setSessionError("");
    setIsSubmittingSession(true);

    try {
      if (isJoiningViaLink) {
        await onJoinSession?.(trimmedName);
      } else {
        await onStartSession?.(trimmedName);
      }
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Unable to start the live session.");
    } finally {
      setIsSubmittingSession(false);
    }
  }, [isJoiningViaLink, onJoinSession, onStartSession, sessionName]);

  const handleStopSession = React.useCallback(async () => {
    setIsSubmittingSession(true);
    try {
      await onStopSession?.();
      setIsSessionDialogOpen(false);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Unable to stop the live session.");
    } finally {
      setIsSubmittingSession(false);
    }
  }, [onStopSession]);

  return (
    <>
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-card shadow-sm"
        >
          <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5" />
        </Button>
      </div>

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card border-r border-border shadow-lg z-40 transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex-1 overflow-y-auto pt-16 pb-4 px-3 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
            Project
          </div>
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={onImport}>
            <HugeiconsIcon icon={Folder01Icon} className="mr-2 h-4 w-4" />
            Open
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={onExport}>
            <HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-4 w-4" />
            Save To
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={onExportImage}>
            <HugeiconsIcon icon={Download01Icon} className="mr-2 h-4 w-4" />
            Export Image
          </Button>

          <div className="my-4 border-t border-border" />

          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
            Collaboration
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => {
              setSessionError("");
              setIsSessionDialogOpen(true);
            }}
          >
            <HugeiconsIcon icon={UserGroupIcon} className="mr-2 h-4 w-4" />
            Live Session
          </Button>

          <div className="my-4 border-t border-border" />

          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
            Canvas
          </div>
          <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <AlertDialogTrigger
              render={
                <Button variant="ghost" className="w-full justify-start text-sm text-destructive hover:text-destructive hover:bg-destructive/10">
                  <HugeiconsIcon icon={Refresh01Icon} className="mr-2 h-4 w-4" />
                  Reset Canvas
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently clear all elements from your canvas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsResetDialogOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setIsResetDialogOpen(false);
                    onReset?.();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="my-4 border-t border-border" />

          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
            Settings
          </div>

          <div className="px-2 pt-2 pb-1">
            <div className="flex items-center text-sm font-medium mb-2">
              Theme
            </div>
            <ButtonGroup className="w-full">
              {THEME_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1 h-8 text-xs px-0 shadow-none focus:z-10",
                    theme === option.value ? "bg-secondary" : "hover:bg-accent"
                  )}
                  onClick={() => setTheme(option.value)}
                  aria-label={`${option.value} theme`}
                >
                  <HugeiconsIcon icon={option.icon} className="mr-1 w-3.5 h-3.5" />
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="px-2 pt-2 pb-1">
            <div className="flex items-center text-sm font-medium mb-2 mt-2">
              <HugeiconsIcon icon={GridIcon} className="mr-2 h-4 w-4 text-muted-foreground" />
              Background
            </div>
            <ToggleGroup
              value={[settings.background]}
              onValueChange={(value) => {
                if (value.length > 0) setSettings({ ...settings, background: value[0] });
              }}
              className="flex justify-start gap-2 mb-3"
            >
              {PREDEFINED_COLORS.map((color) => (
                <ToggleGroupItem
                  key={color}
                  value={color}
                  className={cn(
                    "w-6 h-6 rounded-full border shadow-sm shrink-0 p-0",
                    settings.background === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                  aria-label={color}
                />
              ))}
            </ToggleGroup>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-medium">Hex</span>
              <Input
                type="text"
                value={settings.background}
                onChange={(e) => setSettings({ ...settings, background: e.target.value })}
                className="h-8"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>
      </aside>

      <AlertDialog open={isSessionDialogOpen} onOpenChange={(open) => {
        setIsSessionDialogOpen(open);
        if (!open) {
          setSessionError("");
          setSessionName("");
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {liveSession ? "Live session" : isJoiningViaLink ? "Join session" : "Start live session"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {liveSession
                ? "Share this link with people so they can join your board immediately."
                : "Enter your display name and create a shareable link for anonymous collaboration."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {liveSession ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Share link
                </div>
                <Input value={liveSession.link} readOnly className="font-mono text-xs" />
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleSessionCopy}>
                  Copy link
                </Button>
              </div>

              <div className="rounded-md border bg-muted/40 p-3">
                <label htmlFor="session-name-live" className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Session name
                </label>
                <Input
                  id="session-name-live"
                  value={activeSessionName?.trim() || sessionName.trim() || "Guest"}
                  onChange={(event) => onSessionNameChange?.(event.target.value)}
                  className="mt-2 h-10"
                  placeholder="Guest"
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mx-auto flex w-fit rounded-md bg-white p-2 shadow-sm">
                  <QRCodeCanvas
                    text={liveSession.link}
                    options={{
                      errorCorrectionLevel: "M",
                      margin: 2,
                      width: 124,
                      color: {
                        dark: "#111827",
                        light: "#ffffff",
                      },
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Active members
                  </div>
                  <div className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
                    connectionStatus === "connected" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" :
                      connectionStatus === "offline" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  )}>
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      connectionStatus === "connected" ? "bg-emerald-500" :
                        connectionStatus === "offline" ? "bg-destructive" : "bg-amber-500"
                    )} />
                    {connectionStatus === "connected" ? "Live" : connectionStatus === "offline" ? "Offline" : "Syncing"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {collaboratorList.length > 0 ? (
                    collaboratorList.map((participant, index) => (
                      <div key={`${participant.name}-${participant.joinedAt ?? "unknown"}-${index}`} className="flex items-center gap-2 rounded-full border bg-background px-2 py-1 text-xs">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {getInitials(participant.name)}
                        </span>
                        <span>{participant.name}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No one has joined yet.</span>
                  )}
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsSessionDialogOpen(false)}>Close</AlertDialogCancel>
                <Button variant="destructive" onClick={handleStopSession} disabled={isSubmittingSession}>
                  {isSubmittingSession ? "Stopping..." : "Stop session"}
                </Button>
              </AlertDialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="session-name" className="text-sm font-medium text-foreground">
                  Your name
                </label>
                <Input
                  id="session-name"
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                  placeholder="Jane Doe"
                  className="h-10"
                />
              </div>

              {sessionError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {sessionError}
                </div>
              ) : null}

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSessionName("")}>Cancel</AlertDialogCancel>
                <Button onClick={handleSubmitSession} disabled={isSubmittingSession}>
                  {isSubmittingSession ? "Working..." : isJoiningViaLink ? "Join session" : "Start session"}
                </Button>
              </AlertDialogFooter>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

