import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogFooter
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

export function ExportImageDialog({
  isOpen,
  onClose,
  onExportPng,
  onExportSvg,
  onCopyToClipboard,
  previewDataUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onCopyToClipboard: () => void;
  previewDataUrl: string;
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-2xl grid-cols-1 overflow-hidden min-w-0">
        <AlertDialogCancel
          variant="ghost"
          size="icon-sm"
          className="absolute right-4 top-4"
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          <span className="sr-only">Close</span>
        </AlertDialogCancel>

        <AlertDialogHeader>
          <AlertDialogTitle>Export Image</AlertDialogTitle>
          <AlertDialogDescription>
            Preview of your canvas. Choose an export format below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="p-4 border rounded-md bg-muted/20 my-4 w-full min-w-0 overflow-hidden">
          {previewDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewDataUrl} alt="Canvas preview" className="mx-auto max-w-full max-h-[50vh] object-contain shadow-sm border" />
          ) : (
            <div className="text-muted-foreground py-10 text-center">No preview available</div>
          )}
        </div>

        <AlertDialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={onCopyToClipboard}>
            Copy to Clipboard
          </Button>
          <Button variant="outline" onClick={onExportSvg}>
            Export SVG
          </Button>
          <Button onClick={onExportPng}>
            Export PNG
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
