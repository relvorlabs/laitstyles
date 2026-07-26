import { useId } from "react";

export function BrandMark({
  className,
  title = "Laitstyles",
}: {
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const ids = {
    outer: `${uid}-outer`,
    inner: `${uid}-inner`,
    highlight: `${uid}-highlight`,
    shade: `${uid}-shade`,
    shadow: `${uid}-shadow`,
  };
  return (
    <svg
      aria-label={title}
      className={className}
      role="img"
      viewBox="0 0 612 792"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient
          id={ids.outer}
          x1="77"
          y1="91"
          x2="555"
          y2="725"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f2f4ef" />
          <stop offset="0.28" stopColor="#d5d9d4" />
          <stop offset="0.58" stopColor="#9ea5a4" />
          <stop offset="0.8" stopColor="#f1f2ee" />
          <stop offset="1" stopColor="#adb2b1" />
        </linearGradient>
        <linearGradient
          id={ids.inner}
          x1="177"
          y1="175"
          x2="458"
          y2="635"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#0b0c0d" />
          <stop offset="0.45" stopColor="#141619" />
          <stop offset="0.78" stopColor="#050607" />
          <stop offset="1" stopColor="#1e2124" />
        </linearGradient>
        <linearGradient
          id={ids.highlight}
          x1="206"
          y1="187"
          x2="397"
          y2="565"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#d9ddda" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#89908f" stopOpacity="0.15" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient
          id={ids.shade}
          x1="428"
          y1="162"
          x2="230"
          y2="670"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#2f3437" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#050607" stopOpacity="0.15" />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </linearGradient>
        <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>
      <path
        filter={`url(#${ids.shadow})`}
        fill={`url(#${ids.outer})`}
        d="M86 151c0-37 30-67 67-67h168v91H197v442h111v91H153c-37 0-67-30-67-67V151Zm236-67h105c55 0 99 44 99 99v136h-91V199c0-13-10-23-23-23h-90V84Zm205 343v214c0 37-30 67-67 67H321v-91h115V427h91Z"
      />
      <path
        fill={`url(#${ids.inner})`}
        d="M178 176h143v91h-52v350h52v91H178V176Zm144 0h89c13 0 24 11 24 24v119h-91v-52h-22v-91Zm113 251h91v214c0 37-30 67-67 67H321v-91h92c12 0 22-10 22-22V427Z"
      />
      <path
        fill={`url(#${ids.highlight})`}
        d="M92 151c0-31 25-56 56-56h165v54H169c-18 0-33 15-33 33v409c0 18 15 33 33 33h139v74H153c-34 0-61-27-61-61V151Z"
        opacity="0.85"
      />
      <path
        fill={`url(#${ids.shade})`}
        d="M322 95h105c49 0 89 40 89 89v125h-54V199c0-29-23-52-52-52h-88V95Zm140 342h54v204c0 31-25 56-56 56H322v-70h91c27 0 49-22 49-49V437Z"
        opacity="0.75"
      />
      <path fill="#f4f5f2" fillOpacity="0.35" d="M164 196h15v400h-15z" />
      <path fill="#fff" fillOpacity="0.18" d="M343 196h15v111h-15z" />
    </svg>
  );
}
