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
    "font-sans select-none cursor-pointer rounded-xl",
    "font-medium tracking-[0.01em] transition-colors duration-150",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
    "disabled:opacity-35 disabled:cursor-not-allowed aria-disabled:opacity-35 aria-disabled:cursor-not-allowed",
    "disabled:pointer-events-none aria-disabled:pointer-events-none",
  ].join(" "),

  // VoiceBox sizes: Small 6/16 12px, Medium 10/24 14px.
  size: {
    medium: "px-5 py-2 text-[14px] leading-5",
    small:  "px-3.5 py-1.5 text-[12px] leading-4",
    xs:     "px-2.5 py-1 text-[11px] leading-4",
  },

  iconOnlySize: {
    medium: "size-9 p-0",
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
      "[background-image:var(--gradient-button-primary-default)] text-text-primary border border-border-button-default hover:[background-image:var(--gradient-button-primary-hover)] active:[background-image:var(--gradient-button-primary-active)] shadow-xs transition-all duration-150",
    danger:
      "bg-button-danger text-foreground-full",
    secondary:
      "bg-background-secondary-default text-text-primary border border-border-button-default hover:bg-background-secondary-hover active:bg-background-tertiary-default",
    ghost:
      "bg-transparent text-text-primary hover:bg-background-secondary-default active:bg-background-secondary-hover",
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

