"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  GridIcon
} from "@hugeicons/core-free-icons";

export function ProjectSidebar({ onExport, onImport, onReset, onExportImage }: { onExport?: () => void; onImport?: () => void; onReset?: () => void; onExportImage?: () => void }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { settings, setSettings } = useCanvasSettings();

  return (
    <>
      {/* Floating Toggle Button */}
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

      {/* Floating Sidebar Shell */}
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
          <Button variant="ghost" className="w-full justify-start text-sm">
            <HugeiconsIcon icon={UserGroupIcon} className="mr-2 h-4 w-4" />
            Live Session
          </Button>

          <div className="my-4 border-t border-border" />

          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
            Canvas
          </div>
          <AlertDialog>
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="my-4 border-t border-border" />

          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
            Settings
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <HugeiconsIcon icon={Sun01Icon} className="mr-2 h-4 w-4" />
            ) : (
              <HugeiconsIcon icon={Moon01Icon} className="mr-2 h-4 w-4" />
            )}
            Toggle Theme
          </Button>

          <div className="px-2 pt-2 pb-1">
            <div className="flex items-center text-sm font-medium mb-2 mt-2">
              <HugeiconsIcon icon={GridIcon} className="mr-2 h-4 w-4 text-muted-foreground" />
              Background
            </div>
            <div className="flex gap-2">
              {['#ffffff', '#f8f9fa', '#e9ecef', '#212529'].map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-6 h-6 rounded-full border shadow-sm",
                    settings.background === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setSettings({ ...settings, background: color })}
                  title={color}
                />
              ))}
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}

