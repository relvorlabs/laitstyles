"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast as sonnerToast } from "sonner";
import { koboToNaira } from "@/lib/money";
import type { StorefrontCatalogPayload, StorefrontCategory } from "@/lib/storefront/catalog-data";
import type { ProductVariantOption } from "@/lib/storefront/types";
import {
  addCartLine,
  cartSubtotal,
  changeCartLineQuantity,
  type CartLine,
  type CartSelection,
} from "./cart-lines";
import { CART_STORAGE_KEY, loadPersistedCart } from "./cart-persistence";
import {
  collectionTitle,
  filteredProducts,
  inventoryLabel,
  money,
  type Product,
  productById,
} from "./catalogue-data";
import { StorefrontOverlays } from "./storefront-overlays";

export type FilterChip = { type: string; label: string; value?: string };

// Shared interactive layer for every .lst-storefront route. Ported from the storefront.html
// script: overlays, cart, saved, recent, search, quick view, image viewer, the filter
// state machine and toast. The root storefront shell mounts one provider so cart and
// saved intent survive navigation while remaining isolated from admin/auth surfaces.
type StorefrontContextValue = {
  products: Product[];
  categories: StorefrontCategory[];
  measurementsCm: Record<string, number>;
  variantOptionsByProductId: Readonly<Record<string, readonly ProductVariantOption[]>>;
  productById: (id: string) => Product | undefined;
  // Persisted collections.
  saved: Set<string>;
  cart: readonly CartLine[];
  recent: string[];
  utilityDismissed: boolean;
  dismissUtility: () => void;
  // Overlay + product interaction.
  openId: string | null;
  open: (id: string) => void;
  closeAll: () => void;
  activeProduct: Product | null;
  selectedVariant: string | null;
  setSelectedVariant: (v: string | null) => void;
  selectedQuickVariantId: string | null;
  setSelectedQuickVariantId: (v: string | null) => void;
  imageIndex: number;
  setImageIndex: React.Dispatch<React.SetStateAction<number>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  quickError: string;
  setQuickError: (v: string) => void;
  openQuick: (id: string) => void;
  openViewer: (index?: number) => void;
  openImageViewerFor: (id: string, index?: number, images?: readonly string[]) => void;
  addToCart: (id: string, selection?: CartSelection, quantity?: number) => void;
  addFromQuick: (id: string) => void;
  toggleSaved: (id: string) => void;
  removeFromCart: (id: string) => void;
  changeQty: (id: string, delta: number) => void;
  // Search + measurements + forms.
  searchValue: string;
  setSearchValue: (v: string) => void;
  measureUnit: "cm" | "in";
  setMeasureUnit: (v: "cm" | "in") => void;
  newsletterStatus: string;
  setNewsletterStatus: (v: string) => void;
  deliveryStatus: string;
  setDeliveryStatus: (v: string) => void;
  headerScrolled: boolean;
  showToast: (text: string, actionLabel?: string, action?: () => void) => void;
  // Filter state (shared catalogue semantics).
  category: string;
  setCategory: (v: string) => void;
  collection: string | null;
  setCollection: (v: string | null) => void;
  conditions: Set<string>;
  setConditions: React.Dispatch<React.SetStateAction<Set<string>>>;
  inventories: Set<string>;
  setInventories: React.Dispatch<React.SetStateAction<Set<string>>>;
  inStock: boolean;
  setInStock: (v: boolean) => void;
  maxPrice: number | null;
  setMaxPrice: (v: number | null) => void;
  search: string;
  setSearch: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  applyShop: (opts: { category?: string; collection?: string | null }) => void;
  clearFilters: () => void;
  removeFilter: (type: string, value?: string) => void;
  // Derived.
  filteredList: Product[];
  title: { title: string; em: string; description: string };
  breadcrumb: string;
  activeFilterChips: FilterChip[];
  cartLines: {
    product: Product;
    lineKey: string;
    lineQty: number;
    variantId: string | null;
    variantLabel: string | null;
    colour: string | null;
    size: string | null;
    unitPriceNaira: number;
  }[];
  cartCount: number;
  subtotal: number;
  savedList: Product[];
  recentList: Product[];
  searchResults: Product[] | null;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function useStorefront() {
  const ctx = use(StorefrontContext);
  if (!ctx) throw new Error("useStorefront must be used within StorefrontProvider");
  return ctx;
}

export function StorefrontProvider({
  catalog,
  children,
}: {
  catalog: StorefrontCatalogPayload;
  fontClassName?: string;
  children: ReactNode;
}) {
  const { products, categories, measurementsCm, variantOptionsByProductId } = catalog;
  const findProduct = useCallback((id: string) => productById(products, id), [products]);
  const [category, setCategory] = useState("All");
  const [collection, setCollection] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Set<string>>(new Set());
  const [inventories, setInventories] = useState<Set<string>>(new Set());
  const [inStock, setInStock] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("curated");

  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<readonly CartLine[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [utilityDismissed, setUtilityDismissed] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedQuickVariantId, setSelectedQuickVariantId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [quickError, setQuickError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [measureUnit, setMeasureUnit] = useState<"cm" | "in">("cm");
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const savedValue =
        sessionStorage.getItem("laitstyles-storefront:v1:saved") ??
        localStorage.getItem("laitstyles-saved") ??
        "[]";
      setSaved(new Set(JSON.parse(savedValue)));
      setCart(loadPersistedCart(sessionStorage, localStorage, products, variantOptionsByProductId));
      setRecent(
        JSON.parse(
          sessionStorage.getItem("laitstyles-storefront:v1:recent") ??
            sessionStorage.getItem("laitstyles-recent") ??
            "[]",
        ),
      );
      if (sessionStorage.getItem("laitstyles-storefront:v1:utility")) {
        setUtilityDismissed(true);
      }
    } catch {
      // Ignore malformed storage.
    } finally {
      setStorageReady(true);
    }
  }, [products, variantOptionsByProductId]);

  useEffect(() => {
    if (storageReady) {
      sessionStorage.setItem("laitstyles-storefront:v1:saved", JSON.stringify([...saved]));
    }
  }, [saved, storageReady]);
  useEffect(() => {
    if (storageReady) {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, storageReady]);
  useEffect(() => {
    if (storageReady) {
      sessionStorage.setItem("laitstyles-storefront:v1:recent", JSON.stringify(recent));
    }
  }, [recent, storageReady]);

  useEffect(() => {
    document.body.classList.toggle("lst-locked", openId !== null);
    return () => document.body.classList.remove("lst-locked");
  }, [openId]);

  useEffect(() => {
    if (openId) {
      const focusOverlay = () => {
        const element = document.getElementById(openId);
        if (!element) return false;
        if (openId === "searchModal") document.getElementById("searchInput")?.focus();
        else element.querySelector<HTMLElement>("button,input,select,textarea,a")?.focus();
        return true;
      };
      const observer = new MutationObserver(() => {
        if (focusOverlay()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const timeout = window.setTimeout(() => {
        focusOverlay();
        observer.disconnect();
      }, 1500);
      focusOverlay();
      return () => {
        observer.disconnect();
        window.clearTimeout(timeout);
      };
    }
    lastFocusRef.current?.focus();
  }, [openId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
      if (openId === "imageViewer") {
        const p = activeProduct ?? products[0];
        if (!p || p.images.length === 0) return;
        if (e.key === "ArrowRight") {
          setImageIndex((i) => (i + 1) % p.images.length);
          setZoom(1);
        }
        if (e.key === "ArrowLeft") {
          setImageIndex((i) => (i - 1 + p.images.length) % p.images.length);
          setZoom(1);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId, activeProduct, products]);

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prototype toast → sonner. Preserves the (text, actionLabel?, action?) contract and
  // the 3400ms dwell; the Toaster below is themed to the prototype's ink/bone pill.
  const showToast = useCallback((text: string, actionLabel = "", action?: () => void) => {
    sonnerToast(text, {
      duration: 3400,
      action: actionLabel ? { label: actionLabel, onClick: () => action?.() } : undefined,
    });
  }, []);

  const open = useCallback((id: string) => {
    if (typeof document !== "undefined")
      lastFocusRef.current = document.activeElement as HTMLElement;
    setOpenId(id);
  }, []);
  const closeAll = useCallback(() => setOpenId(null), []);

  const dismissUtility = useCallback(() => {
    setUtilityDismissed(true);
    try {
      sessionStorage.setItem("laitstyles-storefront:v1:utility", "dismissed");
    } catch {
      // ignore
    }
  }, []);

  const addRecent = useCallback((id: string) => {
    setRecent((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 8));
  }, []);

  const openQuick = useCallback(
    (id: string) => {
      const p = findProduct(id);
      if (!p) return;
      setActiveProduct(p);
      setSelectedQuickVariantId(null);
      setImageIndex(0);
      setQuickError("");
      addRecent(id);
      open("quickView");
    },
    [addRecent, findProduct, open],
  );

  const openViewer = useCallback(
    (index?: number) => {
      setImageIndex(index ?? 0);
      setZoom(1);
      open("imageViewer");
    },
    [open],
  );

  // Open the shared image viewer for a specific product (used by the product-detail gallery).
  const openImageViewerFor = useCallback(
    (id: string, index = 0, images?: readonly string[]) => {
      const p = findProduct(id);
      if (!p) return;
      setActiveProduct(images ? { ...p, images: [...images] } : p);
      setImageIndex(index);
      setZoom(1);
      open("imageViewer");
    },
    [findProduct, open],
  );

  const addToCart = useCallback(
    (id: string, selection?: CartSelection, quantity = 1) => {
      const p = findProduct(id);
      if (!p) return;
      if (p.status !== "available") {
        showToast(`This piece is currently ${p.status}.`);
        return;
      }
      if (p.inventory === "variant" && !selection) {
        showToast("Choose an available option before adding this piece.");
        return;
      }
      const next = addCartLine(cart, p, selection ?? null, quantity);
      if (next === cart) {
        showToast(
          p.inventory === "one-of-one"
            ? "This one-of-one piece is already in your bag."
            : "The maximum available quantity is already in your bag.",
        );
        return;
      }
      setCart(next);
      showToast(`${p.name} added to your bag.`);
    },
    [cart, findProduct, showToast],
  );

  const toggleSaved = useCallback(
    (id: string) => {
      const p = findProduct(id);
      const next = new Set(saved);
      if (next.has(id)) {
        next.delete(id);
        showToast(`${p?.name} removed from saved items.`);
      } else {
        next.add(id);
        showToast(`${p?.name} saved for later.`);
      }
      setSaved(next);
    },
    [findProduct, saved, showToast],
  );

  const addFromQuick = useCallback(
    (id: string) => {
      const p = findProduct(id);
      if (!p) return;
      if (p.inventory === "variant") {
        const variant = (variantOptionsByProductId[p.id] ?? []).find(
          (option) => option.id === selectedQuickVariantId,
        );
        if (!variant || variant.availability.available < 1) {
          setQuickError("Choose an available option before adding this piece.");
          return;
        }
        addToCart(
          id,
          {
            variantId: variant.id,
            variantLabel: variant.label,
            colour: variant.colour,
            size: variant.size,
            unitPriceNaira: koboToNaira(variant.price ?? p.price * 100),
            maxQuantity: variant.availability.available,
          },
          1,
        );
      } else {
        addToCart(id);
      }
      open("cartDrawer");
    },
    [selectedQuickVariantId, addToCart, findProduct, open, variantOptionsByProductId],
  );

  const removeFromCart = useCallback(
    (lineKey: string) => {
      const removed = cart.find((line) => line.key === lineKey);
      if (!removed) return;
      setCart(cart.filter((line) => line.key !== lineKey));
      showToast("Item removed.", "Undo", () => {
        if (removed) setCart((c) => [...c, removed]);
      });
    },
    [cart, showToast],
  );

  const changeQty = useCallback(
    (lineKey: string, delta: number) => {
      setCart((previous) => changeCartLineQuantity(previous, lineKey, delta));
    },
    [],
  );

  const applyShop = useCallback((opts: { category?: string; collection?: string | null }) => {
    setCategory(opts.category || "All");
    setCollection(opts.collection || null);
    setConditions(new Set());
    setInventories(new Set());
    setInStock(false);
    setMaxPrice(null);
    setSearch("");
  }, []);

  const clearFilters = useCallback(() => {
    setCategory("All");
    setCollection(null);
    setConditions(new Set());
    setInventories(new Set());
    setInStock(false);
    setMaxPrice(null);
    setSearch("");
    showToast("Filters cleared.");
  }, [showToast]);

  const removeFilter = useCallback((type: string, value?: string) => {
    if (type === "category") setCategory("All");
    if (type === "collection") setCollection(null);
    if (type === "condition")
      setConditions((prev) => new Set([...prev].filter((v) => v !== value)));
    if (type === "inventory")
      setInventories((prev) => new Set([...prev].filter((v) => v !== value)));
    if (type === "stock") setInStock(false);
    if (type === "price") setMaxPrice(null);
    if (type === "search") setSearch("");
  }, []);

  const filteredList = useMemo(
    () =>
      filteredProducts(products, {
        category,
        collection,
        conditions,
        inventories,
        inStock,
        maxPrice,
        search,
        sort,
      }),
    [category, collection, conditions, inventories, inStock, maxPrice, products, search, sort],
  );
  const title = useMemo(() => collectionTitle({ category, collection }), [category, collection]);
  const breadcrumb =
    [category !== "All" ? category : null, collection ? collection.replaceAll("-", " ") : null]
      .filter(Boolean)
      .join(" / ") || "Shop all";

  const activeFilterChips = useMemo(() => {
    const values: FilterChip[] = [];
    if (category !== "All") values.push({ type: "category", label: category });
    if (collection) values.push({ type: "collection", label: collection.replaceAll("-", " ") });
    for (const v of conditions) values.push({ type: "condition", label: `Grade ${v}`, value: v });
    for (const v of inventories)
      values.push({
        type: "inventory",
        label: inventoryLabel(v as Product["inventory"]),
        value: v,
      });
    if (inStock) values.push({ type: "stock", label: "In stock" });
    if (maxPrice) values.push({ type: "price", label: `Under ${money(maxPrice)}` });
    if (search) values.push({ type: "search", label: `Search: ${search}` });
    return values;
  }, [category, collection, conditions, inventories, inStock, maxPrice, search]);

  const savedList = useMemo(
    () => products.filter((product) => saved.has(product.id)),
    [products, saved],
  );
  const recentList = useMemo(
    () => recent.map(findProduct).filter(Boolean) as Product[],
    [findProduct, recent],
  );
  const cartLines = useMemo(
    () =>
      cart
        .map((line) => ({
          product: findProduct(line.productId),
          lineKey: line.key,
          lineQty: line.qty,
          variantId: line.variantId,
          variantLabel: line.variantLabel,
          colour: line.colour,
          size: line.size,
          unitPriceNaira: line.unitPriceNaira,
        }))
        .filter((l) => l.product) as {
        product: Product;
        lineKey: string;
        lineQty: number;
        variantId: string | null;
        variantLabel: string | null;
        colour: string | null;
        size: string | null;
        unitPriceNaira: number;
      }[],
    [cart, findProduct],
  );
  const cartCount = cartLines.reduce((s, l) => s + l.lineQty, 0);
  const subtotal = cartSubtotal(cart);
  const searchResults = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return null;
    return products
      .filter((p) =>
        [p.name, p.brand, p.category, p.type, p.style, `Grade ${p.condition}`]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 7);
  }, [products, searchValue]);

  const value: StorefrontContextValue = {
    products,
    categories,
    measurementsCm,
    variantOptionsByProductId,
    productById: findProduct,
    saved,
    cart,
    recent,
    utilityDismissed,
    dismissUtility,
    openId,
    open,
    closeAll,
    activeProduct,
    selectedVariant,
    setSelectedVariant,
    selectedQuickVariantId,
    setSelectedQuickVariantId,
    imageIndex,
    setImageIndex,
    zoom,
    setZoom,
    quickError,
    setQuickError,
    openQuick,
    openViewer,
    openImageViewerFor,
    addToCart,
    addFromQuick,
    toggleSaved,
    removeFromCart,
    changeQty,
    searchValue,
    setSearchValue,
    measureUnit,
    setMeasureUnit,
    newsletterStatus,
    setNewsletterStatus,
    deliveryStatus,
    setDeliveryStatus,
    headerScrolled,
    showToast,
    category,
    setCategory,
    collection,
    setCollection,
    conditions,
    setConditions,
    inventories,
    setInventories,
    inStock,
    setInStock,
    maxPrice,
    setMaxPrice,
    search,
    setSearch,
    sort,
    setSort,
    applyShop,
    clearFilters,
    removeFilter,
    filteredList,
    title,
    breadcrumb,
    activeFilterChips,
    cartLines,
    cartCount,
    subtotal,
    savedList,
    recentList,
    searchResults,
  };

  return (
    <StorefrontContext.Provider value={value}>
      <div className="lst-storefront">
        <a className="skip-link" href="#main">
          Skip to products
        </a>
        <div className="grain" aria-hidden="true" />
        {children}
        <StorefrontOverlays />
      </div>
      {/* Toast host lives once in the root layout (ink/bone pill, bottom-right) so /products
          no longer double-renders toasts. */}
    </StorefrontContext.Provider>
  );
}
