"use client";

import {
  Facebook02Icon,
  InstagramIcon,
  PinterestIcon,
  TiktokIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LaitstyleSymbol } from "@/components/brand/laitstyle-symbol";
import { Button } from "@/components/ui/button";
import {
  showStorefrontToast,
  useStorefrontOverlay,
} from "@/modules/storefront-shell/client/storefront-runtime";

const socialPlatforms = [
  { label: "Instagram", icon: InstagramIcon },
  { label: "Facebook", icon: Facebook02Icon },
  { label: "TikTok", icon: TiktokIcon },
  { label: "Pinterest", icon: PinterestIcon },
  { label: "YouTube", icon: YoutubeIcon },
] as const;

export function SiteFooter() {
  const overlay = useStorefrontOverlay();
  const [interactive, setInteractive] = useState(false);

  useEffect(() => setInteractive(true), []);

  return (
    <footer
      className="site-footer"
      data-interactive={interactive ? "true" : "false"}
      data-site-footer
    >
      <div className="shell">
        <div className="footer-layout">
          <section className="footer-statement" aria-labelledby="footer-statement-title">
            <div className="footer-identity">
              <LaitstyleSymbol
                aria-hidden="true"
                className="footer-logo"
                data-storefront-logo="woven"
                focusable="false"
                role="presentation"
                title=""
              />
              <p className="footer-eyebrow">Laitstyles / The fashion edit</p>
            </div>
            <h2 className="footer-title" id="footer-statement-title">
              Style, selected <em>with intention.</em>
            </h2>
            <p className="footer-copy">
              Distinctive fashion for considered wardrobes, curated for quality, character and
              confident dressing.
            </p>
            <fieldset className="footer-socials">
              <legend className="sr-only">Laitstyles social channels</legend>
              {socialPlatforms.map((platform) => (
                <Button
                  aria-label={`Follow Laitstyles on ${platform.label}`}
                  className="footer-social"
                  key={platform.label}
                  onClick={() => showStorefrontToast(`${platform.label} details are coming soon.`)}
                  size="icon-lg"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={platform.icon}
                    size={20}
                    strokeWidth={1.6}
                  />
                </Button>
              ))}
            </fieldset>
          </section>

          <nav aria-labelledby="footer-discover-title" className="footer-nav">
            <h2 className="footer-nav-title" id="footer-discover-title">
              Discover
            </h2>
            <div className="footer-nav-list">
              <Link className="footer-link" data-slot="button" href="/products?collection=new">
                New arrivals
              </Link>
              <Link className="footer-link" data-slot="button" href="/products?category=Women">
                Women
              </Link>
              <Link className="footer-link" data-slot="button" href="/products?category=Men">
                Men
              </Link>
              <Link
                className="footer-link"
                data-slot="button"
                href="/products?collection=one-of-one"
              >
                The edit
              </Link>
            </div>
          </nav>

          <nav aria-labelledby="footer-services-title" className="footer-nav">
            <h2 className="footer-nav-title" id="footer-services-title">
              Client services
            </h2>
            <div className="footer-nav-list">
              <Button
                className="footer-link"
                onClick={() => overlay.open("deliveryModal")}
                type="button"
                variant="ghost"
              >
                Delivery &amp; returns
              </Button>
              <Button
                className="footer-link"
                onClick={() => overlay.open("measureModal")}
                type="button"
                variant="ghost"
              >
                Size &amp; fit
              </Button>
              <Button
                className="footer-link"
                onClick={() => overlay.open("conditionModal")}
                type="button"
                variant="ghost"
              >
                Quality standards
              </Button>
              <Button
                className="footer-link"
                onClick={() => overlay.open("supportModal")}
                type="button"
                variant="ghost"
              >
                Contact
              </Button>
            </div>
          </nav>
        </div>

        <ul aria-label="Shopping assurances" className="footer-trust">
          <li className="footer-trust-item">Curated selection</li>
          <li className="footer-trust-item">Detailed fit notes</li>
          <li className="footer-trust-item">Nationwide delivery</li>
        </ul>

        <div className="footer-meta">
          <span>© 2026 Laitstyles</span>
          <span>Nigeria / NGN ₦</span>
          <span>Fashion, selected in Lagos</span>
        </div>
      </div>
    </footer>
  );
}
