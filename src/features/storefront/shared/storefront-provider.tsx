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
import type {
  StorefrontCatalogPayload,
  StorefrontCategory,
} from "@/features/storefront/shared/catalog-types";
import { koboToNaira } from "@/lib/money";
import type { ProductVariantOption } from "@/lib/storefront/types";
import {
  addCartLine,
  type CartLine,
  type CartSelection,
  cartSubtotal,
  changeCartLineQuantity,
} from "./cart-lines";
import {
  collectionTitle,
  filteredProducts,
  inventoryLabel,
  money,
  type Product,
  productById,
} from "./catalogue-data";
import { useStorefrontClientState } from "./storefront-client-state-provider";
import { StorefrontOverlays } from "./storefront-overlays";

export type FilterChip = { type: string; label: string; value?: string };

type StorefrontContextValue = {
  products: Product[];
  categories: StorefrontCategory[];
  measurementsCm: Record<string, number>;
  variantOptionsByProductId: Readonly<Record<string, readonly ProductVariantOption[]>>;
  productById: (id: string) => Product | undefined;
  saved: Set<string>;
  cart: readonly CartLine[];
  recent: string[];
  utilityDismissed: boolean;
  dismissUtility: () => void;
  openId: string | null;
  open: (id: string) => void;
  closeAll: () => void;
  activeProduct: Product | null;
  selectedVariant: string | null;
  setSelectedVariant: (value: string | null) => void;
  selectedQuickVariantId: string | null;
  setSelectedQuickVariantId: (value: string | null) => void;
  imageIndex: number;
  setImageIndex: React.Dispatch<React.SetStateAction<number>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  quickError: string;
  setQuickError: (value: string) => void;
  openQuick: (id: string) => void;
  openViewer: (index?: number) => void;
  openImageViewerFor: (id: string, index?: number, images?: readonly string[]) => void;
  addToCart: (id: string, selection?: CartSelection, quantity?: number) => void;
  addFromQuick: (id: string) => void;
  toggleSaved: (id: string) => void;
  removeFromCart: (id: string) => void;
  changeQty: (id: string, delta: number) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  measureUnit: "cm" | "in";
  setMeasureUnit: (value: "cm" | "in") => void;
  newsletterStatus: string;
  setNewsletterStatus: (value: string) => void;
  deliveryStatus: string;
  setDeliveryStatus: (value: string) => void;
  headerScrolled: boolean;
  showToast: (text: string, actionLabel?: string, action?: () => void) => void;
  category: string;
  setCategory: (value: string) => void;
  collection: string | null;
  setCollection: (value: string | null) => void;
  conditions: Set<string>;
  setConditions: React.Dispatch<React.SetStateAction<Set<string>>>;
  inventories: Set<string>;
  setInventories: React.Dispatch<React.SetStateAction<Set<string>>>;
  inStock: boolean;
  setInStock: (value: boolean) => void;
  maxPrice: number | null;
  setMaxPrice: (value: number | null) => void;
  search: string;
  setSearch: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  applyShop: (options: { category?: string; collection?: string | null }) => void;
  clearFilters: () => void;
  removeFilter: (type: string, value?: string) => void;
  filteredList: Product[];
  title: { title: string; em: string; description: string };
  breadcrumb: string;
  activeFilterChips: FilterChip[];
  cartLines: Array<{
    product: Product;
    lineKey: string;
    lineQty: number;
    variantId: string | null;
    variantLabel: string | null;
    colour: string | null;
    size: string | null;
    unitPriceNaira: number;
  }>;
  cartCount: number;
  subtotal: number;
  savedList: Product[];
  recentList: Product[];
  searchResults: Product[] | null;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function useStorefront() {
  const context = use(StorefrontContext);
  if (!context) throw new Error("useStorefront must be used within StorefrontProvider");
  return context;
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
  const clientState = useStorefrontClientState();
  const { cart, saved } = clientState;
  const findProduct = useCallback((id: string) => productById(products, id), [products]);

  const [category, setCategory] = useState("All");
  const [collection, setCollection] = useState<string | null>(null);
  const [conditions, setConditions] = useState<Set<string>>(new Set());
  const [inventories, setInventories] = useState<Set<string>>(new Set());
  const [inStock, setInStock] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("curated");
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
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const storedRecent =
        sessionStorage.getItem("laitstyles-storefront:v1:recent") ??
        sessionStorage.getItem("laitstyles-recent") ??
        "[]";
      const parsedRecent = JSON.parse(storedRecent) as unknown;
      if (Array.isArray(parsedRecent)) {
        setRecent(parsedRecent.filter((value): value is string => typeof value === "string"));
      }
      setUtilityDismissed(
        sessionStorage.getItem("laitstyles-storefront:v1:utility") === "dismissed",
      );
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("laitstyles-storefront:v1:recent", JSON.stringify(recent));
    } catch {
      // Recent products are a best-effort client preference.
    }
  }, [recent]);

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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
      if (openId !== "imageViewer") return;
      const product = activeProduct ?? products[0];
      if (!product || product.images.length === 0) return;
      if (event.key === "ArrowRight") {
        setImageIndex((index) => (index + 1) % product.images.length);
        setZoom(1);
      }
      if (event.key === "ArrowLeft") {
        setImageIndex((index) => (index - 1 + product.images.length) % product.images.length);
        setZoom(1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeProduct, openId, products]);

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showToast = useCallback((text: string, actionLabel = "", action?: () => void) => {
    sonnerToast(text, {
      duration: 3400,
      action: actionLabel ? { label: actionLabel, onClick: () => action?.() } : undefined,
    });
  }, []);

  const open = useCallback((id: string) => {
    if (typeof document !== "undefined") {
      lastFocusRef.current = document.activeElement as HTMLElement;
    }
    setOpenId(id);
  }, []);
  const closeAll = useCallback(() => setOpenId(null), []);

  const dismissUtility = useCallback(() => {
    setUtilityDismissed(true);
    try {
      sessionStorage.setItem("laitstyles-storefront:v1:utility", "dismissed");
    } catch {
      // Utility dismissal is best-effort.
    }
  }, []);

  const addRecent = useCallback((id: string) => {
    setRecent((current) => [id, ...current.filter((value) => value !== id)].slice(0, 8));
  }, []);

  const openQuick = useCallback(
    (id: string) => {
      const product = findProduct(id);
      if (!product) return;
      setActiveProduct(product);
      setSelectedQuickVariantId(null);
      setImageIndex(0);
      setQuickError("");
      addRecent(id);
      open("quickView");
    },
    [addRecent, findProduct, open],
  );

  const openViewer = useCallback(
    (index = 0) => {
      setImageIndex(index);
      setZoom(1);
      open("imageViewer");
    },
    [open],
  );

  const openImageViewerFor = useCallback(
    (id: string, index = 0, images?: readonly string[]) => {
      const product = findProduct(id);
      if (!product) return;
      setActiveProduct(images ? { ...product, images: [...images] } : product);
      setImageIndex(index);
      setZoom(1);
      open("imageViewer");
    },
    [findProduct, open],
  );

  const addToCart = useCallback(
    (id: string, selection?: CartSelection, quantity = 1) => {
      const product = findProduct(id);
      if (!product) return;
      if (product.status !== "available") {
        showToast(`This piece is currently ${product.status}.`);
        return;
      }
      if (product.inventory === "variant" && !selection) {
        showToast("Choose an available option before adding this piece.");
        return;
      }
      const next = addCartLine(cart, product, selection ?? null, quantity);
      if (next === cart) {
        showToast(
          product.inventory === "one-of-one"
            ? "This one-of-one piece is already in your bag."
            : "The maximum available quantity is already in your bag.",
        );
        return;
      }
      clientState.setCart(next);
      showToast(`${product.name} added to your bag.`);
    },
    [cart, clientState, findProduct, showToast],
  );

  const toggleSaved = useCallback(
    (id: string) => {
      const product = findProduct(id);
      const next = new Set(saved);
      if (next.has(id)) {
        next.delete(id);
        showToast(`${product?.name ?? "Item"} removed from saved items.`);
      } else {
        next.add(id);
        showToast(`${product?.name ?? "Item"} saved for later.`);
      }
      clientState.setSaved(next);
    },
    [clientState, findProduct, saved, showToast],
  );

  const addFromQuick = useCallback(
    (id: string) => {
      const product = findProduct(id);
      if (!product) return;
      if (product.inventory === "variant") {
        const variant = (variantOptionsByProductId[product.id] ?? []).find(
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
            unitPriceNaira: koboToNaira(variant.price ?? product.price * 100),
            maxQuantity: variant.availability.available,
          },
          1,
        );
      } else {
        addToCart(id);
      }
      open("cartDrawer");
    },
    [addToCart, findProduct, open, selectedQuickVariantId, variantOptionsByProductId],
  );

  const removeFromCart = useCallback(
    (lineKey: string) => {
      const removed = cart.find((line) => line.key === lineKey);
      if (!removed) return;
      clientState.setCart(cart.filter((line) => line.key !== lineKey));
      showToast("Item removed.", "Undo", () => {
        clientState.updateCart((current) =>
          current.some((line) => line.key === removed.key) ? current : [...current, removed],
        );
      });
    },
    [cart, clientState, showToast],
  );

  const changeQty = useCallback(
    (lineKey: string, delta: number) => {
      clientState.updateCart((current) => changeCartLineQuantity(current, lineKey, delta));
    },
    [clientState],
  );

  const applyShop = useCallback(
    (options: { category?: string; collection?: string | null }) => {
      setCategory(options.category || "All");
      setCollection(options.collection || null);
      setConditions(new Set());
      setInventories(new Set());
      setInStock(false);
      setMaxPrice(null);
      setSearch("");
    },
    [],
  );

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
    if (type === "condition") {
      setConditions((current) => new Set([...current].filter((item) => item !== value)));
    }
    if (type === "inventory") {
      setInventories((current) => new Set([...current].filter((item) => item !== value)));
    }
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
    [category, collection, conditions, inStock, inventories, maxPrice, products, search, sort],
  );
  const title = useMemo(() => collectionTitle({ category, collection }), [category, collection]);
  const breadcrumb =
    [category !== "All" ? category : null, collection?.replaceAll("-", " ") ?? null]
      .filter(Boolean)
      .join(" / ") || "Shop all";

  const activeFilterChips = useMemo(() => {
    const values: FilterChip[] = [];
    if (category !== "All") values.push({ type: "category", label: category });
    if (collection) values.push({ type: "collection", label: collection.replaceAll("-", " ") });
    for (const value of conditions) {
      values.push({ type: "condition", label: `Grade ${value}`, value });
    }
    for (const value of inventories) {
      values.push({
        type: "inventory",
        label: inventoryLabel(value as Product["inventory"]),
        value,
      });
    }
    if (inStock) values.push({ type: "stock", label: "In stock" });
    if (maxPrice) values.push({ type: "price", label: `Under ${money(maxPrice)}` });
    if (search) values.push({ type: "search", label: `Search: ${search}` });
    return values;
  }, [category, collection, conditions, inStock, inventories, maxPrice, search]);

  const savedList = useMemo(
    () => products.filter((product) => saved.has(product.id)),
    [products, saved],
  );
  const recentList = useMemo(
    () => recent.map(findProduct).filter((product): product is Product => Boolean(product)),
    [findProduct, recent],
  );
  const cartLines = useMemo(
    () =>
      cart.flatMap((line) => {
        const product = findProduct(line.productId);
        return product
          ? [
              {
                product,
                lineKey: line.key,
                lineQty: line.qty,
                variantId: line.variantId,
                variantLabel: line.variantLabel,
                colour: line.colour,
                size: line.size,
                unitPriceNaira: line.unitPriceNaira,
              },
            ]
          : [];
      }),
    [cart, findProduct],
  );
  const cartCount = cartLines.reduce((sum, line) => sum + line.lineQty, 0);
  const subtotal = cartSubtotal(cart);
  const searchResults = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return null;
    return products
      .filter((product) =>
        [
          product.name,
          product.brand,
          product.category,
          product.type,
          product.style,
          `Grade ${product.condition}`,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
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
    </StorefrontContext.Provider>
  );
}
