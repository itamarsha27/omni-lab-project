import Image, { type StaticImageData } from "next/image";
import logoFull from "../../public/logo-full.png";
import logoMark from "../../public/logo-mark.png";

type LogoVariant = "full" | "mark";

type LogoProps = {
  /**
   * "full" → wordmark + symbol (use on landing pages, login, headers).
   * "mark" → symbol only (use in tight spots: editor toolbar, favicons).
   */
  variant?: LogoVariant;
  /** Display width in pixels. Height auto-scales to preserve aspect ratio. */
  width?: number;
  /** Display height in pixels. Width auto-scales to preserve aspect ratio. */
  height?: number;
  className?: string;
  /**
   * Set to true when this logo is above-the-fold (e.g. the homepage).
   * Tells Next.js to load it eagerly and skip lazy-loading.
   */
  priority?: boolean;
};

const ASSETS: Record<LogoVariant, StaticImageData> = {
  full: logoFull,
  mark: logoMark,
};

export function Logo({
  variant = "full",
  width,
  height,
  className,
  priority = false,
}: LogoProps) {
  return (
    <Image
      src={ASSETS[variant]}
      alt="OmniLab"
      className={className}
      style={{
        width: width !== undefined ? `${width}px` : "auto",
        height: height !== undefined ? `${height}px` : "auto",
      }}
      priority={priority}
    />
  );
}
