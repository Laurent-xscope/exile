import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  ReactNode,
  Ref,
} from "react";
import { cx, sortCx } from "@/utils/cx";
import { directionalIconClass } from "@/utils/directional-icon";

/**
 * Figma source: Board UI → Buttons (node 3656:13819).
 *
 * Variant matrix from Figma:
 *   Type     = Primary | Secondary | Ghost | Danger
 *   Size     = Medium  | Small | Xs
 *   State    = Default | Hover | Active | Disabled        (CSS pseudo)
 *   OnlyIcon = false   | true
 *
 * Sizing (1:1 with Figma):
 *
 *                       Medium                    Small                     Xs
 *   container          h=36, p=8,   r=10         h=32, px=8 py=6, r=8      h=24, px=8, r=4
 *   gap                 2px                       2px                      1.33px→1
 *   icon                20×20                     18×18                    14×14
 *   label wrapper       px=4                      px=2                     px=2
 *   text style          Body 1/Medium             Body 1/Medium            Caption 1/Semibold
 *   icon-only square    36×36 (content-derived)   32×32 (forced size)      24×24 (forced size)
 *
 * `xs` is the smallest tier — first needed for the calendar template's
 * event-details modal ("Join" / edit-icon buttons, node 3920:10954), which
 * scales every dimension down by the same ~0.667 factor from Figma; the
 * table above rounds those to clean pixel values rather than reproducing
 * the fractional source numbers.
 *
 * Icons are rendered by the component itself via the `leadingIcon` /
 * `trailingIcon` props so the consumer can't pass the wrong size. Pass
 * a Remix Icon component reference (`RiAddLine`, not `<RiAddLine />`).
 *
 * For icon-only buttons:
 *   <Button iconOnly leadingIcon={RiAddLine} aria-label="Add" />
 *
 * The HTML `type` prop is preserved; Figma's "Type" enum is renamed to
 * `variant` to avoid the clash.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "medium" | "small" | "xs";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export interface ButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

const styles = sortCx({
  base: [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden",
    "font-sans select-none cursor-pointer border-2 rounded-xl",
    "font-semibold tracking-[0.01em] transition-colors duration-100",
    "outline-none focus-visible:shadow-[0_0_0_2px_var(--vb-paper),0_0_0_4px_var(--vb-ink)]",
    "disabled:opacity-35 disabled:cursor-not-allowed aria-disabled:opacity-35 aria-disabled:cursor-not-allowed",
    "disabled:pointer-events-none aria-disabled:pointer-events-none",
  ].join(" "),

  // VoiceBox sizes: Small 6/16 12px, Medium 10/24 14px.
  size: {
    medium: "px-6 py-2.5 text-[14px] leading-5",
    small:  "px-4 py-1.5 text-[12px] leading-4",
    xs:     "px-3 py-1 text-[11px] leading-4",
  },

  iconOnlySize: {
    medium: "size-10 p-0",
    small:  "size-8 p-0",
    xs:     "size-6 p-0",
  },

  icon: {
    medium: "size-5 shrink-0",
    small:  "size-[18px] shrink-0",
    xs:     "size-3.5 shrink-0",
  },

  label: {
    medium: "inline-flex items-center justify-center shrink-0",
    small:  "inline-flex items-center justify-center shrink-0",
    xs:     "inline-flex items-center justify-center shrink-0",
  },

  variant: {
    primary:
      "bg-ink text-paper border-ink hover:bg-red-500 hover:border-red-500 active:bg-red-600 active:border-red-600",
    danger:
      "bg-red-500 text-paper border-red-500 hover:bg-red-600 hover:border-red-600 active:bg-red-700 active:border-red-700",
    secondary:
      "bg-transparent text-ink border-ink hover:bg-ink hover:text-paper active:bg-neutral-700",
    ghost:
      "bg-transparent text-ink border-transparent hover:text-red-500 active:text-red-600",
  },
});

export function Button({
  variant = "primary",
  size = "medium",
  iconOnly = false,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        styles.base,
        styles.size[size],
        styles.variant[variant],
        iconOnly && styles.iconOnlySize[size],
        className,
      )}
      {...props}
    >
      {Leading ? <Leading className={cx(styles.icon[size], directionalIconClass(Leading))} aria-hidden /> : null}
      {!iconOnly && children !== undefined && children !== null && (
        <span className={styles.label[size]}>{children}</span>
      )}
      {!iconOnly && Trailing ? (
        <Trailing className={cx(styles.icon[size], directionalIconClass(Trailing))} aria-hidden />
      ) : null}
    </button>
  );
}

/** Anchor counterpart to Button for navigational actions. */
export function ButtonLink({
  variant = "primary",
  size = "medium",
  iconOnly = false,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  ref,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      ref={ref}
      className={cx(
        styles.base,
        styles.size[size],
        styles.variant[variant],
        iconOnly && styles.iconOnlySize[size],
        className,
      )}
      {...props}
    >
      {Leading ? <Leading className={cx(styles.icon[size], directionalIconClass(Leading))} aria-hidden /> : null}
      {!iconOnly && children !== undefined && children !== null && (
        <span className={styles.label[size]}>{children}</span>
      )}
      {!iconOnly && Trailing ? (
        <Trailing className={cx(styles.icon[size], directionalIconClass(Trailing))} aria-hidden />
      ) : null}
    </a>
  );
}

/** Style maps, exported for advanced composition and the dev Design Tuner. */
export const buttonStyles = styles;
