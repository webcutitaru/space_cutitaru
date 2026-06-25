import Link from "next/link";
import Image from "next/image";

type ButtonVariant = "teal" | "violet" | "blue";

export function LetterButton({
  href,
  variant,
  children,
  onClick,
  type = "button",
}: {
  href?: string;
  variant: ButtonVariant;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const cls = `btn-letter btn-${variant}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export function GhostLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: ButtonVariant;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`ghost-link ghost-link-${variant} ml-4`}>
      {children}
    </Link>
  );
}

export function RenderImage({
  src,
  alt,
  priority,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={600}
      height={600}
      priority={priority}
      className={className ?? "h-auto w-full max-w-lg object-contain"}
    />
  );
}
