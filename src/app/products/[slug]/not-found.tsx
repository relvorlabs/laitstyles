import Link from "next/link";
import "@/features/storefront/home-lab/home-lab.css";
import { labFontClassName } from "@/features/storefront/home-lab/fonts";

export default function NotFound() {
  return (
    <div className={`lst-lab ${labFontClassName}`}>
      <main
        id="main"
        className="mx-auto grid min-h-[70vh] max-w-[720px] place-items-center px-4 py-24 text-center"
      >
        <div>
          <p className="eyebrow text-brand-sage-strong">404</p>
          <h1 className="mt-4 font-serif text-[clamp(2.2rem,6vw,3.6rem)] font-medium leading-[0.98]">
            This piece isn’t here.
          </h1>
          <p className="mt-4 text-muted-foreground">
            It may have sold, or the link is out of date. One-of-one pieces don’t come back.
          </p>
          <Link
            href="/products"
            className="button button-primary mt-8 inline-flex"
            style={{ borderRadius: 999 }}
          >
            Back to the catalogue
          </Link>
        </div>
      </main>
    </div>
  );
}
