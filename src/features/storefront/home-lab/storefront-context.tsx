"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  collectionTitle,
  filteredProducts,
  inventoryLabel,
  money,
  type Product,
  productById,
  products,
} from "./data";
import { StorefrontOverlays } from "./storefront-overlays";

export type CartLine = { id: string; qty: number; variant: string | null };
export type ToastData = { text: string; actionLabel: string; action?: () => void };
export type FilterChip = { type: string; label: string; value?: string };

// Shared interactive layer for every .lst-lab route. Ported from the storefront.html
// script: overlays, cart, saved, recent, search, quick view, image viewer, the filter
// state machine and toast. The root storefront shell mounts one provider so cart and
// saved intent survive navigation while remaining isolated from admin/auth surfaces.
type StorefrontContextValue = {
  // Persisted collections.
  saved: Set<string>;
  cart: CartLine[];
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
  imageIndex: number;
  setImageIndex: React.Dispatch<React.SetStateAction<number>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  quickError: string;
  setQuickError: (v: string) => void;
  openQuick: (id: string) => void;
  openViewer: (index?: number) => void;
  openImageViewerFor: (id: string, index?: number) => void;
  addToCart: (id: string) => void;
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
  toast: ToastData | null;
  clearToast: () => void;
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
  cartLines: { product: Product; lineQty: number; variant: string | null }[];
  cartCount: number;
  subtotal: number;
  savedList: Product[];
  recentList: Product[];
  searchResults: Product[] | null;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function useStorefront() {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error("useStorefront must be used within StorefrontProvider");
  return ctx;
}

export function StorefrontProvider({ children }: { fontClassName?: string; children: ReactNode }) {
  const [category, setCategory] = useState("All");
  const [collection, setCollection] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Set<string>>(new Set());
  const [inventories, setInventories] = useState<Set<string>>(new Set());
  const [inStock, setInStock] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("curated");

  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<CartLine[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [utilityDismissed, setUtilityDismissed] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [quickError, setQuickError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [measureUnit, setMeasureUnit] = useState<"cm" | "in">("cm");
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  const lastFocusRef = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      const savedValue =
        sessionStorage.getItem("laitstyles-storefront:v1:saved") ??
        localStorage.getItem("laitstyles-saved") ??
        "[]";
      const cartValue =
        sessionStorage.getItem("laitstyles-storefront:v1:cart") ??
        localStorage.getItem("laitstyles-cart") ??
        "[]";
      setSaved(new Set(JSON.parse(savedValue)));
      setCart(JSON.parse(cartValue));
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
  }, []);

  useEffect(() => {
    if (storageReady) {
      sessionStorage.setItem("laitstyles-storefront:v1:saved", JSON.stringify([...saved]));
    }
  }, [saved, storageReady]);
  useEffect(() => {
    if (storageReady) {
      sessionStorage.setItem("laitstyles-storefront:v1:cart", JSON.stringify(cart));
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
      const el = document.getElementById(openId);
      const t = window.setTimeout(() => {
        if (openId === "searchModal") document.getElementById("searchInput")?.focus();
        else el?.querySelector<HTMLElement>("button,input,select,textarea,a")?.focus();
      }, 40);
      return () => window.clearTimeout(t);
    }
    lastFocusRef.current?.focus();
  }, [openId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
      if (openId === "imageViewer") {
        const p = activeProduct ?? products[0];
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
  }, [openId, activeProduct]);

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showToast = useCallback((text: string, actionLabel = "", action?: () => void) => {
    setToast({ text, actionLabel, action });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3400);
  }, []);
  const clearToast = useCallback(() => setToast(null), []);

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
      const p = productById(id);
      if (!p) return;
      setActiveProduct(p);
      setSelectedVariant(null);
      setImageIndex(0);
      setQuickError("");
      addRecent(id);
      open("quickView");
    },
    [addRecent, open],
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
    (id: string, index = 0) => {
      const p = productById(id);
      if (!p) return;
      setActiveProduct(p);
      setImageIndex(index);
      setZoom(1);
      open("imageViewer");
    },
    [open],
  );

  const addToCart = useCallback(
    (id: string) => {
      const p = productById(id);
      if (!p) return;
      if (p.status !== "available") {
        showToast(`This piece is currently ${p.status}.`);
        return;
      }
      const existing = cart.find((x) => x.id === id);
      if (p.inventory === "one-of-one" && existing) {
        showToast("This one-of-one piece is already in your bag.");
        return;
      }
      if (existing) {
        setCart(cart.map((x) => (x.id === id ? { ...x, qty: Math.min(x.qty + 1, p.stock) } : x)));
      } else {
        setCart([...cart, { id, qty: 1, variant: selectedVariant || null }]);
      }
      showToast(`${p.name} added to your bag.`);
    },
    [cart, selectedVariant, showToast],
  );

  const toggleSaved = useCallback(
    (id: string) => {
      const p = productById(id);
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
    [saved, showToast],
  );

  const addFromQuick = useCallback(
    (id: string) => {
      const p = productById(id);
      if (!p) return;
      if (p.inventory === "variant" && !selectedVariant) {
        setQuickError("Choose an available size before adding this piece.");
        return;
      }
      addToCart(id);
      open("cartDrawer");
    },
    [selectedVariant, addToCart, open],
  );

  const removeFromCart = useCallback(
    (id: string) => {
      const removed = cart.find((x) => x.id === id);
      setCart(cart.filter((x) => x.id !== id));
      showToast("Item removed.", "Undo", () => {
        if (removed) setCart((c) => [...c, removed]);
      });
    },
    [cart, showToast],
  );

  const changeQty = useCallback((id: string, delta: number) => {
    const p = productById(id);
    if (!p) return;
    setCart((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, qty: Math.max(1, Math.min(p.stock, x.qty + delta)) } : x,
      ),
    );
  }, []);

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
      filteredProducts({
        category,
        collection,
        conditions,
        inventories,
        inStock,
        maxPrice,
        search,
        sort,
      }),
    [category, collection, conditions, inventories, inStock, maxPrice, search, sort],
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

  const savedList = useMemo(() => products.filter((p) => saved.has(p.id)), [saved]);
  const recentList = useMemo(() => recent.map(productById).filter(Boolean) as Product[], [recent]);
  const cartLines = useMemo(
    () =>
      cart
        .map((line) => ({
          product: productById(line.id),
          lineQty: line.qty,
          variant: line.variant,
        }))
        .filter((l) => l.product) as {
        product: Product;
        lineQty: number;
        variant: string | null;
      }[],
    [cart],
  );
  const cartCount = cartLines.reduce((s, l) => s + l.lineQty, 0);
  const subtotal = cartLines.reduce((s, l) => s + l.product.price * l.lineQty, 0);
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
  }, [searchValue]);

  const value: StorefrontContextValue = {
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
    toast,
    clearToast,
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
      <div className="lst-lab">
        <a className="skip-link" href="#main">
          Skip to products
        </a>
        <div className="grain" aria-hidden="true" />
        {children}
        <StorefrontOverlays />
      </div>
    </StorefrontContext.Provider>
  );
}
