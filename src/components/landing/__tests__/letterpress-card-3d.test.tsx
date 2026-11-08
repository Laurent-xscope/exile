import { describe, expect, it } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { LetterpressCard3D } from "../letterpress-card-3d";

describe("LetterpressCard3D CSS 3D & Animation Verification", () => {
  it("renders with correct CSS 3D perspective and preserve-3d hierarchy without flattening", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(LetterpressCard3D, {
        frontContent: React.createElement("div", { id: "front-test" }, "Sisi depan"),
        backContent: React.createElement("div", { id: "back-test" }, "Sisi belakang"),
      })
    );

    // Outer container establishes 3D perspective
    expect(html).toContain("perspective:1200px");

    // Rotator maintains 3D space for children
    expect(html).toContain("transform-style:preserve-3d");

    // Both faces enforce backfaceVisibility: hidden
    expect(html).toContain("backface-visibility:hidden");

    // Front face has positive Z translation for physical cardstock thickness
    expect(html).toContain("transform:translateZ(1.5px)");

    // Back face is flipped 180 degrees around Y-axis
    expect(html).toContain("transform:rotateY(180deg) translateZ(1.5px)");
  });

  it("CRITICAL: does NOT contain premature visibility overrides that cause cards to disappear during rotation", () => {
    // Test both unflipped and flipped states
    const unflippedHtml = ReactDOMServer.renderToString(
      React.createElement(LetterpressCard3D, {
        isFlipped: false,
        frontContent: React.createElement("div", null, "Depan"),
        backContent: React.createElement("div", null, "Belakang"),
      })
    );

    const flippedHtml = ReactDOMServer.renderToString(
      React.createElement(LetterpressCard3D, {
        isFlipped: true,
        frontContent: React.createElement("div", null, "Depan"),
        backContent: React.createElement("div", null, "Belakang"),
      })
    );

    // Neither state should ever contain `visibility: hidden` or `visibility: visible` inline styles
    // (Notice backface-visibility: hidden is allowed and required, but plain visibility is forbidden
    // because premature visibility changes instantly, hiding faces before the 400ms spring rotation finishes!)
    expect(unflippedHtml).not.toMatch(/(?:^|[^-])visibility\s*:\s*(hidden|visible)/i);
    expect(flippedHtml).not.toMatch(/(?:^|[^-])visibility\s*:\s*(hidden|visible)/i);
  });

  it("does NOT put overflow-hidden on the 3D rotator or perspective container which flattens preserve-3d", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(LetterpressCard3D, {
        frontContent: React.createElement("div", null, "Front"),
        backContent: React.createElement("div", null, "Back"),
      })
    );

    // Parse root container and motion wrapper classes
    // The rotator class must have `will-change-transform` and NOT `overflow-hidden`
    // (CSS spec: overflow != visible forces preserve-3d to compute as flat)
    const rotatorMatch = html.match(/class="([^"]*will-change-transform[^"]*)"/);
    expect(rotatorMatch).not.toBeNull();
    const rotatorClasses = rotatorMatch ? rotatorMatch[1] : "";
    expect(rotatorClasses).not.toContain("overflow-hidden");

    // Root perspective container should also NOT clip 3D perspective extrusions
    const rootMatch = html.match(/^<div[^>]*class="([^"]*)"/);
    expect(rootMatch).not.toBeNull();
    const rootClasses = rootMatch ? rootMatch[1] : "";
    expect(rootClasses).not.toContain("overflow-hidden");
  });

  it("configures pointer-events appropriately between front and back faces", () => {
    // When unflipped: front face has pointer-events: auto, back face has pointer-events: none
    const unflippedHtml = ReactDOMServer.renderToString(
      React.createElement(LetterpressCard3D, {
        isFlipped: false,
        frontContent: React.createElement("div", null, "Depan"),
        backContent: React.createElement("div", null, "Belakang"),
      })
    );
    expect(unflippedHtml).toContain("pointer-events:auto");
    expect(unflippedHtml).toContain("pointer-events:none");

    // When flipped: front face has pointer-events: none, back face has pointer-events: auto
    const flippedHtml = ReactDOMServer.renderToString(
      React.createElement(LetterpressCard3D, {
        isFlipped: true,
        frontContent: React.createElement("div", null, "Depan"),
        backContent: React.createElement("div", null, "Belakang"),
      })
    );
    expect(flippedHtml).toContain("pointer-events:none");
    expect(flippedHtml).toContain("pointer-events:auto");
  });

  it("meets accessibility requirements with keyboard support and semantic labels", () => {
    const label = "Kartu belajar interaktif 3d";
    const html = ReactDOMServer.renderToString(
      React.createElement(LetterpressCard3D, {
        ariaLabel: label,
        frontContent: React.createElement("span", null, "Pertanyaan"),
        backContent: React.createElement("span", null, "Jawaban"),
      })
    );

    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain(`aria-label="${label}"`);
  });

  it("uses BoardUI semantic design tokens on face surfaces", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(LetterpressCard3D, {
        frontContent: React.createElement("span", null, "Soal"),
        backContent: React.createElement("span", null, "Solusi"),
      })
    );

    // Strict BoardUI surface tokens
    expect(html).toContain("bg-background-secondary-default");
    expect(html).toContain("border-border-button-default");
    expect(html).toContain("rounded-2xl");
  });
});
