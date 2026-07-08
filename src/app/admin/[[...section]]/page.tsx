"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  Clock,
  Eye,
  FileCheck2,
  ImagePlus,
  Inbox,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PackageOpen,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  TimerReset,
  UserRound,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Progress,
  ProgressLabel,
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { naira, pdpHref, plpItems, type PlpProduct, type ProductState } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

type AdminSection = "overview" | "inventory" | "intake" | "orders" | "holds" | "offline" | "customers" | "settings";
type SurfaceState = "default" | "loading" | "error" | "empty" | "success";
type AdminItemState = ProductState | "draft";
type OrderStatus = "paid" | "processing" | "packed" | "out-for-delivery" | "delivered" | "cancelled";
type PaymentState = "paid" | "pending" | "deposit" | "failed";
type ToastTone = "success" | "info" | "danger";

type AdminItem = Omit<PlpProduct, "state"> & {
  archiveNo: string;
  published: boolean;
  state: AdminItemState;
  source: "catalogue" | "draft";
  confidence: number;
  lastTouched: string;
};

type AdminOrder = {
  id: string;
  customer: string;
  email: string;
  phone: string;
  itemIds: string[];
  amount: number;
  deliveryZone: string;
  status: OrderStatus;
  payment: PaymentState;
  placedAt: string;
  note: string;
};

type AdminHold = {
  id: string;
  itemId: string;
  customer: string;
  channel: string;
  secondsLeft: number;
  startedAt: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  holds: number;
  city: string;
  lastSeen: string;
};

type ActivityItem = {
  id: string;
  title: string;
  meta: string;
  tone: "good" | "warn" | "neutral";
};

type DraftItem = {
  id: string;
  title: string;
  category: string;
  confidence: number;
  photos: number;
  missing: string[];
};

type OfflineForm = {
  channel: string;
  buyer: string;
  price: string;
  note: string;
};

const sections: Array<{ key: AdminSection; label: string; icon: React.ReactNode; description: string }> = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard />, description: "Daily health, blockers, and owner actions." },
  { key: "inventory", label: "Inventory", icon: <Boxes />, description: "Live, held, sold, and draft one-of-one pieces." },
  { key: "intake", label: "Intake", icon: <ImagePlus />, description: "Photo-led listing workflow for new finds." },
  { key: "orders", label: "Orders", icon: <ShoppingBag />, description: "Payment, packing, delivery, and exceptions." },
  { key: "holds", label: "Holds", icon: <Clock />, description: "Active reservations and expiring carts." },
  { key: "offline", label: "Offline sales", icon: <Store />, description: "Mark IG, WhatsApp, and DM sales truthfully." },
  { key: "customers", label: "Customers", icon: <UserRound />, description: "Operational customer context, not CRM bloat." },
  { key: "settings", label: "Settings", icon: <Settings />, description: "Store profile, zones, and notification defaults." },
];

const stateLabels: Record<AdminItemState, string> = {
  available: "Available",
  lastone: "Live",
  resYou: "Held by you",
  resOthers: "Held by shopper",
  sold: "Sold",
  draft: "Draft",
};

const ordersSeed: AdminOrder[] = [
  { id: "LS-20481", customer: "Amara Okafor", email: "amara@example.com", phone: "+234 801 234 5678", itemIds: ["p2", "p14"], amount: 50000, deliveryZone: "Lagos / Ikeja", status: "processing", payment: "paid", placedAt: "Today, 10:42", note: "Pack with address card. Customer asked for WhatsApp update." },
  { id: "LS-20479", customer: "Tomi Adeyemi", email: "tomi@example.com", phone: "+234 803 112 4455", itemIds: ["p8"], amount: 31000, deliveryZone: "Lagos / Lekki", status: "paid", payment: "deposit", placedAt: "Today, 09:18", note: "Pay-on-delivery deposit confirmed. Balance due at drop-off." },
  { id: "LS-20334", customer: "Nneka Obi", email: "nneka@example.com", phone: "+234 809 881 4021", itemIds: ["p16"], amount: 26000, deliveryZone: "Enugu", status: "out-for-delivery", payment: "paid", placedAt: "Yesterday, 17:03", note: "Interstate dispatch. Share waybill once rider confirms." },
  { id: "LS-20190", customer: "Musa Bello", email: "musa@example.com", phone: "+234 806 557 3310", itemIds: ["p23"], amount: 19000, deliveryZone: "Abuja", status: "delivered", payment: "paid", placedAt: "Jun 28, 15:45", note: "Delivered. Item is now permanently rehomed." },
];

const holdsSeed: AdminHold[] = [
  { id: "hold-vest", itemId: "p2", customer: "Amara Okafor", channel: "Checkout", secondsLeft: 812, startedAt: "10:42" },
  { id: "hold-shell", itemId: "p8", customer: "Tomi Adeyemi", channel: "Cart", secondsLeft: 537, startedAt: "09:18" },
  { id: "hold-skirt", itemId: "p17", customer: "Guest shopper", channel: "PLP", secondsLeft: 384, startedAt: "11:04" },
];

const customers: Customer[] = [
  { id: "cus-amara", name: "Amara Okafor", email: "amara@example.com", phone: "+234 801 234 5678", orders: 4, holds: 2, city: "Ikeja", lastSeen: "12 min ago" },
  { id: "cus-tomi", name: "Tomi Adeyemi", email: "tomi@example.com", phone: "+234 803 112 4455", orders: 2, holds: 1, city: "Lekki", lastSeen: "24 min ago" },
  { id: "cus-nneka", name: "Nneka Obi", email: "nneka@example.com", phone: "+234 809 881 4021", orders: 3, holds: 0, city: "Enugu", lastSeen: "Yesterday" },
  { id: "cus-musa", name: "Musa Bello", email: "musa@example.com", phone: "+234 806 557 3310", orders: 1, holds: 0, city: "Abuja", lastSeen: "Jun 28" },
];

const activity: ActivityItem[] = [
  { id: "act-1", title: "Sage Field Vest entered checkout", meta: "Hold expires in under 14 minutes", tone: "warn" },
  { id: "act-2", title: "Daisy Field Dress dispatched interstate", meta: "Waybill needed for customer timeline", tone: "neutral" },
  { id: "act-3", title: "Sporty Windbreaker marked rehomed", meta: "Sold archive stays visible on storefront", tone: "good" },
  { id: "act-4", title: "Two intake drafts need price review", meta: "Auto-fill confidence below 80%", tone: "warn" },
];

const drafts: DraftItem[] = [
  { id: "draft-1", title: "Ivory linen wrap skirt", category: "Skirts", confidence: 78, photos: 4, missing: ["measurements", "flaws"] },
  { id: "draft-2", title: "Charcoal cropped blazer", category: "Blazers", confidence: 86, photos: 6, missing: ["price"] },
  { id: "draft-3", title: "Sage ribbed polo", category: "Tees", confidence: 71, photos: 3, missing: ["condition", "archive no"] },
];

const settingsRows = [
  { label: "Hold duration", value: "15 minutes", detail: "Shared by cart, PDP, checkout, and Admin holds." },
  { label: "Delivery zones", value: "Lagos / Interstate / Pickup", detail: "Rates and ETA are still configured outside this UI." },
  { label: "Payment methods", value: "Card, transfer, USSD, POD deposit", detail: "Payment status sync is a backend boundary." },
  { label: "Notification sender", value: "care@laitstyle.ng", detail: "Email and SMS templates mirror in-app confirmations." },
];

const validSections = new Set<AdminSection>(sections.map((section) => section.key));

function buildInventory(): AdminItem[] {
  const live = plpItems.map((item, index) => ({
    ...item,
    archiveNo: `LS-${String(index + 42).padStart(4, "0")}`,
    published: item.state !== "sold",
    source: "catalogue" as const,
    confidence: item.state === "sold" ? 100 : 91 - (index % 5) * 3,
    lastTouched: index < 4 ? "Today" : index < 12 ? "Yesterday" : "This week",
  }));

  const draft: AdminItem = {
    ...plpItems[0],
    id: "draft-wrap-skirt",
    rank: 99,
    name: "Ivory linen wrap skirt",
    category: "Skirts",
    size: "M",
    color: "Ivory",
    condition: "Good",
    price: 0,
    original: 0,
    state: "draft",
    brand: "Intake",
    era: "Minimal",
    archiveNo: "Draft",
    published: false,
    source: "draft",
    confidence: 78,
    lastTouched: "8 min ago",
  };

  return [draft, ...live];
}

export default function AdminPage() {
  const params = useParams<{ section?: string[] }>();
  const sectionParam = params.section?.[0] as AdminSection | undefined;
  const activeSection = sectionParam && validSections.has(sectionParam) ? sectionParam : "overview";
  const [inventory, setInventory] = useState<AdminItem[]>(() => buildInventory());
  const [holds, setHolds] = useState<AdminHold[]>(holdsSeed);
  const [orders, setOrders] = useState<AdminOrder[]>(ordersSeed);
  const [surfaceState, setSurfaceState] = useState<SurfaceState>("default");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pieceOpen, setPieceOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState<AdminOrder | null>(null);
  const [offlineItem, setOfflineItem] = useState<AdminItem | null>(null);
  const [confirmOffline, setConfirmOffline] = useState(false);
  const [offlineForm, setOfflineForm] = useState<OfflineForm>({ channel: "WhatsApp", buyer: "", price: "", note: "" });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: ToastTone; title: string; msg: string } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHolds((current) => current.map((hold) => ({ ...hold, secondsLeft: Math.max(hold.secondsLeft - 1, 0) })));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const byId = useMemo(() => Object.fromEntries(inventory.map((item) => [item.id, item])), [inventory]);
  const activeHolds = holds.filter((hold) => hold.secondsLeft > 0);
  const liveCount = inventory.filter((item) => item.published && item.state !== "sold" && item.state !== "draft").length;
  const draftCount = inventory.filter((item) => item.state === "draft").length;
  const needsAction = orders.filter((order) => order.payment !== "paid" || order.status === "paid").length + drafts.filter((draft) => draft.confidence < 80).length;
  const revenue = orders.filter((order) => order.payment === "paid" || order.payment === "deposit").reduce((sum, order) => sum + order.amount, 0);
  const soonestHold = activeHolds.reduce((min, hold) => Math.min(min, hold.secondsLeft), activeHolds[0]?.secondsLeft ?? 0);

  function showToast(tone: ToastTone, title: string, msg: string) {
    setToast({ tone, title, msg });
    window.setTimeout(() => setToast(null), 3200);
  }

  function changeStatus(order: AdminOrder, status: OrderStatus) {
    // INTEGRATION: Persist order status transitions and notify the customer timeline server-side.
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    setOrderOpen((current) => current && current.id === order.id ? { ...current, status } : current);
    showToast("success", "Order updated", `${order.id} moved to ${statusLabel(status)}.`);
  }

  function togglePublish(item: AdminItem) {
    // INTEGRATION: Persist publish/unpublish and invalidate storefront catalogue cache.
    const actionId = `publish-${item.id}`;
    setPendingAction(actionId);
    window.setTimeout(() => {
      setInventory((current) => current.map((row) => row.id === item.id ? { ...row, published: !row.published } : row));
      setPendingAction(null);
      showToast("success", item.published ? "Piece unpublished" : "Piece published", `${item.name} is now ${item.published ? "hidden from" : "visible on"} the storefront.`);
    }, 450);
  }

  function releaseHold(holdId: string) {
    // INTEGRATION: Release the server-side hold and broadcast item availability.
    setHolds((current) => current.filter((hold) => hold.id !== holdId));
    showToast("info", "Hold released", "The piece is available again if no checkout race is active.");
  }

  function extendHold(holdId: string) {
    // INTEGRATION: Extend hold TTL only after backend verifies the item is still reserved by this shopper.
    setHolds((current) => current.map((hold) => hold.id === holdId ? { ...hold, secondsLeft: hold.secondsLeft + 300 } : hold));
    showToast("success", "Hold extended", "Five minutes added to the reservation window.");
  }

  function reserveItem(item: AdminItem) {
    // INTEGRATION: Acquire hold with server-side single-quantity race protection.
    setInventory((current) => current.map((row) => row.id === item.id ? { ...row, state: "resYou" } : row));
    setHolds((current) => [{ id: `hold-${item.id}`, itemId: item.id, customer: "Owner preview", channel: "Admin", secondsLeft: 900, startedAt: "Now" }, ...current]);
    showToast("success", "Piece held", `${item.name} is reserved for owner review.`);
  }

  function saveDraft() {
    // INTEGRATION: Persist listing draft, uploaded asset references, AI extraction metadata, and validation errors.
    setPieceOpen(false);
    showToast("success", "Draft saved", "The intake piece is ready for photo and measurement review.");
  }

  function openOffline(item: AdminItem) {
    setOfflineItem(item);
    setOfflineForm({ channel: "WhatsApp", buyer: "", price: item.price ? String(item.price) : "", note: "" });
  }

  function confirmOfflineSale() {
    if (!offlineItem) return;
    // INTEGRATION: Persist permanent offline sale, convert active holds/orders if needed, and notify waitlist shoppers.
    setInventory((current) => current.map((row) => row.id === offlineItem.id ? { ...row, state: "sold", published: true, price: Number(offlineForm.price) || row.price } : row));
    setHolds((current) => current.filter((hold) => hold.itemId !== offlineItem.id));
    setConfirmOffline(false);
    setOfflineItem(null);
    showToast("success", "Offline sale recorded", `${offlineItem.name} is now marked sold across Admin and storefront states.`);
  }

  const section = sections.find((item) => item.key === activeSection) ?? sections[0];

  return (
    <TooltipProvider>
      <div className="min-h-dvh bg-background text-foreground">
        <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
          <AdminSidebar active={activeSection} className="hidden lg:flex" liveCount={liveCount} needsAction={needsAction} />
          <main className="min-w-0">
            <AdminTopbar
              active={activeSection}
              draftCount={draftCount}
              liveCount={liveCount}
              mobileNavOpen={mobileNavOpen}
              setMobileNavOpen={setMobileNavOpen}
              setPieceOpen={setPieceOpen}
              setSearchOpen={setSearchOpen}
              setSurfaceState={setSurfaceState}
              surfaceState={surfaceState}
            />

            <div className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Owner operations / {section.label}</p>
                  <h1 className="text-balance font-serif text-[34px] font-medium leading-[1.02] tracking-[-.02em] sm:text-[44px]">
                    Keep every one-of-one piece truthful.
                  </h1>
                  <p className="mt-3 max-w-[760px] text-[14.5px] leading-[1.65] text-muted-foreground">
                    The Admin control room joins intake, holds, paid orders, and offline sales so Laitstyle never sells the same piece twice.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={`${activeHolds.length} active holds`} tone="warn" />
                  <StatusPill label={`${formatSeconds(soonestHold)} soonest release`} tone="neutral" />
                </div>
              </div>

              <MobileSectionTabs active={activeSection} />

              <StateShell state={surfaceState} section={section.label} onRetry={() => setSurfaceState("default")}>
                {activeSection === "overview" ? (
                  <OverviewSection activeHolds={activeHolds} draftCount={draftCount} inventory={inventory} needsAction={needsAction} orders={orders} revenue={revenue} setActiveOrder={setOrderOpen} />
                ) : null}
                {activeSection === "inventory" ? (
                  <InventorySection inventory={inventory} onMarkOffline={openOffline} onReserve={reserveItem} onTogglePublish={togglePublish} pendingAction={pendingAction} />
                ) : null}
                {activeSection === "intake" ? (
                  <IntakeSection drafts={drafts} onNewPiece={() => setPieceOpen(true)} />
                ) : null}
                {activeSection === "orders" ? (
                  <OrdersSection byId={byId} onOpen={setOrderOpen} orders={orders} />
                ) : null}
                {activeSection === "holds" ? (
                  <HoldsSection byId={byId} holds={activeHolds} onExtend={extendHold} onRelease={releaseHold} />
                ) : null}
                {activeSection === "offline" ? (
                  <OfflineSection inventory={inventory} onMarkOffline={openOffline} />
                ) : null}
                {activeSection === "customers" ? (
                  <CustomersSection customers={customers} />
                ) : null}
                {activeSection === "settings" ? (
                  <SettingsSection />
                ) : null}
              </StateShell>
            </div>
          </main>
        </div>

        <AdminSearch open={searchOpen} setOpen={setSearchOpen} inventory={inventory} orders={orders} />
        <PieceDialog open={pieceOpen} onOpenChange={setPieceOpen} onSave={saveDraft} />
        <OrderSheet byId={byId} onStatusChange={changeStatus} order={orderOpen} setOrder={setOrderOpen} />
        <OfflineSaleDialog
          form={offlineForm}
          item={offlineItem}
          onChange={setOfflineForm}
          onConfirm={() => setConfirmOffline(true)}
          onOpenChange={(open) => !open && setOfflineItem(null)}
        />
        <AlertDialog open={confirmOffline} onOpenChange={setConfirmOffline}>
          <AlertDialogContent className="rounded-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-2xl font-medium">Mark this piece sold offline?</AlertDialogTitle>
              <AlertDialogDescription>
                This is permanent in the one-of-one model. Active holds will be released, the storefront will show the item as sold, and waitlist shoppers should be notified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Review again</AlertDialogCancel>
              <AlertDialogAction onClick={confirmOfflineSale}>Record offline sale</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {toast ? <AdminToast dismiss={() => setToast(null)} toast={toast} /> : null}
      </div>
    </TooltipProvider>
  );
}

function AdminSidebar({ active, className, liveCount, needsAction }: { active: AdminSection; className?: string; liveCount: number; needsAction: number }) {
  return (
    <aside className={cn("sticky top-0 h-dvh flex-col border-r border-border bg-[#F0EEE8] px-3 py-4", className)}>
      <Link className="mb-5 flex min-h-12 items-center gap-3 rounded-[14px] px-3" href="/admin">
        <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><Store className="size-4" /></span>
        <span>
          <span className="block font-serif text-[22px] font-medium">Laitstyle</span>
          <span className="block text-[11px] uppercase tracking-[.08em] text-muted-foreground">Control room</span>
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {sections.map((item) => (
          <Link
            className={cn("flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[13.5px] text-[#57554E] transition-colors hover:bg-card hover:text-foreground", active === item.key && "bg-card text-foreground shadow-[0_1px_0_rgba(0,0,0,.04)]")}
            href={item.key === "overview" ? "/admin" : `/admin/${item.key}`}
            key={item.key}
          >
            <span className="grid size-7 place-items-center text-accent [&_svg]:size-4">{item.icon}</span>
            <span className="min-w-0 flex-1">{item.label}</span>
            {item.key === "inventory" ? <Badge className="rounded-full border-chip-border bg-chip-bg px-2 py-0.5 text-[10px] text-[#4A5540]">{liveCount}</Badge> : null}
            {item.key === "overview" && needsAction ? <Badge className="rounded-full bg-[#FBF3E4] px-2 py-0.5 text-[10px] text-[#8A6D3B]">{needsAction}</Badge> : null}
          </Link>
        ))}
      </nav>
      <Card className="rounded-[14px] border-chip-border bg-chip-bg p-4">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.08em] text-[#4A5540]"><ShieldCheck className="size-4" /> Truth guard</div>
        <p className="text-[12.5px] leading-[1.55] text-[#4A5540]">No quantities, no vendors, no duplicate sales. Every action protects one unique piece.</p>
      </Card>
    </aside>
  );
}

function AdminTopbar(props: {
  active: AdminSection;
  draftCount: number;
  liveCount: number;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  setPieceOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSurfaceState: (state: SurfaceState) => void;
  surfaceState: SurfaceState;
}) {
  const { active, draftCount, liveCount, mobileNavOpen, setMobileNavOpen, setPieceOpen, setSearchOpen, setSurfaceState, surfaceState } = props;

  return (
    <header className="sticky top-0 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-[14px] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-3">
        <Button aria-label="Open admin navigation" className="lg:hidden" onClick={() => setMobileNavOpen(true)} size="icon" variant="outline"><Menu /></Button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10.5px] uppercase tracking-[.08em] text-muted-foreground">Laitstyle Admin</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-[22px] font-medium">{titleForSection(active)}</span>
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">{liveCount} live</Badge>
            <Badge className="rounded-full border-chip-border bg-chip-bg px-2.5 py-1 text-[11px] text-[#4A5540]">{draftCount} drafts</Badge>
          </div>
        </div>
        <Button className="hidden min-w-[280px] justify-start rounded-full border-input bg-card text-muted-foreground hover:bg-card md:flex" onClick={() => setSearchOpen(true)} variant="outline">
          <Search data-icon="inline-start" />
          Search pieces, orders, holds
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[.08em] text-[#A7A59B]">Cmd K</span>
        </Button>
        <Button className="rounded-full" onClick={() => setPieceOpen(true)}><ImagePlus data-icon="inline-start" /> New piece</Button>
        <StateSwitcher setSurfaceState={setSurfaceState} surfaceState={surfaceState} />
      </div>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[312px] bg-[#F0EEE8] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
            <SheetDescription>Move between Laitstyle owner operations sections.</SheetDescription>
          </SheetHeader>
          <AdminSidebar active={active} liveCount={liveCount} needsAction={draftCount} />
        </SheetContent>
      </Sheet>
    </header>
  );
}

function StateSwitcher({ setSurfaceState, surfaceState }: { setSurfaceState: (state: SurfaceState) => void; surfaceState: SurfaceState }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-input bg-card px-3 text-[13px] font-medium">
        <SlidersHorizontal className="size-4" />
        State
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuLabel>Preview state</DropdownMenuLabel>
        <DropdownMenuGroup>
          {(["default", "loading", "error", "empty", "success"] as SurfaceState[]).map((state) => (
            <DropdownMenuItem key={state} onClick={() => setSurfaceState(state)}>
              {state === surfaceState ? <Check /> : null}
              {capitalize(state)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileSectionTabs({ active }: { active: AdminSection }) {
  return (
    <div className="lg:hidden">
      <div className="flex h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0">
        {sections.map((section) => (
          <Link className={cn("inline-flex h-10 shrink-0 items-center rounded-full border border-border bg-card px-4 text-[13px]", active === section.key && "bg-primary text-primary-foreground")} href={section.key === "overview" ? "/admin" : `/admin/${section.key}`} key={section.key}>{section.label}</Link>
        ))}
      </div>
    </div>
  );
}

function StateShell({ children, onRetry, section, state }: { children: React.ReactNode; onRetry: () => void; section: string; state: SurfaceState }) {
  if (state === "loading") return <LoadingState section={section} />;
  if (state === "error") return <ErrorState onRetry={onRetry} section={section} />;
  if (state === "empty") return <EmptyState section={section} />;

  return (
    <div className="flex flex-col gap-6">
      {state === "success" ? (
        <Alert className="rounded-[14px] border-chip-border bg-chip-bg">
          <Check className="size-4 text-accent" />
          <AlertTitle>Action recorded</AlertTitle>
          <AlertDescription>The Admin UI has updated locally. Server persistence remains marked with integration comments.</AlertDescription>
        </Alert>
      ) : null}
      {children}
    </div>
  );
}

function OverviewSection(props: {
  activeHolds: AdminHold[];
  draftCount: number;
  inventory: AdminItem[];
  needsAction: number;
  orders: AdminOrder[];
  revenue: number;
  setActiveOrder: (order: AdminOrder) => void;
}) {
  const { activeHolds, draftCount, inventory, needsAction, orders, revenue, setActiveOrder } = props;
  const live = inventory.filter((item) => item.published && item.state !== "sold" && item.state !== "draft").length;
  const sold = inventory.filter((item) => item.state === "sold").length;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<PackageOpen />} label="Live pieces" value={String(live)} detail={`${sold} in sold archive`} />
        <MetricCard icon={<Clock />} label="Held now" value={String(activeHolds.length)} detail="TTL must stay visible" tone="warn" />
        <MetricCard icon={<ShoppingBag />} label="Orders today" value={String(orders.filter((order) => order.placedAt.startsWith("Today")).length)} detail={`${orders.length} open records`} />
        <MetricCard icon={<BarChart3 />} label="Revenue estimate" value={naira(revenue)} detail="Paid + deposit orders" />
        <MetricCard icon={<AlertTriangle />} label="Needs action" value={String(needsAction)} detail={`${draftCount} drafts need review`} tone="danger" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <Card className="rounded-[14px] p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Ops queue</p>
              <h2 className="font-serif text-2xl font-medium">What needs owner judgment</h2>
            </div>
            <Badge className="rounded-full border-[#EAD9B8] bg-[#FBF3E4] px-3 py-1 text-[#8A6D3B]">Live checks</Badge>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <OpsCard icon={<TimerReset />} title="Reserved pieces expiring" detail={`${activeHolds.length} active holds. Soonest release in ${formatSeconds(activeHolds[0]?.secondsLeft ?? 0)}.`} action="Review holds" href="/admin/holds" />
            <OpsCard icon={<FileCheck2 />} title="Payment follow-up" detail="One POD deposit order needs a packing decision before dispatch." action="Open orders" href="/admin/orders" />
            <OpsCard icon={<Sparkles />} title="Low confidence drafts" detail="Two intake drafts are below the 80% auto-fill confidence line." action="Review intake" href="/admin/intake" />
            <OpsCard icon={<Store />} title="Offline reconciliation" detail="Keep IG and WhatsApp sales in sync with the storefront sold archive." action="Record sale" href="/admin/offline" />
          </div>
        </Card>

        <Card className="rounded-[14px] p-0">
          <div className="border-b border-border px-5 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Recent activity</p>
            <h2 className="font-serif text-2xl font-medium">Storefront truth log</h2>
          </div>
          <div className="flex flex-col gap-3 p-4">
            {activity.map((item) => <ActivityRow item={item} key={item.id} />)}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-[14px] p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Orders</p>
              <h2 className="font-serif text-2xl font-medium">Today and open</h2>
            </div>
            <Link className="inline-flex h-10 items-center rounded-full border border-input bg-card px-4 text-sm font-medium hover:bg-card" href="/admin/orders">All orders</Link>
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 4).map((order) => (
                  <TableRow key={order.id} onClick={() => setActiveOrder(order)}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell><OrderBadge status={order.status} /></TableCell>
                    <TableCell><PaymentBadge payment={order.payment} /></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{naira(order.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {orders.slice(0, 4).map((order) => <OrderCard key={order.id} onOpen={setActiveOrder} order={order} />)}
          </div>
        </Card>

        <RightRail activeHolds={activeHolds} />
      </section>
    </>
  );
}

function InventorySection({ inventory, onMarkOffline, onReserve, onTogglePublish, pendingAction }: { inventory: AdminItem[]; onMarkOffline: (item: AdminItem) => void; onReserve: (item: AdminItem) => void; onTogglePublish: (item: AdminItem) => void; pendingAction: string | null }) {
  return (
    <Card className="rounded-[14px] p-0">
      <SectionHeader action={<Link className="inline-flex h-10 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium hover:bg-card" href="/admin/intake"><ImagePlus className="size-4" /> Intake piece</Link>} kicker="Inventory" title="One-of-one catalogue state" />
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Piece</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Auto-fill</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Image alt={item.name} className="size-12 rounded-[10px] object-cover" height={48} src={item.image} width={48} />
                    <div>
                      <Link className="font-medium hover:text-accent" href={pdpHref(item.id)}>{item.name}</Link>
                      <div className="mt-1 text-xs text-muted-foreground">{item.archiveNo} / {item.category} / {item.size} / {item.condition}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><InventoryStateBadge state={item.state} /></TableCell>
                <TableCell className="font-semibold tabular-nums">{item.price ? naira(item.price) : "Needs price"}</TableCell>
                <TableCell>
                  <div className="min-w-[120px]">
                    <Progress value={item.confidence}>
                      <ProgressLabel className="sr-only">Auto-fill confidence</ProgressLabel>
                      <span className="ml-auto text-sm text-muted-foreground tabular-nums">{item.confidence}%</span>
                    </Progress>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.lastTouched}</TableCell>
                <TableCell className="text-right">
                  <InventoryActions item={item} onMarkOffline={onMarkOffline} onReserve={onReserve} onTogglePublish={onTogglePublish} pendingAction={pendingAction === `publish-${item.id}`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 p-4 lg:hidden">
        {inventory.map((item) => <InventoryCard item={item} key={item.id} onMarkOffline={onMarkOffline} onReserve={onReserve} onTogglePublish={onTogglePublish} pendingAction={pendingAction === `publish-${item.id}`} />)}
      </div>
    </Card>
  );
}

function IntakeSection({ drafts, onNewPiece }: { drafts: DraftItem[]; onNewPiece: () => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="rounded-[14px] p-0">
        <SectionHeader action={<Button className="rounded-full" onClick={onNewPiece}><ImagePlus data-icon="inline-start" /> Add piece</Button>} kicker="Intake" title="Fast listing for unique finds" />
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <div className="rounded-[14px] border border-dashed border-input bg-[#FBFAF6] p-5 md:col-span-1">
            <div className="grid min-h-[240px] place-items-center rounded-[12px] bg-background text-center">
              <div>
                <ImagePlus className="mx-auto mb-3 size-9 text-accent" />
                <h3 className="font-serif text-2xl font-medium">Drop product photos</h3>
                <p className="mx-auto mt-2 max-w-[260px] text-sm leading-[1.55] text-muted-foreground">Upload the front, back, label, flaw, and measurement shots before publishing.</p>
                <Button className="mt-4 rounded-full" onClick={onNewPiece}>Start draft</Button>
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="grid gap-3">
              {drafts.map((draft) => (
                <Card className="rounded-[14px] border-border bg-card p-4" key={draft.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">{draft.category} / {draft.photos} photos</p>
                      <h3 className="mt-1 font-serif text-[24px] font-medium">{draft.title}</h3>
                    </div>
                    <Badge className={cn("rounded-full px-3 py-1", draft.confidence < 80 ? "border-[#EAD9B8] bg-[#FBF3E4] text-[#8A6D3B]" : "border-chip-border bg-chip-bg text-[#4A5540]")}>{draft.confidence}% confidence</Badge>
                  </div>
                  <Progress className="mt-4" value={draft.confidence}>
                    <ProgressLabel>Auto-fill confidence</ProgressLabel>
                    <span className="ml-auto text-sm text-muted-foreground tabular-nums">{draft.confidence}%</span>
                  </Progress>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {draft.missing.map((item) => <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]" key={item}>Needs {item}</Badge>)}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[14px] p-5">
        <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Workflow</p>
        <h2 className="mt-1 font-serif text-2xl font-medium">Publish checklist</h2>
        <div className="mt-5 flex flex-col gap-3">
          {["Photos uploaded", "Condition graded", "Flaws noted", "Measurements captured", "Price reviewed", "Archive number assigned"].map((item, index) => (
            <Label className="flex items-center gap-3 text-sm" key={item}>
              <Checkbox checked={index < 3} readOnly />
              {item}
            </Label>
          ))}
        </div>
        <Alert className="mt-5 rounded-[14px] border-chip-border bg-chip-bg">
          <Sparkles className="size-4 text-accent" />
          <AlertTitle>Auto-fill is advisory</AlertTitle>
          <AlertDescription>Owner review remains required before a one-of-one piece can go live.</AlertDescription>
        </Alert>
      </Card>
    </div>
  );
}

function OrdersSection({ byId, onOpen, orders }: { byId: Record<string, AdminItem>; onOpen: (order: AdminOrder) => void; orders: AdminOrder[] }) {
  return (
    <Card className="rounded-[14px] p-0">
      <SectionHeader kicker="Orders" title="Payment, packing, and delivery" />
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Pieces</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow className="cursor-pointer" key={order.id} onClick={() => onOpen(order)}>
                <TableCell className="font-mono text-xs">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{order.itemIds.map((id) => byId[id]?.name ?? id).join(", ")}</TableCell>
                <TableCell><OrderBadge status={order.status} /></TableCell>
                <TableCell><PaymentBadge payment={order.payment} /></TableCell>
                <TableCell>{order.deliveryZone}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{naira(order.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 p-4 lg:hidden">
        {orders.map((order) => <OrderCard key={order.id} onOpen={onOpen} order={order} />)}
      </div>
    </Card>
  );
}

function HoldsSection({ byId, holds, onExtend, onRelease }: { byId: Record<string, AdminItem>; holds: AdminHold[]; onExtend: (id: string) => void; onRelease: (id: string) => void }) {
  return (
    <Card className="rounded-[14px] p-0">
      <SectionHeader kicker="Holds" title="Active reservations and TTL" />
      <div className="grid gap-3 p-4">
        {holds.map((hold) => {
          const item = byId[hold.itemId];
          return (
            <Card className="rounded-[14px] border-chip-border bg-chip-bg p-4" key={hold.id}>
              <div className="flex flex-wrap items-center gap-4">
                {item ? <Image alt={item.name} className="size-16 rounded-[12px] object-cover" height={64} src={item.image} width={64} /> : null}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] uppercase tracking-[.08em] text-[#4A5540]">{hold.channel} hold / started {hold.startedAt}</p>
                  <h3 className="mt-1 font-serif text-[24px] font-medium">{item?.name ?? hold.itemId}</h3>
                  <p className="text-sm text-[#4A5540]">{hold.customer}</p>
                </div>
                <div className="rounded-full bg-card px-4 py-2 font-mono text-sm font-semibold tabular-nums">{formatSeconds(hold.secondsLeft)}</div>
                <div className="flex gap-2">
                  <Button className="rounded-full" onClick={() => onExtend(hold.id)} variant="outline">Extend 5m</Button>
                  <Button className="rounded-full" onClick={() => onRelease(hold.id)} variant="outline">Release</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}

function OfflineSection({ inventory, onMarkOffline }: { inventory: AdminItem[]; onMarkOffline: (item: AdminItem) => void }) {
  const saleable = inventory.filter((item) => item.state !== "sold" && item.state !== "draft");

  return (
    <Card className="rounded-[14px] p-0">
      <SectionHeader kicker="Offline sales" title="Record IG and WhatsApp rehomes" />
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {saleable.slice(0, 9).map((item) => (
          <InventoryCard item={item} key={item.id} onMarkOffline={onMarkOffline} onReserve={() => undefined} onTogglePublish={() => undefined} offlineFocused />
        ))}
      </div>
    </Card>
  );
}

function CustomersSection({ customers }: { customers: Customer[] }) {
  return (
    <Card className="rounded-[14px] p-0">
      <SectionHeader kicker="Customers" title="Operational customer context" />
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        {customers.map((customer) => (
          <Card className="rounded-[14px] p-4" key={customer.id}>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-[#F0EEE8] font-serif text-xl">{customer.name[0]}</span>
              <div>
                <h3 className="font-medium">{customer.name}</h3>
                <p className="text-xs text-muted-foreground">{customer.city} / seen {customer.lastSeen}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-[12px] bg-background p-3"><span className="block text-xs text-muted-foreground">Orders</span><strong>{customer.orders}</strong></div>
              <div className="rounded-[12px] bg-background p-3"><span className="block text-xs text-muted-foreground">Holds</span><strong>{customer.holds}</strong></div>
            </div>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">{customer.email}</p>
            <p className="mt-1 text-sm text-muted-foreground">{customer.phone}</p>
          </Card>
        ))}
      </div>
    </Card>
  );
}

function SettingsSection() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="rounded-[14px] p-0">
        <SectionHeader kicker="Settings" title="Store operations defaults" />
        <div className="grid gap-3 p-4">
          {settingsRows.map((row) => (
            <Card className="rounded-[14px] p-4" key={row.label}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{row.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{row.detail}</p>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1">{row.value}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </Card>
      <Card className="rounded-[14px] p-5">
        <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Integration boundaries</p>
        <h2 className="mt-1 font-serif text-2xl font-medium">Not fake-configured</h2>
        <p className="mt-3 text-sm leading-[1.65] text-muted-foreground">
          Store profile, payout, notification, and delivery settings are represented here so the UI is complete, but persistence belongs to backend configuration.
        </p>
        {/* INTEGRATION: Wire admin auth guard, store config, payout account, delivery zones, hold duration, and notification templates to backend settings. */}
      </Card>
    </div>
  );
}

function SectionHeader({ action, kicker, title }: { action?: React.ReactNode; kicker: string; title: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">{kicker}</p>
        <h2 className="font-serif text-2xl font-medium">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MetricCard({ detail, icon, label, tone = "neutral", value }: { detail: string; icon: React.ReactNode; label: string; tone?: "neutral" | "warn" | "danger"; value: string }) {
  return (
    <Card className={cn("rounded-[14px] p-4", tone === "warn" && "border-[#EAD9B8] bg-[#FBF3E4]", tone === "danger" && "border-[#E4C4BF] bg-[#FBF0EE]")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">{label}</p>
          <div className="mt-2 text-[28px] font-semibold tracking-[-.02em] tabular-nums">{value}</div>
        </div>
        <span className="grid size-10 place-items-center rounded-full bg-[#F0EEE8] text-accent [&_svg]:size-5">{icon}</span>
      </div>
      <p className="mt-3 text-[12.5px] leading-[1.45] text-muted-foreground">{detail}</p>
    </Card>
  );
}

function OpsCard({ action, detail, href, icon, title }: { action: string; detail: string; href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link className="group rounded-[14px] border border-border bg-card p-4 transition-colors hover:border-chip-border hover:bg-chip-bg" href={href}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-[#F0EEE8] text-accent [&_svg]:size-5">{icon}</span>
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-sm leading-[1.55] text-muted-foreground">{detail}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground">{action}<ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
    </Link>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex gap-3 rounded-[12px] border border-border bg-card p-3">
      <span className={cn("mt-1 size-2 rounded-full", item.tone === "good" ? "bg-accent" : item.tone === "warn" ? "bg-[#C98932]" : "bg-[#A7A59B]")} />
      <div>
        <h3 className="text-sm font-medium">{item.title}</h3>
        <p className="mt-1 text-xs leading-[1.5] text-muted-foreground">{item.meta}</p>
      </div>
    </div>
  );
}

function RightRail({ activeHolds }: { activeHolds: AdminHold[] }) {
  return (
    <Card className="rounded-[14px] bg-[#20261C] p-5 text-white">
      <p className="font-mono text-[11px] uppercase tracking-[.08em] text-white/60">Hold clock</p>
      <h2 className="mt-1 font-serif text-2xl font-medium text-white">Race protection</h2>
      <p className="mt-3 text-sm leading-[1.6] text-white/70">A hold is not a sale. The owner view keeps the countdown visible so order, cart, and offline channels do not drift.</p>
      <div className="mt-5 flex flex-col gap-3">
        {activeHolds.slice(0, 3).map((hold) => (
          <div className="rounded-[12px] bg-white/8 p-3" key={hold.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white">{hold.customer}</span>
              <span className="font-mono text-sm tabular-nums text-white">{formatSeconds(hold.secondsLeft)}</span>
            </div>
            <Progress className="mt-3" value={Math.max(0, Math.min(100, (hold.secondsLeft / 900) * 100))} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function InventoryActions(props: { item: AdminItem; onMarkOffline: (item: AdminItem) => void; onReserve: (item: AdminItem) => void; onTogglePublish: (item: AdminItem) => void; pendingAction: boolean }) {
  const { item, onMarkOffline, onReserve, onTogglePublish, pendingAction } = props;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Open actions for ${item.name}`} className="inline-flex size-9 items-center justify-center rounded-full border border-input bg-card">
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[190px]">
        <DropdownMenuLabel>{item.archiveNo}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onTogglePublish(item)}>{pendingAction ? <RefreshCw /> : <Eye />}{item.published ? "Unpublish" : "Publish"}</DropdownMenuItem>
          <DropdownMenuItem disabled={item.state === "sold" || item.state === "draft"} onClick={() => onReserve(item)}><Clock />Reserve for review</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMarkOffline(item)} variant="destructive"><Store />Mark sold offline</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { window.location.href = pdpHref(item.id); }}><ArrowUpRight />Open PDP</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InventoryCard(props: { item: AdminItem; offlineFocused?: boolean; onMarkOffline: (item: AdminItem) => void; onReserve: (item: AdminItem) => void; onTogglePublish: (item: AdminItem) => void; pendingAction?: boolean }) {
  const { item, offlineFocused, onMarkOffline, onReserve, onTogglePublish, pendingAction = false } = props;

  return (
    <Card className="overflow-hidden rounded-[14px] p-0">
      <div className="relative aspect-[4/3] bg-[#F0EEE8]">
        <Image alt={item.name} className="object-cover" fill sizes="(max-width: 768px) 100vw, 33vw" src={item.image} />
        <div className="absolute left-3 top-3"><InventoryStateBadge state={item.state} /></div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-[22px] font-medium">{item.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{item.archiveNo} / {item.size} / {item.condition}</p>
          </div>
          <span className="font-semibold tabular-nums">{item.price ? naira(item.price) : "Draft"}</span>
        </div>
        <Progress className="mt-4" value={item.confidence}>
          <ProgressLabel>Auto-fill</ProgressLabel>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">{item.confidence}%</span>
        </Progress>
        <div className="mt-4 flex flex-wrap gap-2">
          {offlineFocused ? (
            <Button className="rounded-full" onClick={() => onMarkOffline(item)}>Record sale</Button>
          ) : (
            <>
              <Button className="rounded-full" disabled={pendingAction} onClick={() => onTogglePublish(item)} variant="outline">{item.published ? "Unpublish" : "Publish"}</Button>
              <Button className="rounded-full" disabled={item.state === "sold" || item.state === "draft"} onClick={() => onReserve(item)} variant="outline">Hold</Button>
              <Button className="rounded-full" onClick={() => onMarkOffline(item)} variant="outline">Sold offline</Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function OrderCard({ onOpen, order }: { onOpen: (order: AdminOrder) => void; order: AdminOrder }) {
  return (
    <Card className="rounded-[14px] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
          <h3 className="mt-1 font-serif text-[24px] font-medium">{order.customer}</h3>
        </div>
        <span className="font-semibold tabular-nums">{naira(order.amount)}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><OrderBadge status={order.status} /><PaymentBadge payment={order.payment} /></div>
      <p className="mt-3 text-sm text-muted-foreground">{order.deliveryZone} / {order.placedAt}</p>
      <Button className="mt-4 rounded-full" onClick={() => onOpen(order)} variant="outline">Open detail</Button>
    </Card>
  );
}

function PieceDialog({ onOpenChange, onSave, open }: { onOpenChange: (open: boolean) => void; onSave: () => void; open: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-64px)] max-w-[940px] overflow-y-auto rounded-[16px] p-0">
        <div className="grid md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="bg-[#F0EEE8] p-6">
            <DialogTitle className="font-serif text-[30px] font-medium leading-tight">New one-of-one piece</DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-[1.6] text-muted-foreground">Capture enough truth to publish once. Drafts can stay private until photo, condition, price, and archive details are reviewed.</DialogDescription>
            <div className="mt-6 rounded-[14px] border border-dashed border-input bg-background p-4 text-center">
              <ImagePlus className="mx-auto mb-3 size-8 text-accent" />
              <p className="text-sm font-medium">Photo drop/select</p>
              <p className="mt-1 text-xs text-muted-foreground">Upload, preview, retry, or remove failed images.</p>
              {/* INTEGRATION: Wire image upload/drop, retry, CDN mirroring, and file validation. */}
            </div>
          </div>
          <div className="p-6">
            <FieldGroup>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field><FieldLabel>Title</FieldLabel><Input defaultValue="Ivory linen wrap skirt" /></Field>
                <Field><FieldLabel>Archive number</FieldLabel><Input defaultValue="LS-0068" /></Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field><FieldLabel>Category</FieldLabel><Select defaultValue="Skirts"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{["Jackets", "Skirts", "Dresses", "Blazers", "Tees", "Accessories"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
                <Field><FieldLabel>Condition</FieldLabel><Select defaultValue="Good"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{["Excellent", "Good", "Visible wear"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
                <Field><FieldLabel>Price</FieldLabel><Input defaultValue="16000" inputMode="numeric" /></Field>
              </div>
              <Field><FieldLabel>Measurements</FieldLabel><Textarea defaultValue="Waist 30in, length 28in. Verify on flat-lay before publish." /></Field>
              <Field><FieldLabel>Flaws and care notes</FieldLabel><Textarea defaultValue="Light mark near inner hem. Steamed and lint-rolled." /></Field>
              <Alert className="rounded-[14px] border-chip-border bg-chip-bg">
                <Sparkles className="size-4 text-accent" />
                <AlertTitle>Auto-fill confidence: 78%</AlertTitle>
                <AlertDescription>Measurements and flaws still need owner review before publishing.</AlertDescription>
              </Alert>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Label className="text-sm"><Checkbox /> Publish after save</Label>
                <div className="flex gap-2">
                  <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
                  <Button onClick={onSave}>Save draft</Button>
                </div>
              </div>
            </FieldGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrderSheet({ byId, onStatusChange, order, setOrder }: { byId: Record<string, AdminItem>; onStatusChange: (order: AdminOrder, status: OrderStatus) => void; order: AdminOrder | null; setOrder: (order: AdminOrder | null) => void }) {
  if (!order) return null;

  return (
    <Sheet open={!!order} onOpenChange={(open) => !open && setOrder(null)}>
      <SheetContent className="w-full overflow-y-auto bg-card p-0 sm:max-w-[540px]" side="right">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle className="font-serif text-[30px] font-medium">{order.id}</SheetTitle>
          <SheetDescription>{order.customer} / {order.deliveryZone}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap gap-2"><OrderBadge status={order.status} /><PaymentBadge payment={order.payment} /></div>
          <Card className="rounded-[14px] p-4">
            <h3 className="mb-3 font-medium">Pieces</h3>
            <div className="flex flex-col gap-3">
              {order.itemIds.map((id) => {
                const item = byId[id];
                return (
                  <div className="flex items-center gap-3" key={id}>
                    {item ? <Image alt={item.name} className="size-14 rounded-[12px] object-cover" height={56} src={item.image} width={56} /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item?.name ?? id}</p>
                      <p className="text-xs text-muted-foreground">{item?.archiveNo ?? "Archive pending"}</p>
                    </div>
                    <span className="font-semibold tabular-nums">{item ? naira(item.price) : ""}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="rounded-[14px] p-4">
            <h3 className="mb-2 font-medium">Customer</h3>
            <p className="text-sm text-muted-foreground">{order.email}</p>
            <p className="mt-1 text-sm text-muted-foreground">{order.phone}</p>
            <p className="mt-3 text-sm leading-[1.6]">{order.note}</p>
          </Card>
          <Field>
            <FieldLabel>Move status</FieldLabel>
            <Select value={order.status} onValueChange={(value) => value && onStatusChange(order, value as OrderStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{(["paid", "processing", "packed", "out-for-delivery", "delivered", "cancelled"] as OrderStatus[]).map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            <FieldDescription>Customer timeline and transactional notifications are backend-owned.</FieldDescription>
          </Field>
          {/* INTEGRATION: Sync payment, fulfillment, delivery tracking, refund/cancel state, and customer notifications. */}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OfflineSaleDialog(props: { form: OfflineForm; item: AdminItem | null; onChange: (form: OfflineForm) => void; onConfirm: () => void; onOpenChange: (open: boolean) => void }) {
  const { form, item, onChange, onConfirm, onOpenChange } = props;

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] rounded-[16px]">
        <DialogTitle className="font-serif text-[28px] font-medium">Record offline sale</DialogTitle>
        <DialogDescription>Use this when a piece sells on IG, WhatsApp, or DM before checkout converts.</DialogDescription>
        <FieldGroup>
          <Field>
            <FieldLabel>Piece</FieldLabel>
            <Input readOnly value={item?.name ?? ""} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Channel</FieldLabel>
              <Select value={form.channel} onValueChange={(channel) => onChange({ ...form, channel: channel ?? form.channel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{["WhatsApp", "Instagram DM", "In-person", "Phone"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field><FieldLabel>Sold price</FieldLabel><Input inputMode="numeric" onChange={(event) => onChange({ ...form, price: event.target.value })} value={form.price} /></Field>
          </div>
          <Field><FieldLabel>Buyer note</FieldLabel><Input onChange={(event) => onChange({ ...form, buyer: event.target.value })} placeholder="Name or reference" value={form.buyer} /></Field>
          <Field><FieldLabel>Internal note</FieldLabel><Textarea onChange={(event) => onChange({ ...form, note: event.target.value })} placeholder="DM reference, pickup note, or proof of payment" value={form.note} /></Field>
          <Alert className="rounded-[14px] border-[#E4C4BF] bg-[#FBF0EE]">
            <AlertTriangle className="size-4 text-destructive" />
            <AlertTitle>Permanent one-of-one action</AlertTitle>
            <AlertDescription>Sold pieces remain visible for social proof, but the primary action must move to find similar.</AlertDescription>
          </Alert>
          <div className="flex justify-end gap-2">
            <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
            <Button disabled={!form.price} onClick={onConfirm}>Continue</Button>
          </div>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}

function AdminSearch({ inventory, open, orders, setOpen }: { inventory: AdminItem[]; open: boolean; orders: AdminOrder[]; setOpen: (open: boolean) => void }) {
  return (
    <CommandDialog description="Search pieces, orders, holds, and Admin sections." open={open} onOpenChange={setOpen} title="Admin search">
      <Command>
        <CommandInput placeholder="Search Laitstyle operations..." />
        <CommandList>
          <CommandEmpty>No matching Admin record.</CommandEmpty>
          <CommandGroup heading="Sections">
            {sections.map((section) => (
              <CommandItem key={section.key} onSelect={() => setOpen(false)}>
                <Link className="flex w-full items-center gap-2" href={section.key === "overview" ? "/admin" : `/admin/${section.key}`}>
                  {section.icon}{section.label}
                </Link>
                <CommandShortcut>{section.key}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Pieces">
            {inventory.slice(0, 8).map((item) => (
              <CommandItem key={item.id} onSelect={() => setOpen(false)}>
                <Link className="flex w-full items-center justify-between gap-3" href={pdpHref(item.id)}>
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.archiveNo}</span>
                </Link>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Orders">
            {orders.map((order) => <CommandItem key={order.id}>{order.id} / {order.customer}<CommandShortcut>{naira(order.amount)}</CommandShortcut></CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

function LoadingState({ section }: { section: string }) {
  return (
    <div className="grid gap-4">
      <Alert className="rounded-[14px]">
        <RefreshCw className="size-4 animate-spin" />
        <AlertTitle>Loading {section}</AlertTitle>
        <AlertDescription>Skeletons preserve table and card space while Admin data refreshes.</AlertDescription>
      </Alert>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton className="h-32 rounded-[14px]" key={index} />)}</div>
      <Skeleton className="h-[420px] rounded-[14px]" />
    </div>
  );
}

function ErrorState({ onRetry, section }: { onRetry: () => void; section: string }) {
  return (
    <Alert className="rounded-[14px] border-[#E4C4BF] bg-[#FBF0EE]">
      <AlertTriangle className="size-4 text-destructive" />
      <AlertTitle>Could not load {section}</AlertTitle>
      <AlertDescription className="flex flex-col gap-4 pt-2">
        <span>Admin can keep the current screen visible, but the latest operational records need a retry before taking action.</span>
        <Button className="w-fit rounded-full" onClick={onRetry} variant="outline">Retry</Button>
      </AlertDescription>
    </Alert>
  );
}

function EmptyState({ section }: { section: string }) {
  return (
    <Empty className="rounded-[14px] border border-border bg-card py-16">
      <EmptyHeader>
        <EmptyMedia><Inbox className="size-10 text-accent" /></EmptyMedia>
        <EmptyTitle>No {section.toLowerCase()} records yet</EmptyTitle>
        <EmptyDescription>When this operation has records, the Admin surface will show the table, cards, and actions here.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Link className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:text-primary-foreground" href="/admin/intake">Start with intake</Link></EmptyContent>
    </Empty>
  );
}

function AdminToast({ dismiss, toast }: { dismiss: () => void; toast: { tone: ToastTone; title: string; msg: string } }) {
  return (
    <Alert className={cn("fixed bottom-5 right-5 max-w-[360px] rounded-[14px] bg-card shadow-[0_30px_80px_rgba(0,0,0,.14)]", toast.tone === "danger" && "border-[#E4C4BF] bg-[#FBF0EE]", toast.tone === "success" && "border-chip-border bg-chip-bg")}>
      <Activity className="size-4 text-accent" />
      <div className="min-w-0 flex-1">
        <AlertTitle>{toast.title}</AlertTitle>
        <AlertDescription>{toast.msg}</AlertDescription>
      </div>
      <Button aria-label="Dismiss notification" className="size-8 rounded-full" onClick={dismiss} size="icon" variant="ghost"><X /></Button>
    </Alert>
  );
}

function InventoryStateBadge({ state }: { state: AdminItemState }) {
  return <Badge className={stateClass(state)}>{stateLabels[state]}</Badge>;
}

function OrderBadge({ status }: { status: OrderStatus }) {
  return <Badge className={cn("rounded-full px-2.5 py-1 text-[11px]", status === "delivered" ? "border-chip-border bg-chip-bg text-[#4A5540]" : status === "cancelled" ? "border-[#E4C4BF] bg-[#FBF0EE] text-destructive" : "border-[#EAD9B8] bg-[#FBF3E4] text-[#8A6D3B]")}>{statusLabel(status)}</Badge>;
}

function PaymentBadge({ payment }: { payment: PaymentState }) {
  return <Badge className={cn("rounded-full px-2.5 py-1 text-[11px]", payment === "paid" ? "border-chip-border bg-chip-bg text-[#4A5540]" : payment === "failed" ? "border-[#E4C4BF] bg-[#FBF0EE] text-destructive" : "border-[#EAD9B8] bg-[#FBF3E4] text-[#8A6D3B]")}>{capitalize(payment)}</Badge>;
}

function StatusPill({ label, tone }: { label: string; tone: "neutral" | "warn" }) {
  return <span className={cn("inline-flex min-h-9 items-center rounded-full border px-3 text-[12.5px] font-medium", tone === "warn" ? "border-[#EAD9B8] bg-[#FBF3E4] text-[#8A6D3B]" : "border-border bg-card text-muted-foreground")}>{label}</span>;
}

function stateClass(state: AdminItemState) {
  return cn(
    "rounded-full px-2.5 py-1 text-[11px]",
    (state === "available" || state === "lastone") && "border-chip-border bg-chip-bg text-[#4A5540]",
    state === "resYou" && "border-[#DDE3CC] bg-[#EFF1E7] text-[#4A5540]",
    state === "resOthers" && "border-[#EAD9B8] bg-[#FBF3E4] text-[#8A6D3B]",
    state === "sold" && "border-[#E4C4BF] bg-[#FBF0EE] text-destructive",
    state === "draft" && "border-border bg-background text-muted-foreground",
  );
}

function titleForSection(section: AdminSection) {
  return sections.find((item) => item.key === section)?.label ?? "Overview";
}

function statusLabel(status: OrderStatus) {
  return {
    paid: "Paid",
    processing: "Processing",
    packed: "Packed",
    "out-for-delivery": "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  }[status];
}

function formatSeconds(value = 0) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
