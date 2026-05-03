import Image from "next/image";

type LogoVariant = "full" | "mark";

type LogoProps = {
  /**
   * "full" → wordmark + symbol (use on landing pages, login, headers).
   * "mark" → symbol only (use in tight spots: lab editor toolbar, favicons, app chrome).
   */
  variant?: LogoVariant;
  /** Width in pixels. Height is computed proportionally. */
  width?: number;
  /** Height in pixels. Width is computed proportionally. */
  height?: number;
  className?: string;
  /**
   * Set to true if this logo is above-the-fold on its page (e.g. the
   * homepage). Tells Next.js to load it eagerly without lazy-loading.
   */
  priority?: boolean;
};

const ASSETS: Record<LogoVariant, { src: string; intrinsicWidth: number; intrinsicHeight: number }> = {
  // Update intrinsicWidth/Height to match the cropped image dimensions if you ever re-export.
  full: { src: "/logo-full.png", intrinsicWidth: 2000, intrinsicHeight: 1100 },
  mark: { src: "/logo-mark.png", intrinsicWidth: 2000, intrinsicHeight: 1110 },
};

export function Logo({
  variant = "full",
  width,
  height,
  className,
  priority = false,
}: LogoProps) {
  const asset = ASSETS[variant];

  // If only width is given, scale height proportionally (and vice versa).
  const aspect = asset.intrinsicWidth / asset.intrinsicHeight;
  const finalWidth = width ?? (height !== undefined ? Math.round(height * aspect) : asset.intrinsicWidth);
  const finalHeight = height ?? (width !== undefined ? Math.round(width / aspect) : asset.intrinsicHeight);

  return (
    <Image
      src={asset.src}
      alt="OmniLab"
      width={finalWidth}
      height={finalHeight}
      className={className}
      priority={priority}
    />
  );
}
