"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  Button as AriaButton,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuTrigger as AriaMenuTrigger,
  Popover as AriaPopover,
  type PopoverProps,
} from "react-aria-components";
import { RiMore2Fill } from "@remixicon/react";
import { AlertDialog } from "@/components/base/modal/modal";
import { cx } from "@/utils/cx";
import { useDismissOnOutsidePress, useTriggerToggle } from "@/utils/use-dismiss-on-outside-press";

export interface MoreMenuItem {
  id?: string;
  label: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  onAction: () => void | Promise<unknown>;
  isDestructive?: boolean;
  destructiveTitle?: string;
  destructiveDescription?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
}

export type MoreMenuItemType = MoreMenuItem;

/**
 * Prepares MoreMenu items by enforcing the 7-item limit before sorting,
 * and ordering destructive actions at the end of the menu so users don't
 * trigger them inadvertently.
 */
export function prepareMoreMenuItems(items: MoreMenuItem[], limit = 7): MoreMenuItem[] {
  return items
    .slice(0, limit)
    .sort((a, b) => {
      const aDest = Boolean(a.isDestructive);
      const bDest = Boolean(b.isDestructive);
      if (aDest === bDest) return 0;
      return aDest ? 1 : -1;
    });
}

export const processMoreMenuItems = prepareMoreMenuItems;
export const sliceBeforeSort = prepareMoreMenuItems;

export interface MoreMenuProps {
  items: MoreMenuItem[];
  "aria-label"?: string;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  placement?: PopoverProps["placement"];
  children?: ReactNode;
}

export function MoreMenu({
  items,
  "aria-label": ariaLabel = "More options",
  className,
  triggerClassName,
  popoverClassName,
  placement = "bottom end",
  children,
}: MoreMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const isDestructiveOpeningRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDestructiveItem, setPendingDestructiveItem] = useState<MoreMenuItem | null>(null);

  const handleClose = () => {
    setIsOpen(false);
    if (!isDestructiveOpeningRef.current) {
      triggerRef.current?.focus();
    }
  };

  useDismissOnOutsidePress(isOpen, handleClose, [triggerRef, popoverRef]);
  const allowOpenChange = useTriggerToggle(isOpen, triggerRef);

  // Show at most 7 items in one menu and sort destructive items last
  const sortedItems = prepareMoreMenuItems(items, 7);

  const handleItemAction = (item: MoreMenuItem) => {
    if (item.disabled) return;
    if (item.isDestructive) {
      isDestructiveOpeningRef.current = true;
      setPendingDestructiveItem(item);
    } else {
      item.onAction();
    }
  };

  const handleAlertDialogClose = () => {
    isDestructiveOpeningRef.current = false;
    setPendingDestructiveItem(null);
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  };

  return (
    <>
      <AriaMenuTrigger
        isOpen={isOpen}
        onOpenChange={(next) => {
          if (!next && !isDestructiveOpeningRef.current) {
            triggerRef.current?.focus();
          }
          if (allowOpenChange(next)) {
            setIsOpen(next);
          }
        }}
      >
        <AriaButton
          ref={triggerRef}
          aria-label={ariaLabel}
          className={cx(
            "inline-flex min-h-11 min-w-11 size-11 items-center justify-center rounded-xl",
            "cursor-pointer select-none text-text-secondary outline-none transition-colors",
            "hover:bg-background-secondary-hover hover:text-text-primary",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
            triggerClassName,
          )}
        >
          {children || <RiMore2Fill className="size-5 shrink-0" aria-hidden="true" />}
        </AriaButton>

        <AriaPopover
          ref={popoverRef}
          isNonModal
          placement={placement}
          offset={4}
          className={cx(
            "z-110 min-w-[200px] max-w-[calc(100vw-32px)] overflow-y-auto",
            "rounded-2lg bg-background-primary-default p-1 shadow-dropdown",
            "transition duration-150 ease-out",
            "data-[entering]:opacity-0 data-[entering]:scale-95 data-[entering]:blur-[2px]",
            "data-[exiting]:opacity-0 data-[exiting]:scale-95 data-[exiting]:blur-[2px]",
            popoverClassName,
          )}
        >
          <AriaMenu
            aria-label={ariaLabel}
            className="flex w-full flex-col gap-0.5 outline-none"
            onAction={(key) => {
              const item = sortedItems.find((it, idx) => (it.id ?? String(idx)) === key);
              if (item) {
                handleItemAction(item);
              }
            }}
          >
            {sortedItems.map((item, index) => {
              const key = item.id ?? String(index);
              const Icon = item.icon;
              return (
                <AriaMenuItem
                  key={key}
                  id={key}
                  isDisabled={item.disabled}
                  className={cx(
                    "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 min-h-9 h-10 text-body-medium outline-none transition-colors select-none text-start",
                    item.isDestructive
                      ? "text-text-error-primary hover:bg-background-secondary-hover focus-visible:bg-background-secondary-hover data-[focused]:bg-background-secondary-hover"
                      : "text-text-primary hover:bg-background-secondary-hover focus-visible:bg-background-secondary-hover data-[focused]:bg-background-secondary-hover",
                    "disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent",
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cx(
                        "size-4 shrink-0",
                        item.isDestructive
                          ? "text-text-error-primary"
                          : "text-foreground-icon-secondary",
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </AriaMenuItem>
              );
            })}
          </AriaMenu>
        </AriaPopover>
      </AriaMenuTrigger>

      {pendingDestructiveItem && (
        <AlertDialog
          isOpen={Boolean(pendingDestructiveItem)}
          onOpenChange={(open) => {
            if (!open) handleAlertDialogClose();
          }}
          title={pendingDestructiveItem.destructiveTitle || pendingDestructiveItem.label}
          description={
            pendingDestructiveItem.destructiveDescription ||
            "Tindakan ini tidak dapat dibatalkan. Apakah anda yakin ingin melanjutkan?"
          }
          confirmLabel={pendingDestructiveItem.confirmLabel || "Lanjutkan"}
          cancelLabel={pendingDestructiveItem.cancelLabel || "Batal"}
          variant="danger"
          onConfirm={async () => {
            const action = pendingDestructiveItem.onAction;
            handleAlertDialogClose();
            await action();
          }}
          onCancel={handleAlertDialogClose}
        />
      )}
    </>
  );
}
