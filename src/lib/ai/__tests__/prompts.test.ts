import { describe, expect, test } from "bun:test";
import { MindMapNodeSchema } from "../prompts";

describe("MindMapNodeSchema", () => {
  test("parses nested children", () => {
    const parsed = MindMapNodeSchema.parse({
      id: "root",
      label: "Root",
      description: "Top level",
      children: [
        {
          id: "child",
          label: "Child",
          description: "Nested",
          children: [{ id: "leaf", label: "Leaf", description: "Deepest" }],
        },
      ],
    });

    expect(parsed.children?.[0]?.children?.[0]?.label).toBe("Leaf");
  });

  test("rejects a node without a description", () => {
    const result = MindMapNodeSchema.safeParse({ id: "root", label: "Root" });
    expect(result.success).toBe(false);
  });
});
