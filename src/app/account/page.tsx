"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Check,
  Clock,
  Eye,
  EyeOff,
  Heart,
  Home,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Pin,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  User,
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
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AccountTab = "overview" | "orders" | "reservations" | "wishlist" | "addresses";
type ItemState = "available" | "lastone" | "resYou" | "resOthers" | "sold";
type AuthMode = "signin" | "signup";
type AuthState = "default" | "signing-in" | "success";
type AddressMode = "add" | "edit" | null;
type ToastTone = "default" | "removed" | "notify" | "bag" | "sold";

type AccountItem = {
  id: string;
  name: string;
  cat: string;
  size: string;
  color: string;
  cond: string;
  priceNum: number;
  origNum: number;
  st: ItemState;
  img: string;
  removed?: boolean;
  secondsLeft?: number;
  mins?: number;
};

type Address = {
  id: string;
  type: "Home" | "Work" | "Other";
  customLabel?: string;
  name: string;
  phone: string;
  state: string;
  city: string;
  street: string;
  area?: string;
  isDefault: boolean;
};

type AddressForm = {
  type: "Home" | "Work" | "Other";
  customLabel: string;
  name: string;
  phone: string;
  state: string;
  city: string;
  street: string;
  area: string;
  makeDefault: boolean;
};

const img = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;

const seedItems: AccountItem[] = [
  ["Botanical Print Jacket", "Jackets", "S", "Ivory", "Excellent", 34000, 42000, "lastone", "1mJxRFNyGo2xXT89oLeiuAGZtSvRlw0Jf"],
  ["Sage Field Vest", "Jackets", "M", "Sage", "Excellent", 28000, 35000, "available", "1T0XygfKzp92Id6ch09aTFcUyG8PbIG66"],
  ["Eco Shell Jacket", "Jackets", "M", "Grey", "Excellent", 31000, 39000, "resYou", "1_2N674OlXJWHLw2a0Yh99LPNMlzQ95o_"],
  ["Ivory Zip Jacket", "Jackets", "M", "Cream", "Good", 29000, 37000, "resOthers", "1PDPeY2i810fzrtHsOUIcbh569FWkkNep"],
  ["Bloom Belted Coat", "Coats", "L", "Rust", "Excellent", 45000, 58000, "sold", "1k3j8wbjDh_WYYrHykQo8HPGoLDuLYtpv"],
  ["Daisy Field Dress", "Dresses", "S", "Ivory", "Excellent", 26000, 33000, "available", "1dXXWxCEEg6ezYPsRCK6B1XxD5QpAiZfh"],
  ["Chunky Cable Sweater", "Knitwear", "M", "Rust", "Good", 23000, 29000, "lastone", "127OwSWR8AB6eyu9zzWjc_k7KW3cYa-Uw"],
  ["Linen Camp Shirt", "Shirts", "M", "Cream", "Excellent", 13500, 18000, "available", "1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80"],
].map((row, index) => ({
  id: `w${index}`,
  name: row[0] as string,
  cat: row[1] as string,
  size: row[2] as string,
  color: row[3] as string,
  cond: row[4] as string,
  priceNum: row[5] as number,
  origNum: row[6] as number,
  st: row[7] as ItemState,
  img: img(row[8] as string),
  secondsLeft: row[7] === "resYou" ? 742 - index * 7 : undefined,
  mins: row[7] === "resOthers" ? 4 + (index % 4) : undefined,
}));

const seedAddresses: Address[] = [
  { id: "a1", type: "Home", name: "Amara Okafor", phone: "803 412 7788", state: "Lagos", city: "Ikeja", street: "14 Allen Avenue, Awoyaya Court, Flat 3B", area: "opposite Ikeja City Mall", isDefault: true },
  { id: "a2", type: "Work", name: "Amara Okafor", phone: "701 998 5521", state: "Lagos", city: "Victoria Island", street: "1 Adeola Odeku Street, 4th floor", area: "beside Eko Hotel", isDefault: false },
  { id: "a3", type: "Other", customLabel: "Mum's place", name: "Ngozi Okafor", phone: "806 220 3140", state: "Enugu", city: "Enugu", street: "22 Zik Avenue, Uwani", area: "near Okpara Square", isDefault: false },
];

const stateOptions = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];

const blankAddress: AddressForm = { type: "Home", customLabel: "", name: "", phone: "", state: "Lagos", city: "", street: "", area: "", makeDefault: false };

export default function AccountPage() {
  const [signedIn, setSignedIn] = useState(true);
  const [tab, setTab] = useState<AccountTab>("overview");
  const [items, setItems] = useState<AccountItem[]>(seedItems);
  const [addresses, setAddresses] = useState<Address[]>(seedAddresses);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authState, setAuthState] = useState<AuthState>("default");
  const [authReveal, setAuthReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [authForm, setAuthForm] = useState({ first: "", last: "", email: "", password: "" });
  const [authErrors, setAuthErrors] = useState<Record<string, string>>({});
  const [showAuthErrors, setShowAuthErrors] = useState(false);
  const [pendingTab, setPendingTab] = useState<AccountTab | null>(null);
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [addressMode, setAddressMode] = useState<AddressMode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>(blankAddress);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [addressSaving, setAddressSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [holdsDismissed, setHoldsDismissed] = useState(false);
  const [toast, setToast] = useState<{ tone: ToastTone; title: string; msg: string } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setItems((current) =>
        current.map((item) => {
          if (item.st !== "resYou") return item;
          const next = (item.secondsLeft || 0) - 1;
          return next <= 0 ? { ...item, st: "available", secondsLeft: undefined } : { ...item, secondsLeft: next };
        })
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const active = items.filter((item) => !item.removed);
  const held = active.filter((item) => item.st === "resYou");
  const holdCount = held.length;
  const savedCount = active.length;
  const soonest = held.length ? Math.min(...held.map((item) => item.secondsLeft || 0)) : 0;
  const dropCount = active.filter((item) => item.origNum > item.priceNum && (item.st === "available" || item.st === "lastone")).length;
  const tabTitle = titleForTab(tab);
  const orders = useMemo(() => buildOrders(), []);
  const cartTotal = held.reduce((sum, item) => sum + item.priceNum, 0);
  const recItems = active.filter((item) => (item.st === "available" || item.st === "lastone") && !held.some((heldItem) => heldItem.id === item.id)).slice(0, 6);

  function go(nextTab: AccountTab) {
    if (!signedIn) {
      setPendingTab(nextTab);
      openSignin();
      return;
    }
    setTab(nextTab);
    window.scrollTo({ top: 0 });
  }

  function openSignin() {
    setAuthMode("signin");
    setAuthState("default");
    setShowAuthErrors(false);
    setAuthErrors({});
    setAuthOpen(true);
  }

  function openSignup() {
    setAuthMode("signup");
    setAuthState("default");
    setShowAuthErrors(false);
    setAuthErrors({});
    setAuthOpen(true);
  }

  function submitAuth() {
    if (authState === "signing-in") return;
    const errors = validateAuth(authMode, authForm, terms);
    if (Object.keys(errors).length) {
      setAuthErrors(errors);
      setShowAuthErrors(true);
      return;
    }
    // INTEGRATION: Replace this timer with real auth/session creation, OTP/social login, and profile hydration.
    setAuthErrors({});
    setShowAuthErrors(false);
    setAuthState("signing-in");
    window.setTimeout(() => setAuthState("success"), 1200);
  }

  function finishAuth() {
    setSignedIn(true);
    setAuthOpen(false);
    setAuthState("default");
    setTab(pendingTab || tab || "overview");
    setPendingTab(null);
  }

  function signOut() {
    // INTEGRATION: Replace local sign-out with session invalidation and cache cleanup.
    setSignedIn(false);
    setCartOpen(false);
    setTab("overview");
  }

  function showToast(tone: ToastTone, title: string, msg: string) {
    setToast({ tone, title, msg });
  }

  function unwish(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (item) showToast("removed", "Removed from wishlist", `"${item.name}" is no longer saved.`);
    setItems((current) => current.map((candidate) => (candidate.id === id ? { ...candidate, removed: true } : candidate)));
  }

  function notify(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (item) showToast("notify", "You're on the list", `We'll message you the moment "${item.name}" frees up.`);
    setNotified((current) => ({ ...current, [id]: true }));
  }

  function moveToBag(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (item) showToast("bag", "Moved to your bag", `"${item.name}" is held for you — checkout within 15 minutes.`);
    setHoldsDismissed(false);
    setItems((current) => current.map((candidate) => (candidate.id === id ? { ...candidate, st: "resYou", secondsLeft: 15 * 60 } : candidate)));
  }

  function reserve(id: string) {
    setHoldsDismissed(false);
    setCartOpen(true);
    setItems((current) => current.map((candidate) => (candidate.id === id ? { ...candidate, st: "resYou", secondsLeft: 15 * 60 } : candidate)));
  }

  function release(id: string) {
    setItems((current) => current.map((candidate) => (candidate.id === id ? { ...candidate, st: "available", secondsLeft: undefined } : candidate)));
  }

  function openAddAddress() {
    setAddressErrors({});
    setAddressSaving(false);
    setEditId(null);
    setAddressForm({ ...blankAddress, makeDefault: addresses.length === 0 });
    setAddressMode("add");
  }

  function openEditAddress(address: Address) {
    setAddressErrors({});
    setAddressSaving(false);
    setEditId(address.id);
    setAddressForm({ type: address.type, customLabel: address.customLabel || "", name: address.name, phone: address.phone, state: address.state, city: address.city, street: address.street, area: address.area || "", makeDefault: address.isDefault });
    setAddressMode("edit");
  }

  function saveAddress() {
    const errors = validateAddress(addressForm);
    if (Object.keys(errors).length) {
      setAddressErrors(errors);
      return;
    }
    // INTEGRATION: Persist address add/edit/default changes against the customer's profile.
    setAddressSaving(true);
    window.setTimeout(() => {
      setAddresses((current) => {
        const rec = { type: addressForm.type, customLabel: addressForm.customLabel, name: addressForm.name.trim(), phone: addressForm.phone.trim(), state: addressForm.state, city: addressForm.city.trim(), street: addressForm.street.trim(), area: addressForm.area.trim() };
        let next = [...current];
        let targetId = editId;
        if (addressMode === "edit" && editId) next = next.map((address) => (address.id === editId ? { ...address, ...rec } : address));
        else {
          targetId = `a${Date.now()}`;
          next.push({ id: targetId, ...rec, isDefault: false });
        }
        if (addressForm.makeDefault || next.length === 1) next = next.map((address) => ({ ...address, isDefault: address.id === targetId }));
        return next;
      });
      setAddressMode(null);
      setAddressSaving(false);
      showToast("default", addressMode === "edit" ? "Address updated" : "Address saved", "Your delivery details are ready for checkout.");
    }, 900);
  }

  function setDefault(id: string) {
    // INTEGRATION: Persist default address mutation.
    setAddresses((current) => current.map((address) => ({ ...address, isDefault: address.id === id })));
    const address = addresses.find((candidate) => candidate.id === id);
    if (address) showToast("default", "Default updated", `${addressLabel(address)} is now your default delivery address.`);
  }

  function deleteAddress() {
    // INTEGRATION: Persist address deletion and reconcile default address server-side.
    const gone = addresses.find((address) => address.id === deleteId);
    setAddresses((current) => {
      let next = current.filter((address) => address.id !== deleteId);
      if (gone?.isDefault && next.length) next = next.map((address, index) => ({ ...address, isDefault: index === 0 }));
      return next;
    });
    if (gone) showToast("removed", "Address deleted", `${addressLabel(gone)} was removed.`);
    setDeleteId(null);
  }

  if (!signedIn) {
    return (
      <>
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-[60px] max-sm:px-4">
          <Breadcrumb current="My account" />
          <div className="flex flex-col items-center px-6 py-[70px] pb-10 text-center">
            <div className="mb-[22px] flex size-[70px] items-center justify-center rounded-full border border-[#CFDCB4] bg-[#EAF0DE]">
              <User className="size-[30px] text-[#5F7043]" strokeWidth={1.8} />
            </div>
            <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[.24em] text-accent">Your account</div>
            <h1 className="m-0 mb-3 font-serif text-[34px] font-medium leading-[1.1]">Sign in to see your rail</h1>
            <p className="m-0 mb-[26px] max-w-[400px] text-sm leading-[1.6] text-muted-foreground">Holds, saved pieces and delivery addresses all live here. Sign in or create an account to pick up where you left off.</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button className="h-[50px] rounded-full px-7 text-[14.5px] font-semibold" onClick={openSignin}>Sign in</Button>
              <Button className="h-[50px] rounded-full border-[1.5px] border-primary bg-transparent px-7 text-[14.5px] font-medium text-primary hover:bg-transparent" onClick={openSignup} variant="outline">Create account</Button>
            </div>
          </div>
        </main>
        <AuthDialog
          authErrors={authErrors}
          authForm={authForm}
          authMode={authMode}
          authOpen={authOpen}
          authReveal={authReveal}
          authState={authState}
          finishAuth={finishAuth}
          remember={remember}
          setAuthForm={setAuthForm}
          setAuthMode={setAuthMode}
          setAuthOpen={setAuthOpen}
          setAuthReveal={setAuthReveal}
          setAuthState={setAuthState}
          setRemember={setRemember}
          setTerms={setTerms}
          showAuthErrors={showAuthErrors}
          submitAuth={submitAuth}
          terms={terms}
        />
      </>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-12 max-sm:px-4">
        <Breadcrumb current="My account" tail={tabTitle} />
        <Tabs value={tab} onValueChange={(value) => go(value as AccountTab)} className="grid grid-cols-[240px_1fr] items-start gap-8 max-md:grid-cols-1">
          <aside className="sticky top-24 max-md:hidden">
            <div className="flex items-center gap-3 px-1 pb-[18px]">
              <div className="flex size-11 items-center justify-center rounded-full bg-[#DCDACF] font-serif text-[19px] text-[#3D3B35]">AO</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">Amara Okafor</div>
                <div className="truncate text-xs text-[#8A887E]">amara.okafor@gmail.com</div>
              </div>
            </div>
            <TabsList className="flex h-auto w-full flex-col items-stretch justify-start gap-0.5 bg-transparent p-0">
              <AccountNavTrigger count={undefined} icon={<Home />} label="Overview" value="overview" />
              <AccountNavTrigger count={undefined} icon={<ShoppingBag />} label="Orders" value="orders" />
              <AccountNavTrigger count={holdCount} icon={<Clock />} label="Reservations" value="reservations" />
              <AccountNavTrigger count={savedCount} icon={<Heart />} label="Wishlist" value="wishlist" />
              <AccountNavTrigger count={addresses.length} icon={<Pin />} label="Addresses" value="addresses" />
            </TabsList>
            <button className="mt-3.5 flex w-full items-center gap-[11px] bg-transparent px-3.5 py-[11px] text-left text-[13.5px] text-[#8A887E]" onClick={signOut} type="button">
              <LogOut className="size-[18px]" strokeWidth={1.8} />Sign out
            </button>
          </aside>

          <div className="min-w-0">
            <TabsList className="mb-4 hidden w-full justify-start gap-2 overflow-x-auto bg-transparent p-0 max-md:flex">
              {(["overview", "orders", "reservations", "wishlist", "addresses"] as AccountTab[]).map((value) => (
                <TabsTrigger key={value} value={value} className="h-9 shrink-0 rounded-full border border-border bg-card px-4 text-[13px] data-active:bg-primary data-active:text-primary-foreground">
                  {titleForTab(value)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="m-0">
              <SectionTitle kicker="Welcome back" title="Good to see you, Amara." />
              <div className="mb-[26px] grid grid-cols-3 gap-3.5 max-sm:grid-cols-1">
                <StatCard icon={<Clock />} iconBg="#EAF0DE" label={holdCount === 1 ? "Active hold" : "Active holds"} onClick={() => go("reservations")} value={String(holdCount)} />
                <StatCard icon={<Heart />} iconBg="#FBEDEA" label="Saved pieces" onClick={() => go("wishlist")} value={String(savedCount)} />
                <StatCard icon={<MapPin />} iconBg="#FBF3E4" label="Saved addresses" onClick={() => go("addresses")} value={String(addresses.length)} />
              </div>
              {holdCount ? (
                <Alert className="mb-[26px] flex flex-wrap items-center gap-[18px] rounded-lg border-0 bg-[#20261C] px-6 py-[22px] text-white">
                  <span className="size-2.5 shrink-0 rounded-full bg-[#B8CE8E] animate-[leemPulse_1.6s_ease-in-out_infinite]" />
                  <div className="min-w-[200px] flex-1">
                    <AlertTitle className="mb-[3px] font-serif text-xl font-normal text-white">You&apos;re holding {holdCount === 1 ? "1 piece" : `${holdCount} pieces`}</AlertTitle>
                    <AlertDescription className="text-[13px] text-white/75">Soonest hold releases in <strong className="text-white tabular-nums">{formatSeconds(soonest)}</strong>. Check out before it frees up for someone else.</AlertDescription>
                  </div>
                  <Button className="h-11 rounded-full bg-white px-[22px] text-[13.5px] font-semibold text-primary hover:bg-white" onClick={() => setCartOpen(true)}>Review bag</Button>
                </Alert>
              ) : null}
              <div className="mb-3.5 flex items-center justify-between">
                <span className="font-serif text-[22px]">Recently saved</span>
                <button className="bg-transparent text-[13px] font-medium text-accent" onClick={() => go("wishlist")} type="button">View all wishlist &rarr;</button>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {active.filter((item) => item.st !== "sold").slice(0, 4).map((item) => (
                  <Link href="/p/p2" key={item.id}>
                    <Card className="overflow-hidden rounded-md border-[#EAE8E0] bg-card p-0">
                      <div className="relative aspect-[1/1.12] bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]"><Image alt={item.name} className="object-cover" fill sizes="220px" src={item.img} /></div>
                      <div className="px-3 py-[11px] pb-[13px]">
                        <div className="mb-1 truncate text-[13px]">{item.name}</div>
                        <div className="text-[13px] font-semibold">{naira(item.priceNum)}</div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="orders" className="m-0">
              <SectionTitle kicker="Your past finds" title="Orders" />
              <div className="flex flex-col gap-3.5">
                {orders.map((order) => (
                  <Card className="rounded-md border-[#EAE8E0] bg-card p-[18px] px-5" key={order.id}>
                    <div className="mb-3.5 flex flex-wrap items-center gap-3 border-b border-[#F0EEE8] pb-3.5">
                      <span className="text-[13px] font-semibold">{order.id}</span>
                      <span className="text-[12.5px] text-[#8A887E]">{order.date}</span>
                      <Badge className={cn("rounded-full px-2.5 py-[3px] text-[11px] font-semibold", order.status === "In transit" ? "border-[#EAD9B8] bg-[#FBF3E4] text-[#8A6D3B]" : "border-[#DDE3CC] bg-[#EFF1E7] text-[#4A5540]")}>{order.status}</Badge>
                      <span className="ml-auto text-sm font-semibold">{order.total}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex gap-2">
                        {order.thumbs.map((thumb) => (
                          <div className="relative h-14 w-[46px] overflow-hidden rounded-[8px] bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]" key={thumb.img}><Image alt={thumb.name} className="object-cover" fill sizes="46px" src={thumb.img} /></div>
                        ))}
                      </div>
                      <span className="text-[13px] text-muted-foreground">{order.summary}</span>
                      <Button className="ml-auto h-[38px] rounded-full border border-border bg-transparent px-4 text-[12.5px] text-muted-foreground hover:bg-transparent" variant="outline">{order.action}</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reservations" className="m-0">
              <SectionTitle kicker="Live holds · one-of-one" title="Reservations" />
              {holdCount ? (
                <div className="flex flex-col gap-3">
                  {held.map((item) => <ReservationRow item={item} key={item.id} release={release} />)}
                </div>
              ) : (
                <EmptyPanel cta="Browse the rail" href="/shop" icon={<Clock />} text="When you reserve a piece it's held here with a live countdown so no one else can take it while you decide." title="No active holds" />
              )}
            </TabsContent>

            <TabsContent value="wishlist" className="m-0">
              <div className="mb-[22px] border-b border-border pb-5">
                <div className="mb-2.5 inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-accent animate-[leemPulse_1.8s_ease-in-out_infinite]" />
                  <span className="text-[11.5px] font-semibold uppercase tracking-[.2em] text-accent">Your rail · saved one-of-one pieces</span>
                </div>
                <h1 className="m-0 mb-2.5 font-serif text-[34px] font-medium leading-[1.05]">Wishlist <em className="text-2xl font-normal text-[#8A887E]">— {savedCount === 1 ? "1 piece saved" : `${savedCount} pieces saved`}</em></h1>
                <p className="m-0 max-w-[560px] text-sm leading-[1.6] text-muted-foreground">Saved pieces stay live on the rail — one-of-one, so anyone can reserve them. Move a piece to your bag to hold it, and we&apos;ll tell you the moment a reserved one frees up.</p>
              </div>
              {savedCount && dropCount ? (
                <Alert className="mb-[22px] flex items-center gap-3 rounded-md border-chip-border bg-chip-bg px-4 py-[13px]">
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#E4EBD3]"><Package className="size-4 text-[#5F7043]" /></span>
                  <AlertDescription className="text-[13.5px] leading-[1.5] text-[#4A5540]"><strong>{dropCount} saved pieces have dropped in price</strong> since you added them. Reserve before the reductions bring other shoppers in.</AlertDescription>
                </Alert>
              ) : null}
              {savedCount ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(224px,1fr))] gap-[18px]">
                  {active.map((item) => <WishlistCard item={item} key={item.id} moveToBag={moveToBag} notified={!!notified[item.id]} notify={notify} release={release} setCartOpen={setCartOpen} unwish={unwish} />)}
                </div>
              ) : (
                <EmptyPanel cta="Shop the full rail" href="/shop" icon={<Heart />} text="Tap the heart on any piece to save it here. Because everything is one-of-one, your wishlist is the fastest way to catch a piece before someone else reserves it." title="Nothing saved yet" />
              )}
            </TabsContent>

            <TabsContent value="addresses" className="m-0">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[.2em] text-accent">Where your pieces land</div>
                  <h1 className="m-0 font-serif text-[34px] font-medium leading-[1.05]">Addresses</h1>
                </div>
                {addresses.length ? <Button className="h-[46px] rounded-full px-5 text-sm font-semibold" onClick={openAddAddress}><Plus />Add address</Button> : null}
              </div>
              {addresses.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                  {addresses.map((address) => <AddressCard address={address} key={address.id} onDelete={() => setDeleteId(address.id)} onEdit={() => openEditAddress(address)} setDefault={setDefault} />)}
                </div>
              ) : (
                <button className="w-full" onClick={openAddAddress} type="button">
                  <EmptyPanel button icon={<MapPin />} text="Add a delivery address so checkout is one tap. We deliver across Nigeria — same-day within Lagos, 2–5 days interstate." title="No addresses saved" cta="Add your first address" />
                </button>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {holdCount && !holdsDismissed ? (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 py-3">
          <div className="flex w-full max-w-[720px] items-center gap-3.5 rounded-full bg-[#20261C] py-2.5 pl-5 pr-3 text-white shadow-[0_20px_50px_rgba(0,0,0,.28)]">
            <span className="size-2 shrink-0 rounded-full bg-[#B8CE8E] animate-[leemPulse_1.6s_ease-in-out_infinite]" />
            <span aria-live="polite" className="min-w-0 flex-1 text-[13px] leading-[1.4]">You&apos;re holding {holdCount === 1 ? "1 piece" : `${holdCount} pieces`} — checkout in <strong className="tabular-nums">{formatSeconds(soonest)}</strong> before {holdCount === 1 ? "it releases" : "they release"}.</span>
            <Button className="h-[38px] shrink-0 rounded-full bg-white px-5 text-[13px] font-semibold text-primary hover:bg-white" onClick={() => setCartOpen(true)}>Checkout</Button>
            <button aria-label="Dismiss" className="flex shrink-0 p-1.5" onClick={() => setHoldsDismissed(true)} type="button"><X className="size-[18px] text-white/70" /></button>
          </div>
        </div>
      ) : null}

      {toast ? <AccountToast toast={toast} dismiss={() => setToast(null)} /> : null}

      <AuthDialog
        authErrors={authErrors}
        authForm={authForm}
        authMode={authMode}
        authOpen={authOpen}
        authReveal={authReveal}
        authState={authState}
        finishAuth={finishAuth}
        remember={remember}
        setAuthForm={setAuthForm}
        setAuthMode={setAuthMode}
        setAuthOpen={setAuthOpen}
        setAuthReveal={setAuthReveal}
        setAuthState={setAuthState}
        setRemember={setRemember}
        setTerms={setTerms}
        showAuthErrors={showAuthErrors}
        submitAuth={submitAuth}
        terms={terms}
      />

      <AddressDialog
        addressErrors={addressErrors}
        addressForm={addressForm}
        addressMode={addressMode}
        addressSaving={addressSaving}
        saveAddress={saveAddress}
        setAddressForm={setAddressForm}
        setAddressMode={setAddressMode}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-lg px-[30px] py-[30px] pb-6 text-center sm:max-w-[400px]">
          <AlertDialogHeader className="place-items-center text-center">
            <AlertDialogMedia className="mb-[18px] size-14 rounded-full border border-[#E4C4BF] bg-[#FBF0EE]"><Trash2 className="size-[26px] text-[#B04A45]" /></AlertDialogMedia>
            <AlertDialogTitle className="font-serif text-[22px] font-medium">Delete this address?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13.5px] leading-[1.55] text-[#8A887E]">{deleteId ? addressLabel(addresses.find((address) => address.id === deleteId)) : ""} will be removed from your saved addresses. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-[30px] -mb-6 grid grid-cols-2 gap-2.5 rounded-none border-0 bg-transparent px-[30px] pb-0">
            <AlertDialogCancel className="h-[50px] rounded-full border-[1.5px] border-primary bg-card text-sm font-medium text-primary hover:bg-card">Keep it</AlertDialogCancel>
            <AlertDialogAction className="h-[50px] rounded-full bg-[#B04A45] text-sm font-semibold text-white hover:bg-[#B04A45]" onClick={deleteAddress}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AccountCartSheet cartItems={held} cartOpen={cartOpen} cartTotal={cartTotal} recItems={recItems} release={release} reserve={reserve} setCartOpen={setCartOpen} />
    </>
  );
}

function AccountNavTrigger({ count, icon, label, value }: { count?: number; icon: React.ReactNode; label: string; value: AccountTab }) {
  return (
    <TabsTrigger value={value} className="h-auto justify-start rounded-[10px] px-3.5 py-[11px] text-[13.5px] font-normal text-[#57554E] data-active:bg-[#EFF1E7] data-active:text-primary">
      <span className="flex shrink-0 [&_svg]:size-[18px] [&_svg]:stroke-[1.8]">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {count ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EEECE5] px-1.5 text-[11px] font-semibold text-[#8A887E] group-data-[active]:bg-[#DDE3CC]">{count}</span> : null}
    </TabsTrigger>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6 border-b border-border pb-5">
      <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[.2em] text-accent">{kicker}</div>
      <h1 className="m-0 font-serif text-[34px] font-medium leading-[1.05]">{title}</h1>
    </div>
  );
}

function StatCard({ icon, iconBg, label, onClick, value }: { icon: React.ReactNode; iconBg: string; label: string; onClick: () => void; value: string }) {
  return (
    <button className="flex flex-col gap-2.5 rounded-md border border-[#EAE8E0] bg-card p-[18px] pb-4 text-left" onClick={onClick} type="button">
      <span className="flex size-9 items-center justify-center rounded-[10px] [&_svg]:size-[18px]" style={{ background: iconBg }}>{icon}</span>
      <span className="text-[26px] font-semibold leading-none tabular-nums">{value}</span>
      <span className="text-[12.5px] text-[#8A887E]">{label}</span>
    </button>
  );
}

function ReservationRow({ item, release }: { item: AccountItem; release: (id: string) => void }) {
  return (
    <Card className="flex flex-row flex-wrap items-center gap-4 rounded-md border-[1.5px] border-accent bg-card p-4 px-[18px]">
      <Link className="relative h-[78px] w-16 shrink-0 overflow-hidden rounded-[10px] bg-[linear-gradient(160deg,#E4E5DE,#D3D5CB)]" href="/p/p2"><Image alt={item.name} className="object-cover" fill sizes="64px" src={item.img} /></Link>
      <div className="min-w-[160px] flex-1">
        <div className="mb-1 text-[14.5px] font-semibold">{item.name}</div>
        <div className="mb-2 text-[12.5px] text-[#8A887E]">Size {item.size} · {item.color} · {item.cond}</div>
        <Badge className="rounded-full border-chip-border bg-chip-bg px-3 py-1.5 text-xs text-[#4A5540] hover:bg-chip-bg"><span className="mr-[7px] size-[7px] rounded-full bg-accent animate-[leemPulse_1.6s_ease-in-out_infinite]" />Held · {formatSeconds(item.secondsLeft)} left</Badge>
      </div>
      <div className="flex min-w-[150px] flex-col items-stretch gap-2">
        <span className="text-right text-base font-semibold">{naira(item.priceNum)}</span>
        <Button className="h-10 rounded-full px-[18px] text-[13px] font-semibold" render={<Link href="/checkout" />}>Check out</Button>
        <button className="self-center text-xs text-[#8A887E] underline underline-offset-2" onClick={() => release(item.id)} type="button">Release hold</button>
      </div>
    </Card>
  );
}

function WishlistCard({ item, moveToBag, notified, notify, release, setCartOpen, unwish }: { item: AccountItem; moveToBag: (id: string) => void; notified: boolean; notify: (id: string) => void; release: (id: string) => void; setCartOpen: (open: boolean) => void; unwish: (id: string) => void }) {
  const isSold = item.st === "sold";
  const isResOthers = item.st === "resOthers";
  const isResYou = item.st === "resYou";
  const isLast = item.st === "lastone";
  const discount = `-${Math.round((1 - item.priceNum / item.origNum) * 100)}%`;
  if (isResOthers) {
    return (
      <Card className="min-h-[392px] overflow-hidden rounded-md border-[#DDE3CC] bg-[#F4F6EC] p-0">
        <div className="flex items-center gap-[11px] border-b border-[#DDE3CC] p-3.5 px-[15px]">
          <div className="relative h-[52px] w-[42px] shrink-0 overflow-hidden rounded-[9px] bg-[linear-gradient(160deg,#E4E5DE,#D3D5CB)]"><Image alt={item.name} className="object-cover opacity-70 grayscale" fill sizes="42px" src={item.img} /></div>
          <div className="min-w-0"><div className="truncate text-[13px] font-medium">{item.name}</div><div className="text-[11.5px] text-[#8A887E]">{naira(item.priceNum)} · {item.size}</div></div>
          <button aria-label="Remove from wishlist" className="ml-auto flex shrink-0 p-1" onClick={() => unwish(item.id)} type="button"><X className="size-[18px] text-[#8A887E]" /></button>
        </div>
        <div className="flex flex-1 flex-col items-start gap-[9px] p-4 pb-1">
          <span className="flex size-[34px] items-center justify-center rounded-full bg-[#E4EBD3]"><ShoppingBag className="size-[18px] text-[#5F7043]" /></span>
          <div className="font-serif text-[19px] leading-[1.2]">In someone&apos;s bag right now</div>
          <div className="text-[12.5px] leading-[1.55] text-muted-foreground">This piece is held by another shopper. We&apos;ll keep it saved and tell you the second it frees up — usually within <strong className="tabular-nums">~{item.mins || 5} minutes</strong>.</div>
        </div>
        <div className="flex flex-col gap-2 p-4 pt-2.5">
          <Button className={cn("h-[42px] rounded-full text-[13px] font-medium", notified ? "border-[#C9D4AF] bg-[#E4EBD3] text-[#4A5540] hover:bg-[#E4EBD3]" : "")} onClick={() => notify(item.id)}>{notified ? "We'll let you know" : "Notify me if it frees up"}</Button>
          <Link className="self-center text-xs text-[#8A887E] underline underline-offset-2" href="/shop">Find something similar</Link>
        </div>
      </Card>
    );
  }
  return (
    <Card className={cn("relative flex min-h-[392px] flex-col overflow-hidden rounded-md bg-card p-0", isResYou ? "border-[1.5px] border-accent" : "border-[#EAE8E0]")}>
      <div className="relative aspect-[1/1.12] overflow-hidden bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]">
        {isResYou ? <Badge className="absolute left-3 top-3 z-[3] rounded-full border-chip-border bg-chip-bg px-[11px] py-1 text-[10.5px] text-[#4A5540] hover:bg-chip-bg">In your bag</Badge> : null}
        {isLast ? <Badge className="absolute left-3 top-3 z-[3] rounded-full border-[#EAD6BE] bg-[#FBF1E6] px-[11px] py-1 text-[10.5px] text-[#B0682E] hover:bg-[#FBF1E6]">Last one</Badge> : null}
        <button aria-label="Remove from wishlist" className="absolute right-3 top-3 z-[3] flex size-[34px] items-center justify-center rounded-full border-0 bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,.08)]" onClick={() => unwish(item.id)} type="button"><Heart className="size-4 fill-[#B04A45] text-[#B04A45]" /></button>
        <Link className="absolute inset-0" href="/p/p2"><Image alt={item.name} className={cn("object-cover", isSold ? "opacity-55 grayscale" : "")} fill sizes="240px" src={item.img} /></Link>
        {isSold ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#1B1A17]/20"><span className="rounded-full bg-[#1B1A17]/70 px-[18px] py-[7px] text-xs font-semibold uppercase tracking-[.28em] text-white">SOLD</span></div> : null}
      </div>
      <div className="flex flex-1 flex-col gap-[9px] p-[13px] pb-[15px]">
        <div><Link className="mb-[5px] block truncate text-[13.5px]" href="/p/p2">{item.name}</Link><div className="flex items-baseline gap-[7px]"><span className={cn("text-sm font-semibold", isSold ? "text-[#A7A59B]" : "")}>{naira(item.priceNum)}</span>{!isSold ? <span className="text-xs text-[#A7A59B] line-through">{naira(item.origNum)}</span> : null}{!isSold ? <span className="text-[11.5px] font-semibold text-accent">{discount}</span> : null}</div></div>
        <div className="flex flex-wrap gap-1.5"><Badge variant="outline" className="rounded-full border-border px-[9px] py-[3px] text-[11px] text-muted-foreground">{item.size} · {item.color}</Badge><Badge className="rounded-full border-chip-border bg-chip-bg px-[9px] py-[3px] text-[11px] text-[#4A5540] hover:bg-chip-bg"><span className="mr-[5px] size-1.5 rounded-full bg-accent" />{item.cond}</Badge></div>
        <StockLine item={item} />
        {(item.st === "available" || isLast) ? <Button className="mt-auto h-[42px] rounded-full text-[13px] font-semibold" onClick={() => moveToBag(item.id)}>Move to bag · hold 15 min</Button> : null}
        {isResYou ? <div className="mt-auto flex flex-col gap-2"><Button className="h-[42px] rounded-full text-[13px] font-semibold" onClick={() => setCartOpen(true)}>Checkout now</Button><button className="self-center text-xs text-[#8A887E] underline underline-offset-2" onClick={() => release(item.id)} type="button">Release hold</button></div> : null}
        {isSold ? <Button className="mt-auto h-[42px] rounded-full border-[1.5px] border-primary bg-transparent text-[13px] font-medium text-primary hover:bg-transparent" render={<Link href="/shop" />} variant="outline">Find something similar</Button> : null}
      </div>
    </Card>
  );
}

function StockLine({ item }: { item: AccountItem }) {
  let dot = "#B7B3A6", color = "#8A887E", label = "Available on the rail", pulse = false;
  if (item.st === "lastone") { dot = "#C88A3A"; color = "#B0682E"; label = "1 left · last one"; pulse = true; }
  if (item.st === "resYou") { dot = "#7C8C63"; color = "#4A5540"; label = `Held for you · ${formatSeconds(item.secondsLeft)}`; }
  if (item.st === "sold") { dot = "#C6584F"; color = "#A7A59B"; label = "Sold · gone for good"; }
  return <div className="flex items-center gap-[7px]"><span className={cn("size-2 rounded-full", pulse ? "animate-[leemPulse_1.8s_ease-in-out_infinite]" : "")} style={{ background: dot }} /><span className="text-xs font-medium tabular-nums" style={{ color }}>{label}</span></div>;
}

function AddressCard({ address, onDelete, onEdit, setDefault }: { address: Address; onDelete: () => void; onEdit: () => void; setDefault: (id: string) => void }) {
  const lagos = address.state === "Lagos";
  return (
    <Card className={cn("rounded-md bg-card p-5 pb-4", address.isDefault ? "border-[1.5px] border-accent" : "border-[#EAE8E0]")}>
      <div className="mb-3.5 flex items-center gap-[9px]">
        <span className="inline-flex items-center gap-[7px] text-xs font-semibold text-[#3D3B35]"><AddressIcon type={address.type} />{addressLabel(address)}</span>
        {address.isDefault ? <Badge className="rounded-full border-chip-border bg-chip-bg px-2.5 py-[3px] text-[10.5px] font-semibold text-[#4A5540] hover:bg-chip-bg">Default</Badge> : null}
        <Badge className={cn("ml-auto rounded-full px-2.5 py-[3px] text-[10.5px] font-semibold", lagos ? "border-[#DDE3CC] bg-[#EFF1E7] text-[#4A5540]" : "border-[#EAD9B8] bg-[#FBF3E4] text-[#8A6D3B]")}>{lagos ? "Lagos delivery" : "Interstate"}</Badge>
      </div>
      <div className="mb-1.5 text-[14.5px] font-semibold">{address.name}</div>
      <div className="whitespace-pre-line text-[13px] leading-[1.6] text-muted-foreground">{address.street}{"\n"}{address.city}, {address.state}{address.area ? `\n"${address.area}"` : ""}</div>
      <div className="mt-2.5 flex items-center gap-[7px] text-[13px] text-muted-foreground"><PhoneIcon />+234 {address.phone}</div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#F0EEE8] pt-3.5">
        {!address.isDefault ? <Button className="h-[34px] rounded-full border-[1.5px] border-primary bg-transparent px-3.5 text-[12.5px] font-medium text-primary hover:bg-transparent" onClick={() => setDefault(address.id)} variant="outline">Set as default</Button> : null}
        <div className="flex-1" />
        <Button className="h-[34px] rounded-full border border-border bg-transparent px-3 text-[12.5px] text-muted-foreground hover:bg-transparent" onClick={onEdit} variant="outline"><Pencil />Edit</Button>
        <Button aria-label="Delete address" className="size-[34px] rounded-full border border-border bg-transparent text-[#B04A45] hover:bg-transparent" onClick={onDelete} size="icon" variant="outline"><Trash2 /></Button>
      </div>
    </Card>
  );
}

function EmptyPanel({ button = false, cta, href, icon, text, title }: { button?: boolean; cta: string; href?: string; icon: React.ReactNode; text: string; title: string }) {
  const body = (
    <div className="flex flex-col items-center gap-3.5 rounded-md border border-dashed border-chip-border bg-[#F7F9F2] px-[30px] py-[60px] text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-[#EAF0DE] text-accent [&_svg]:size-7">{icon}</div>
      <div className="font-serif text-[26px]">{title}</div>
      <div className="max-w-[400px] text-[13.5px] leading-[1.6] text-muted-foreground">{text}</div>
      {href ? <Button className="mt-1 h-12 rounded-full px-6 text-sm font-medium" render={<Link href={href} />}>{cta}</Button> : <span className="mt-1 inline-flex h-12 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground">{cta}</span>}
    </div>
  );
  return button ? body : body;
}

function AuthDialog(props: {
  authErrors: Record<string, string>;
  authForm: { first: string; last: string; email: string; password: string };
  authMode: AuthMode;
  authOpen: boolean;
  authReveal: boolean;
  authState: AuthState;
  finishAuth: () => void;
  remember: boolean;
  setAuthForm: React.Dispatch<React.SetStateAction<{ first: string; last: string; email: string; password: string }>>;
  setAuthMode: (mode: AuthMode) => void;
  setAuthOpen: (open: boolean) => void;
  setAuthReveal: (open: boolean) => void;
  setAuthState: (state: AuthState) => void;
  setRemember: (value: boolean) => void;
  setTerms: (value: boolean) => void;
  showAuthErrors: boolean;
  submitAuth: () => void;
  terms: boolean;
}) {
  const { authErrors, authForm, authMode, authOpen, authReveal, authState, finishAuth, remember, setAuthForm, setAuthMode, setAuthOpen, setAuthReveal, setAuthState, setRemember, setTerms, showAuthErrors, submitAuth, terms } = props;
  const signup = authMode === "signup";
  const busy = authState === "signing-in";
  const err = (key: string) => showAuthErrors ? authErrors[key] : undefined;
  function setField(key: keyof typeof authForm, value: string) {
    setAuthForm((current) => ({ ...current, [key]: value }));
  }
  return (
    <Dialog open={authOpen} onOpenChange={(open) => { setAuthOpen(open); if (!open) setAuthState("default"); }}>
      <DialogContent showCloseButton className="max-h-[calc(100vh-64px)] max-w-[940px] grid-cols-1 gap-0 overflow-y-auto rounded-lg p-0 shadow-[0_30px_80px_rgba(0,0,0,.24)] md:grid-cols-[minmax(300px,1fr)_minmax(320px,1.2fr)]">
        <DialogTitle className="sr-only">Sign in</DialogTitle>
        <DialogDescription className="sr-only">Access your Laitstyle account.</DialogDescription>
        <div className="relative hidden min-h-[540px] flex-col justify-end overflow-hidden bg-[linear-gradient(160deg,#5A6152,#3E463A)] p-9 text-white md:flex">
          <Image alt="One-of-one pieces" className="object-cover opacity-90" fill sizes="420px" src={img("1dXXWxCEEg6ezYPsRCK6B1XxD5QpAiZfh")} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,36,27,.35)_0%,rgba(30,36,27,.82)_100%)]" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2"><span className="size-[7px] rounded-full bg-[#B8CE8E] animate-[leemPulse_1.8s_ease-in-out_infinite]" /><span className="text-[11px] font-semibold uppercase tracking-[.2em] text-white/85">Second-hand, first choice</span></div>
            <div className="mb-3.5 font-serif text-[30px] leading-[1.1]">Your account keeps<br /><em className="font-normal">every find within reach.</em></div>
            <div className="mt-5 flex flex-col gap-3 text-[13px] text-white/90"><span>Track live holds &amp; reservation timers</span><span>Save pieces &amp; get freed-up alerts</span><span>Faster checkout on future drops</span></div>
          </div>
        </div>
        <div className="flex min-w-[300px] flex-col p-10 max-sm:p-6">
          {authState === "success" ? (
            <div className="flex flex-1 flex-col items-center justify-center py-5 text-center">
              <div className="mb-[22px] flex size-[76px] items-center justify-center rounded-full border border-[#CFDCB4] bg-[#EAF0DD] animate-[leemPop_.5s_cubic-bezier(.33,1,.68,1)]"><Check className="size-[34px] text-[#5F7043]" strokeWidth={2.4} /></div>
              <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[.28em] text-accent">Signed in</div>
              <h2 className="m-0 mb-2.5 font-serif text-[30px] font-medium leading-[1.15]">You&apos;re in.</h2>
              <p className="mx-auto m-0 mb-[26px] max-w-[320px] text-sm leading-[1.6] text-muted-foreground">Your holds, saved pieces and addresses are ready. Let&apos;s find the next one-of-one.</p>
              <Button className="h-[52px] w-full max-w-[300px] rounded-full px-[30px] text-[14.5px] font-semibold" onClick={finishAuth}>Go to my account</Button>
            </div>
          ) : (
            <div>
              <h2 className="m-0 mb-1.5 font-serif text-[28px] font-medium leading-[1.1]">{signup ? "Create your account" : "Welcome back"}</h2>
              <p className="m-0 mb-[22px] text-[13.5px] text-[#8A887E]">{signup ? "Join Laitstyle to hold, save and track one-of-one pieces." : "Sign in to pick up your holds and saved finds."}</p>
              <div className="mb-6 flex gap-1 rounded-full border border-border bg-[#F2F1EC] p-1">
                <button className={cn("h-[38px] flex-1 rounded-full text-[13.5px] font-medium", !signup ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground")} onClick={() => setAuthMode("signin")} type="button">Sign in</button>
                <button className={cn("h-[38px] flex-1 rounded-full text-[13.5px] font-medium", signup ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground")} onClick={() => setAuthMode("signup")} type="button">Create account</button>
              </div>
              <Button className="mb-5 h-[50px] w-full rounded-full border-[1.5px] border-[#E0DED5] bg-card text-sm font-medium text-primary hover:bg-card" onClick={() => { setAuthState("signing-in"); window.setTimeout(() => setAuthState("success"), 1100); }} variant="outline">Continue with Google</Button>
              <div className="mb-5 flex items-center gap-3"><Separator className="flex-1" /><span className="text-[11.5px] tracking-[.06em] text-[#A7A59B]">or use email</span><Separator className="flex-1" /></div>
              <FieldGroup className="gap-3">
                {signup ? <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1"><AccountField error={err("first")} label="First name" onChange={(value) => setField("first", value)} placeholder="First name" value={authForm.first} /><AccountField error={err("last")} label="Last name" onChange={(value) => setField("last", value)} placeholder="Last name" value={authForm.last} /></div> : null}
                <AccountField error={err("email")} label="Email" onChange={(value) => setField("email", value)} placeholder="Email" type="email" value={authForm.email} />
                <Field data-invalid={!!err("password")}>
                  <div className="relative">
                    <Input aria-invalid={!!err("password")} aria-label="Password" className={cn("h-[52px] rounded-[9px] bg-card px-[15px] pr-11 text-sm focus-visible:border-primary focus-visible:ring-0", err("password") ? "border-[#D98B84]" : "border-input")} onChange={(event) => setField("password", event.target.value)} placeholder="Password" type={authReveal ? "text" : "password"} value={authForm.password} />
                    <button aria-label="Toggle password visibility" className="absolute right-3.5 top-[15px] flex text-[#8A887E]" onClick={() => setAuthReveal(!authReveal)} type="button">{authReveal ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}</button>
                  </div>
                  <FieldError className="mt-1.5 text-xs">{err("password")}</FieldError>
                </Field>
              </FieldGroup>
              {!signup ? (
                <div className="mt-4 flex items-center justify-between gap-2.5">
                  <Label className="cursor-pointer text-[13px] text-muted-foreground"><Checkbox checked={remember} onCheckedChange={(checked) => setRemember(checked === true)} />Keep me signed in</Label>
                  <Link className="text-[13px] font-medium text-accent" href="#">Forgot password?</Link>
                </div>
              ) : (
                <div className="mt-4">
                  <Label className="cursor-pointer items-start text-[12.5px] leading-[1.45] text-muted-foreground"><Checkbox aria-invalid={!!err("terms")} checked={terms} className="mt-px" onCheckedChange={(checked) => setTerms(checked === true)} />I agree to the <Link className="text-accent underline underline-offset-2" href="#">Terms</Link> and <Link className="text-accent underline underline-offset-2" href="#">Privacy Policy</Link>.</Label>
                  {err("terms") ? <div className="mt-1.5 text-xs text-destructive">{err("terms")}</div> : null}
                </div>
              )}
              <Button className="mt-[22px] h-[54px] w-full rounded-full text-[15px] font-semibold" disabled={busy} onClick={submitAuth}>{busy ? <span className="size-[18px] rounded-full border-[2.5px] border-white/40 border-t-white animate-spin" /> : null}{busy ? (signup ? "Creating account..." : "Signing in...") : signup ? "Create account" : "Sign in"}</Button>
              <div className="mt-4 text-center text-[13px] text-[#8A887E]">{signup ? "Already have an account?" : "New to Laitstyle?"} <button className="bg-transparent p-0 text-[13px] font-semibold text-accent" onClick={() => setAuthMode(signup ? "signin" : "signup")} type="button">{signup ? "Sign in" : "Create one"}</button></div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccountField({ error, label, onChange, placeholder, type = "text", value }: { error?: string; label: string; onChange: (value: string) => void; placeholder: string; type?: string; value: string }) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel className="sr-only">{label}</FieldLabel>
      <Input aria-invalid={!!error} aria-label={label} className={cn("h-[52px] rounded-[9px] bg-card px-[15px] text-sm focus-visible:border-primary focus-visible:ring-0", error ? "border-[#D98B84]" : "border-input")} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />
      <FieldError className="mt-1.5 text-xs">{error}</FieldError>
    </Field>
  );
}

function AddressDialog({ addressErrors, addressForm, addressMode, addressSaving, saveAddress, setAddressForm, setAddressMode }: { addressErrors: Record<string, string>; addressForm: AddressForm; addressMode: AddressMode; addressSaving: boolean; saveAddress: () => void; setAddressForm: React.Dispatch<React.SetStateAction<AddressForm>>; setAddressMode: (mode: AddressMode) => void }) {
  const lagos = addressForm.state === "Lagos";
  const zoneHint = lagos ? "Lagos zone · same-day or next-day delivery, flat ₦1,500." : `${addressForm.state} · interstate delivery, 2–5 working days, from ₦3,500.`;
  const setField = (key: keyof AddressForm, value: string | boolean) => setAddressForm((current) => ({ ...current, [key]: value }));
  return (
    <Dialog open={!!addressMode} onOpenChange={(open) => !open && setAddressMode(null)}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100vh-80px)] max-w-[540px] gap-0 overflow-y-auto rounded-lg p-0 shadow-[0_30px_80px_rgba(0,0,0,.22)]">
        <div className="flex items-center justify-between border-b border-[#F0EEE8] px-[26px] py-[22px] pb-4">
          <DialogTitle className="font-serif text-2xl font-medium">{addressMode === "edit" ? "Edit address" : "Add a new address"}</DialogTitle>
          <button aria-label="Close" className="flex p-1" onClick={() => setAddressMode(null)} type="button"><X className="size-[22px]" /></button>
        </div>
        <DialogDescription className="sr-only">Add or edit delivery address.</DialogDescription>
        <div className="px-[26px] py-5 pb-2">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Address label</div>
          <div className="mb-[18px] flex gap-2">{(["Home", "Work", "Other"] as const).map((type) => <Button className={cn("h-[42px] flex-1 rounded-full text-[13px]", addressForm.type === type ? "" : "border border-input bg-card text-muted-foreground hover:bg-card")} key={type} onClick={() => setField("type", type)} variant={addressForm.type === type ? "default" : "outline"}>{type}</Button>)}</div>
          {addressForm.type === "Other" ? <AccountField label="Custom label" onChange={(value) => setField("customLabel", value)} placeholder="Label name · e.g. Mum's place" value={addressForm.customLabel} /> : null}
          <FieldGroup className="mt-3 gap-3.5">
            <AccountField error={addressErrors.name} label="Full name" onChange={(value) => setField("name", value)} placeholder="Recipient's full name" value={addressForm.name} />
            <Field data-invalid={!!addressErrors.phone}>
              <FieldLabel className="text-xs text-muted-foreground">Phone number</FieldLabel>
              <div className="flex gap-2"><span className="inline-flex h-[52px] shrink-0 items-center gap-1.5 rounded-[9px] border border-input bg-background px-3.5 text-sm font-semibold text-muted-foreground">NG +234</span><Input aria-invalid={!!addressErrors.phone} className={cn("h-[52px] rounded-[9px] bg-card px-[15px] text-sm focus-visible:border-primary focus-visible:ring-0", addressErrors.phone ? "border-[#D98B84]" : "border-input")} inputMode="numeric" onChange={(event) => setField("phone", event.target.value)} placeholder="801 234 5678" type="tel" value={addressForm.phone} /></div>
              <FieldError className="mt-1.5 text-xs">{addressErrors.phone}</FieldError>
            </Field>
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <Field>
                <FieldLabel className="text-xs text-muted-foreground">State</FieldLabel>
                <Select value={addressForm.state} onValueChange={(value) => setField("state", value || "Lagos")}>
                  <SelectTrigger className="h-[52px] w-full rounded-[9px] bg-card px-[15px] text-sm focus-visible:border-primary focus-visible:ring-0"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{stateOptions.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <AccountField error={addressErrors.city} label="City / town" onChange={(value) => setField("city", value)} placeholder="e.g. Ikeja" value={addressForm.city} />
            </div>
            <Field data-invalid={!!addressErrors.street}>
              <FieldLabel className="text-xs text-muted-foreground">Street address</FieldLabel>
              <Textarea aria-invalid={!!addressErrors.street} className={cn("min-h-[72px] rounded-[9px] bg-card px-[15px] py-[13px] text-sm leading-[1.5] focus-visible:border-primary focus-visible:ring-0", addressErrors.street ? "border-[#D98B84]" : "border-input")} onChange={(event) => setField("street", event.target.value)} placeholder="House number and street, estate / compound" rows={2} value={addressForm.street} />
              <FieldError className="mt-1.5 text-xs">{addressErrors.street}</FieldError>
            </Field>
            <AccountField label="Nearest landmark" onChange={(value) => setField("area", value)} placeholder="e.g. opposite Ikeja City Mall" value={addressForm.area} />
          </FieldGroup>
          <Alert className="mt-4 flex items-center gap-2.5 rounded-[11px] border-chip-border bg-chip-bg px-3.5 py-[11px]"><Truck className="size-4 shrink-0 text-[#5F7043]" /><AlertDescription className="text-[12.5px] leading-[1.45] text-[#4A5540]">{zoneHint}</AlertDescription></Alert>
          <Label className="my-3.5 cursor-pointer text-[13.5px] text-[#3D3B35]"><Checkbox checked={addressForm.makeDefault} onCheckedChange={(checked) => setField("makeDefault", checked === true)} />Set as my default delivery address</Label>
        </div>
        <div className="mt-2 flex gap-3 border-t border-[#F0EEE8] px-[26px] py-4 pb-[22px]">
          <Button className="h-[52px] rounded-full border-[1.5px] border-primary bg-card px-[22px] text-sm font-medium text-primary hover:bg-card" onClick={() => setAddressMode(null)} variant="outline">Cancel</Button>
          <Button className="h-[52px] flex-1 rounded-full text-[14.5px] font-semibold" disabled={addressSaving} onClick={saveAddress}>{addressSaving ? <span className="size-[17px] rounded-full border-2 border-white/40 border-t-white animate-spin" /> : null}{addressSaving ? "Saving..." : addressMode === "edit" ? "Save changes" : "Save address"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccountCartSheet({ cartItems, cartOpen, cartTotal, recItems, release, reserve, setCartOpen }: { cartItems: AccountItem[]; cartOpen: boolean; cartTotal: number; recItems: AccountItem[]; release: (id: string) => void; reserve: (id: string) => void; setCartOpen: (open: boolean) => void }) {
  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" className="w-full gap-0 bg-card p-0 sm:max-w-[440px]">
        <SheetHeader className="px-[22px] pb-2.5 pt-5 text-left"><SheetTitle className="font-serif text-2xl font-medium">Shopping Cart <span className="font-sans text-sm text-[#8A887E]">{cartItems.length}</span></SheetTitle><SheetDescription className="sr-only">Reserved pieces in your bag.</SheetDescription></SheetHeader>
        {cartItems.length ? (
          <>
            <div className="flex-1 overflow-y-auto px-[22px] py-0.5">
              {cartItems.map((item) => (
                <div className="flex gap-3.5 border-b border-[#EFEDE7] py-4" key={item.id}>
                  <Link className="relative block h-[90px] w-[74px] shrink-0 overflow-hidden rounded-[10px] bg-[linear-gradient(160deg,#E4E5DE,#D3D5CB)]" href="/p/p2"><Image alt={item.name} className="object-cover" fill sizes="74px" src={item.img} /></Link>
                  <div className="min-w-0 flex-1"><div className="flex justify-between gap-2.5"><Link className="text-sm font-medium" href="/p/p2">{item.name}</Link><span className="whitespace-nowrap text-sm font-semibold">{naira(item.priceNum)}</span></div><div className="mb-2.5 mt-1 text-xs text-[#8A887E]">Size {item.size} · {item.color} · {item.cond}</div><div className="flex flex-wrap items-center gap-3"><Badge className="rounded-full border-chip-border bg-chip-bg px-2.5 py-1 text-[11px] tabular-nums text-[#4A5540] hover:bg-chip-bg">Held {formatSeconds(item.secondsLeft)}</Badge><button className="text-[12.5px] text-[#8A887E] underline underline-offset-2" onClick={() => release(item.id)} type="button">Remove</button></div></div>
                </div>
              ))}
              {recItems.length ? <div className="py-[18px] pb-1.5"><div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[.16em] text-[#9A988F]">You may also like</div><div className="flex gap-3 overflow-x-auto pb-1">{recItems.slice(0, 3).map((item) => <div className="w-[118px] flex-[0_0_118px]" key={item.id}><Link className="relative block h-[146px] overflow-hidden rounded-[10px] bg-[linear-gradient(160deg,#ECEBE5,#DFE0D8)]" href="/p/p2"><Image alt={item.name} className="object-cover" fill sizes="118px" src={item.img} /></Link><div className="mt-[7px] truncate text-xs">{item.name}</div><div className="mt-1 flex items-center justify-between gap-1.5"><span className="text-[12.5px] font-semibold">{naira(item.priceNum)}</span><Button className="h-7 rounded-full px-3 text-[11px] font-semibold" onClick={() => reserve(item.id)}>Reserve</Button></div></div>)}</div></div> : null}
            </div>
            <div className="border-t border-[#EAE8E0] px-[22px] py-4 pb-5"><div className="flex items-baseline justify-between"><span className="font-serif text-[22px]">Total</span><span className="text-xl font-semibold">{naira(cartTotal)}</span></div><div className="mt-[3px] flex justify-between text-[11.5px] text-[#8A887E]"><span>(incl. VAT)</span><span>Free delivery · 7-day returns</span></div><Button className="mt-3.5 h-[52px] w-full rounded-full text-[14.5px] font-semibold" render={<Link href="/checkout" />}>Checkout Securely</Button><Link className="mt-0.5 flex h-10 items-center justify-center text-[12.5px] text-[#8A887E] underline underline-offset-2" href="/checkout">View full bag</Link></div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-[30px] py-10 text-center"><div className="flex size-[66px] items-center justify-center rounded-full bg-[#EFEDE7]"><ShoppingBag className="size-[26px] text-[#8A887E]" /></div><div className="font-serif text-[22px]">Nothing reserved yet</div><div className="max-w-[260px] text-[13px] leading-[1.55] text-[#8A887E]">Move a saved piece to your bag and we&apos;ll hold it here so no one else can take it while you decide.</div><Button className="h-[46px] rounded-full px-6 text-sm" onClick={() => setCartOpen(false)}>Back to account</Button></div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AccountToast({ dismiss, toast }: { dismiss: () => void; toast: { tone: ToastTone; title: string; msg: string } }) {
  const error = toast.tone === "removed" || toast.tone === "sold";
  return (
    <Alert className="fixed bottom-20 right-4 z-[70] flex max-w-[344px] items-start gap-[11px] rounded-md border-border bg-card px-[15px] py-[13px] shadow-[0_20px_50px_rgba(0,0,0,.16)] animate-[leemToastIn_.3s_cubic-bezier(.33,1,.68,1)]">
      <span className={cn("mt-px flex size-6 shrink-0 items-center justify-center rounded-full", error ? "bg-[#F6E9E4]" : "bg-[#E4EBD3]")}>{error ? <Trash2 className="size-3.5 text-[#B04A45]" /> : <Check className="size-3.5 text-[#5F7043]" />}</span>
      <div className="min-w-0 flex-1"><AlertTitle className="mb-0.5 text-[13px] leading-[1.35]">{toast.title}</AlertTitle><AlertDescription className="text-[12.5px] leading-[1.45] text-muted-foreground">{toast.msg}</AlertDescription></div>
      <button aria-label="Dismiss" className="flex shrink-0 p-0.5" onClick={dismiss} type="button"><X className="size-4 text-[#9A988F]" /></button>
    </Alert>
  );
}

function Breadcrumb({ current, tail }: { current: string; tail?: string }) {
  return (
    <div className="px-1 pb-2.5 pt-[18px] text-[12.5px] text-[#9A988F]">
      <Link className="text-[#9A988F]" href="/">Home</Link><span className="mx-[7px]">/</span><span className="text-muted-foreground">{current}</span>{tail ? <><span className="mx-[7px]">/</span><span className="text-muted-foreground">{tail}</span></> : null}
    </div>
  );
}

function AddressIcon({ type }: { type: Address["type"] }) {
  if (type === "Home") return <Home className="size-[15px] text-accent" strokeWidth={1.9} />;
  if (type === "Work") return <Briefcase className="size-[15px] text-accent" strokeWidth={1.9} />;
  return <MapPin className="size-[15px] text-accent" strokeWidth={1.9} />;
}

function PhoneIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A887E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" /></svg>;
}

function buildOrders() {
  return [
    { id: "#LS-20481", date: "2 Jul 2026", status: "Delivered", total: "₦51,000", summary: "2 pieces · delivered to Ikeja", action: "Buy again", thumbs: [{ img: seedItems[0].img, name: "a" }, { img: seedItems[6].img, name: "b" }] },
    { id: "#LS-20334", date: "19 Jun 2026", status: "Delivered", total: "₦26,000", summary: "1 piece · delivered to Victoria Island", action: "Buy again", thumbs: [{ img: seedItems[5].img, name: "c" }] },
    { id: "#LS-20190", date: "3 Jun 2026", status: "In transit", total: "₦31,000", summary: "1 piece · courier en route", action: "Track order", thumbs: [{ img: seedItems[2].img, name: "d" }] },
  ];
}

function validateAuth(mode: AuthMode, form: { first: string; last: string; email: string; password: string }, terms: boolean) {
  const errors: Record<string, string> = {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) errors.email = "Enter a valid email address";
  if (form.password.length < 8) errors.password = "Password must be at least 8 characters";
  if (mode === "signup") {
    if (!form.first.trim()) errors.first = "Required";
    if (!form.last.trim()) errors.last = "Required";
    if (!terms) errors.terms = "Please accept the Terms to continue";
  }
  return errors;
}

function validateAddress(form: AddressForm) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Enter the recipient's name.";
  const digits = form.phone.replace(/\D/g, "");
  if (!digits) errors.phone = "Enter a phone number.";
  else if (digits.length < 10 || digits.length > 11) errors.phone = "Enter a valid Nigerian number (10 digits after +234).";
  if (!form.city.trim()) errors.city = "Enter a city or town.";
  if (!form.street.trim()) errors.street = "Enter the street address.";
  return errors;
}

function addressLabel(address?: Address) {
  if (!address) return "";
  return address.type === "Other" ? address.customLabel || "Other" : address.type;
}

function titleForTab(tab: AccountTab) {
  return { overview: "Overview", orders: "Orders", reservations: "Reservations", wishlist: "Wishlist", addresses: "Addresses" }[tab];
}

function formatSeconds(sec = 0) {
  const value = Math.max(0, sec);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function naira(value: number) {
  return `₦${value.toLocaleString()}`;
}
