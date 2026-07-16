import Link from "next/link";
import { Button } from "@/components/ui/button";
import "@/features/storefront/shared/storefront.css";
import { storefrontFontClassName } from "@/features/storefront/shared/storefront-fonts";

export default function NotFound() {
  return (
    <div className={`lst-storefront ${storefrontFontClassName}`}>
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
          <Button className="mt-8" nativeButton={false} render={<Link href="/products" />} size="lg">
            Back to the catalogue
          </Button>
        </div>
      </main>
    </div>
  );
}
