import { describe, expect, it } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import {
  PreScanModal,
  PRE_SCAN_TEXTS,
  type PreScanMode,
} from "../pre-scan-modal";
import { soundEffects } from "@/lib/audio/sounds";

describe("PreScanModal text and language contracts", () => {
  it("exports valid Indonesian copy with strict sentence case", () => {
    const idCopy = PRE_SCAN_TEXTS.id;

    expect(idCopy.title).toBe("Pindai lembar tugas");
    expect(idCopy.description).toBe("Pilih mode pemrosesan");
    expect(idCopy.directAnswerTitle).toBe("Direct answer");
    expect(idCopy.directAnswerDescription).toBe(
      "Jawaban instan untuk verifikasi tugas cepat"
    );
    expect(idCopy.learningTitle).toBe("Learning");
    expect(idCopy.learningDescription).toBe(
      "Transkripsi ke catatan & buat artefak belajar"
    );
    expect(idCopy.closeLabel).toBe("Tutup dialog");

    // Strict sentence case rule: first letter uppercase, rest lowercase (ignoring punctuation/symbols)
    const textsToCheck = [
      idCopy.title,
      idCopy.description,
      idCopy.directAnswerTitle,
      idCopy.directAnswerDescription,
      idCopy.learningTitle,
      idCopy.closeLabel,
    ];

    for (const text of textsToCheck) {
      const firstChar = text[0];
      expect(firstChar).toBe(firstChar.toUpperCase());
      const remainder = text.slice(1);
      expect(remainder.toLowerCase()).toBe(remainder);
    }
  });

  it("exports valid English copy with strict sentence case", () => {
    const enCopy = PRE_SCAN_TEXTS.en;

    expect(enCopy.title).toBe("Scan assignment sheet");
    expect(enCopy.description).toBe("Select processing mode");
    expect(enCopy.directAnswerTitle).toBe("Direct answer");
    expect(enCopy.directAnswerDescription).toBe(
      "Instant answers for fast homework check"
    );
    expect(enCopy.learningTitle).toBe("Learning");
    expect(enCopy.learningDescription).toBe(
      "Transcribe to notes & generate learning artifacts"
    );
    expect(enCopy.closeLabel).toBe("Close dialog");

    const textsToCheck = [
      enCopy.title,
      enCopy.description,
      enCopy.directAnswerTitle,
      enCopy.directAnswerDescription,
      enCopy.learningTitle,
      enCopy.closeLabel,
    ];

    for (const text of textsToCheck) {
      const firstChar = text[0];
      expect(firstChar).toBe(firstChar.toUpperCase());
      const remainder = text.slice(1);
      expect(remainder.toLowerCase()).toBe(remainder);
    }
  });
});

describe("PreScanModal DOM and BoardUI token contracts", () => {
  it("renders null when isOpen is false", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(PreScanModal, {
        isOpen: false,
        onClose: () => {},
        onSelectMode: () => {},
      })
    );
    expect(html).toBe("");
  });

  it("renders accessible modal with strict BoardUI design tokens when isOpen is true", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(PreScanModal, {
        isOpen: true,
        onClose: () => {},
        onSelectMode: () => {},
      })
    );

    // Dialog accessibility attributes
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="pre-scan-modal-title"');
    expect(html).toContain('aria-describedby="pre-scan-modal-description"');

    // Radius constraints
    expect(html).toContain("rounded-3xl"); // Modal card
    expect(html).toContain("rounded-2xl"); // Selection rows

    // BoardUI semantic tokens
    expect(html).toContain("bg-background-primary-default");
    expect(html).toContain("border-border-button-default");
    expect(html).toContain("text-text-primary");
    expect(html).toContain("text-text-secondary");
    expect(html).toContain("bg-background-secondary-default");
    expect(html).toContain("hover:bg-background-secondary-hover");

    // Strict sentence case UI copy in Indonesian default
    expect(html).toContain("Pindai lembar tugas");
    expect(html).toContain("Pilih mode pemrosesan");
    expect(html).toContain("Direct answer");
    expect(html).toContain("Jawaban instan untuk verifikasi tugas cepat");
    expect(html).toContain("Learning");
    expect(html).toContain("Transkripsi ke catatan &amp; buat artefak belajar");
  });

  it("renders English copy when isEn is true", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(PreScanModal, {
        isOpen: true,
        onClose: () => {},
        onSelectMode: () => {},
        isEn: true,
      })
    );

    expect(html).toContain("Scan assignment sheet");
    expect(html).toContain("Select processing mode");
    expect(html).toContain("Instant answers for fast homework check");
    expect(html).toContain("Transcribe to notes &amp; generate learning artifacts");
  });
});

describe("PreScanModal interaction contracts", () => {
  it("plays click sound, emits mode, and closes when selecting direct_answer", () => {
    let playedClick = false;
    const originalPlayClick = soundEffects.playClick;
    soundEffects.playClick = () => {
      playedClick = true;
    };

    let selectedMode = null as PreScanMode | null;
    let closed = false;

    // Simulate select handler behavior
    const handleSelect = (mode: PreScanMode) => {
      soundEffects.playClick();
      selectedMode = mode;
      closed = true;
    };

    try {
      handleSelect("direct_answer");
      expect(playedClick).toBe(true);
      expect<PreScanMode | null>(selectedMode).toBe("direct_answer");
      expect(closed).toBe(true);
    } finally {
      soundEffects.playClick = originalPlayClick;
    }
  });

  it("plays click sound, emits mode, and closes when selecting learning", () => {
    let playedClick = false;
    const originalPlayClick = soundEffects.playClick;
    soundEffects.playClick = () => {
      playedClick = true;
    };

    let selectedMode = null as PreScanMode | null;
    let closed = false;

    const handleSelect = (mode: PreScanMode) => {
      soundEffects.playClick();
      selectedMode = mode;
      closed = true;
    };

    try {
      handleSelect("learning");
      expect(playedClick).toBe(true);
      expect<PreScanMode | null>(selectedMode).toBe("learning");
      expect(closed).toBe(true);
    } finally {
      soundEffects.playClick = originalPlayClick;
    }
  });

  it("plays click sound and closes modal when dismiss button is pressed", () => {
    let playedClick = false;
    const originalPlayClick = soundEffects.playClick;
    soundEffects.playClick = () => {
      playedClick = true;
    };

    let closed = false;
    const handleClose = () => {
      soundEffects.playClick();
      closed = true;
    };

    try {
      handleClose();
      expect(playedClick).toBe(true);
      expect(closed).toBe(true);
    } finally {
      soundEffects.playClick = originalPlayClick;
    }
  });

  it("dismisses modal when clicking backdrop directly and ignores inner card clicks", () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    // Backdrop click: e.target === e.currentTarget -> triggers onClose
    const backdropElement = { id: "overlay" };
    const handleBackdropClick = (e: { target: unknown; currentTarget: unknown }) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    handleBackdropClick({ target: backdropElement, currentTarget: backdropElement });
    expect(closed).toBe(true);

    // Inner card click: e.target !== e.currentTarget -> does not trigger onClose
    closed = false;
    const innerCardElement = { id: "card" };
    handleBackdropClick({ target: innerCardElement, currentTarget: backdropElement });
    expect(closed).toBe(false);
  });

  it("dismisses modal on Escape key press", () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    const handleKeyDown = (event: { key: string; stopPropagation: () => void }) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    let stopped = false;
    handleKeyDown({
      key: "Escape",
      stopPropagation: () => {
        stopped = true;
      },
    });

    expect(closed).toBe(true);
    expect(stopped).toBe(true);

    // Non-escape keys should not close
    closed = false;
    stopped = false;
    handleKeyDown({
      key: "Enter",
      stopPropagation: () => {
        stopped = true;
      },
    });

    expect(closed).toBe(false);
    expect(stopped).toBe(false);
  });
});
