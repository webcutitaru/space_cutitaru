"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

const title = "SPACE";
const subtitle = "by cutitaru";

function AnimatedLetter({
  char,
  index,
  reduced,
}: {
  char: string;
  index: number;
  reduced: boolean;
}) {
  if (char === " ") {
    return <span className="inline-block w-[0.35em]" />;
  }

  return (
    <motion.span
      className="inline-block bg-gradient-to-b from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent"
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 40, rotateX: -70 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : { delay: 0.15 + index * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {char}
    </motion.span>
  );
}

export function SpaceHero() {
  const reduced = useReducedMotion() ?? false;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 grid-bg" />

      <motion.div
        className="glow-orb absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20"
        animate={reduced ? undefined : { scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="glow-orb absolute bottom-0 right-0 h-64 w-64 rounded-full bg-violet-500/15"
        animate={reduced ? undefined : { x: [0, -20, 0], y: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {!reduced &&
        Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute h-1 w-1 rounded-full bg-indigo-300/40"
            style={{
              left: `${8 + ((i * 17) % 84)}%`,
              top: `${10 + ((i * 23) % 80)}%`,
            }}
            animate={{
              opacity: [0.15, 0.7, 0.15],
              scale: [0.8, 1.4, 0.8],
            }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}

      <div className="relative z-10 text-center">
        <motion.p
          className="mb-4 font-mono text-xs uppercase tracking-[0.45em] text-indigo-300/70"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.6 }}
        >
          platform
        </motion.p>

        <h1 className="text-[clamp(3.5rem,14vw,8rem)] font-semibold leading-none tracking-tight">
          {title.split("").map((char, index) => (
            <AnimatedLetter key={`${char}-${index}`} char={char} index={index} reduced={reduced} />
          ))}
        </h1>

        <motion.p
          className="mt-4 font-mono text-sm tracking-[0.35em] text-slate-400 sm:text-base"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {subtitle.split("").map((char, index) => (
            <motion.span
              key={`sub-${index}`}
              className="inline-block"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 + index * 0.03, duration: 0.4 }}
            >
              {char}
            </motion.span>
          ))}
        </motion.p>
      </div>

      <ProjectCTA reduced={reduced} />
    </main>
  );
}

const PROJECTS = [
  { number: "01", title: "Reviews Extractor", href: "/reviews-extractor" },
  { number: "02", title: "Image Converter", href: "/image-converter" },
  { number: "03", title: "Link2Pic", href: "/link2pic" },
  { number: "04", title: "ReelSave", href: "/reelsave" },
] as const;

function ProjectCTA({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      className="absolute bottom-10 left-1/2 z-10 grid w-full max-w-4xl -translate-x-1/2 grid-cols-1 gap-3 px-4 sm:bottom-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-0"
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {PROJECTS.map((project) => (
        <Link key={project.href} href={project.href} className="group relative block">
          <motion.span
            className="absolute -inset-1 rounded-full bg-indigo-500/30 blur-md"
            animate={reduced ? undefined : { opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="relative flex items-center justify-center gap-3 rounded-full border border-indigo-400/30 bg-slate-950/70 px-6 py-3 text-sm font-medium text-indigo-100 backdrop-blur-md transition-colors group-hover:border-indigo-300/50 group-hover:bg-slate-900/80">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-indigo-300/80">
              Project {project.number}
            </span>
            <span>{project.title}</span>
            <motion.span
              aria-hidden
              animate={reduced ? undefined : { x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              →
            </motion.span>
          </span>
        </Link>
      ))}
    </motion.div>
  );
}
