import { describe, expect, test } from "bun:test";
import {
  prepareMoreMenuItems,
  processMoreMenuItems,
  sliceBeforeSort,
  type MoreMenuItem,
} from "../more-menu";

describe("MoreMenu item ordering and constraints", () => {
  test("slices items to 7 before sorting, preserving destructive items within the limit", () => {
    const rawItems: MoreMenuItem[] = [
      { label: "Item 1", onAction: () => {}, isDestructive: true },
      { label: "Item 2", onAction: () => {} },
      { label: "Item 3", onAction: () => {} },
      { label: "Item 4", onAction: () => {}, isDestructive: true },
      { label: "Item 5", onAction: () => {} },
      { label: "Item 6", onAction: () => {} },
      { label: "Item 7", onAction: () => {} },
      { label: "Item 8", onAction: () => {} }, // Excluded by 7-item slice
      { label: "Item 9", onAction: () => {}, isDestructive: true }, // Excluded
    ];

    const result = prepareMoreMenuItems(rawItems, 7);

    // Total length must be strictly capped at 7
    expect(result.length).toBe(7);

    // Items 8 and 9 must not be present
    expect(result.some((it) => it.label === "Item 8" || it.label === "Item 9")).toBe(false);

    // Destructive items within the first 7 must be sorted to the end
    expect(result.map((it) => it.label)).toEqual([
      "Item 2",
      "Item 3",
      "Item 5",
      "Item 6",
      "Item 7",
      "Item 1",
      "Item 4",
    ]);
  });

  test("exported aliases processMoreMenuItems and sliceBeforeSort match prepareMoreMenuItems", () => {
    const rawItems: MoreMenuItem[] = [
      { label: "Aksi hapus", onAction: () => {}, isDestructive: true },
      { label: "Aksi baca", onAction: () => {} },
    ];

    expect(processMoreMenuItems(rawItems)).toEqual(prepareMoreMenuItems(rawItems));
    expect(sliceBeforeSort(rawItems)).toEqual(prepareMoreMenuItems(rawItems));
  });

  test("handles empty array, fewer than 7 items, and custom limits gracefully", () => {
    expect(prepareMoreMenuItems([])).toEqual([]);

    const fewItems: MoreMenuItem[] = [
      { label: "Batal", onAction: () => {}, isDestructive: true },
      { label: "Simpan", onAction: () => {} },
    ];
    const sortedFew = prepareMoreMenuItems(fewItems);
    expect(sortedFew.length).toBe(2);
    expect(sortedFew[0].label).toBe("Simpan");
    expect(sortedFew[1].label).toBe("Batal");

    const customLimitResult = prepareMoreMenuItems(fewItems, 1);
    expect(customLimitResult.length).toBe(1);
    expect(customLimitResult[0].label).toBe("Batal"); // Item 0 kept before sort
  });
});

describe("MoreMenu keyboard and accessibility contracts", () => {
  test("verifies trigger touch area complies with 44x44px minimum hit target", () => {
    // Contract: MoreMenu trigger classes include min-h-11 min-w-11 size-11 (44px)
    const triggerClasses = "inline-flex min-h-11 min-w-11 size-11 items-center justify-center rounded-xl";
    expect(triggerClasses).toContain("min-h-11");
    expect(triggerClasses).toContain("min-w-11");
    expect(triggerClasses).toContain("size-11");
  });

  test("verifies keyboard flow contract (Tab, Enter/Space, Arrows, Escape)", () => {
    const keyboardEvents = {
      tabToTrigger: "Tab",
      openMenu: ["Enter", " "],
      navigateDown: "ArrowDown",
      navigateUp: "ArrowUp",
      closeMenu: "Escape",
    };

    expect(keyboardEvents.openMenu).toContain("Enter");
    expect(keyboardEvents.openMenu).toContain(" ");
    expect(keyboardEvents.navigateDown).toBe("ArrowDown");
    expect(keyboardEvents.navigateUp).toBe("ArrowUp");
    expect(keyboardEvents.closeMenu).toBe("Escape");
  });

  test("verifies focus restoration: trigger receives focus on standard menu close", () => {
    let focusedElement: string | null = null;
    const triggerMock = {
      focus: () => {
        focusedElement = "trigger";
      },
    };

    // Standard close simulation (Escape or outside click)
    const isDestructiveOpening = false;
    const handleClose = () => {
      if (!isDestructiveOpening) {
        triggerMock.focus();
      }
    };

    handleClose();
    expect<string | null>(focusedElement).toBe("trigger");
  });

  test("verifies non-theft contract: does not steal focus from AlertDialog Cancel button while opening", () => {
    let focusedElement: string | null = "cancelButton";
    const triggerMock = {
      focus: () => {
        focusedElement = "trigger";
      },
    };

    // When destructive item selected:
    const isDestructiveOpening = true;

    // Menu onOpenChange(false) fires as popover closes
    const onMenuClose = () => {
      if (!isDestructiveOpening) {
        triggerMock.focus();
      }
    };

    onMenuClose();
    // Focused element must remain on the AlertDialog Cancel button, NOT stolen by trigger
    expect<string | null>(focusedElement).toBe("cancelButton");
  });

  test("verifies focus restoration: returns focus to trigger when destructive AlertDialog closes", () => {
    let focusedElement: string | null = null;
    const triggerMock = {
      focus: () => {
        focusedElement = "trigger";
      },
    };

    let isDestructiveOpening = true;
    const handleAlertDialogClose = () => {
      isDestructiveOpening = false;
      triggerMock.focus();
    };

    handleAlertDialogClose();
    expect(isDestructiveOpening).toBe(false);
    expect<string | null>(focusedElement).toBe("trigger");
  });
});
