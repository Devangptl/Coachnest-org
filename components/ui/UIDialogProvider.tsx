"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type DialogType = "alert" | "confirm";
type DialogVariant = "destructive" | "info";

interface DialogConfig {
  type: DialogType;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: DialogVariant;
  resolve: (value: boolean) => void;
}

interface UIDialogContextValue {
  openAlert: (message: string, options?: { title?: string }) => Promise<void>;
  openConfirm: (
    message: string,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: DialogVariant;
    }
  ) => Promise<boolean>;
}

const UIDialogContext = createContext<UIDialogContextValue | null>(null);

export function UIDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogConfig | null>(null);

  const openAlert = useCallback(
    (message: string, options?: { title?: string }): Promise<void> =>
      new Promise((resolve) => {
        setDialog({
          type: "alert",
          title: options?.title ?? "Notice",
          message,
          confirmText: "OK",
          cancelText: "Cancel",
          variant: "info",
          resolve: () => resolve(),
        });
      }),
    []
  );

  const openConfirm = useCallback(
    (
      message: string,
      options?: {
        title?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: DialogVariant;
      }
    ): Promise<boolean> =>
      new Promise((resolve) => {
        setDialog({
          type: "confirm",
          title: options?.title ?? "Confirm Action",
          message,
          confirmText: options?.confirmText ?? "Confirm",
          cancelText: options?.cancelText ?? "Cancel",
          variant: options?.variant ?? "destructive",
          resolve,
        });
      }),
    []
  );

  const handleClose = useCallback(
    (value: boolean) => {
      dialog?.resolve(value);
      setDialog(null);
    },
    [dialog]
  );

  return (
    <UIDialogContext.Provider value={{ openAlert, openConfirm }}>
      {children}
      <DialogPrimitive.Root
        open={!!dialog}
        onOpenChange={(open: boolean) => {
          if (!open) handleClose(false);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
              "w-[calc(100%-2rem)] sm:w-full max-w-md",
              "bg-card border border-border rounded-xl p-6 shadow-2xl",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
              "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
            )}
          >
            {dialog && (
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-4">
                  {dialog.variant === "destructive" ? (
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Info className="w-5 h-5 text-blue-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h2 className="text-base font-semibold text-foreground mb-1">
                      {dialog.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {dialog.message}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {dialog.type === "confirm" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClose(false)}
                    >
                      {dialog.cancelText}
                    </Button>
                  )}
                  <Button
                    variant={
                      dialog.type === "confirm" && dialog.variant === "destructive"
                        ? "danger"
                        : "primary"
                    }
                    size="sm"
                    onClick={() => handleClose(true)}
                  >
                    {dialog.type === "confirm" ? dialog.confirmText : dialog.confirmText}
                  </Button>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </UIDialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(UIDialogContext);
  if (!ctx) throw new Error("useConfirm must be used within UIDialogProvider");
  return ctx.openConfirm;
}

export function useAlert() {
  const ctx = useContext(UIDialogContext);
  if (!ctx) throw new Error("useAlert must be used within UIDialogProvider");
  return ctx.openAlert;
}
