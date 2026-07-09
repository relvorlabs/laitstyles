"use client";

import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ImagePlus,
  Layers3,
  Minus,
  PackageCheck,
  Plus,
  Save,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  Truck,
  Upload,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  type OfflineSaleInput,
  useControlRoom,
} from "@/components/admin/control-room-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  inventoryTotals,
  type NewStyleDraft,
  type OrderStatus,
  type SaleChannel,
} from "@/lib/control-room";
import { naira } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

const placeholderImages = [
  "https://drive.google.com/thumbnail?id=1T0XygfKzp92Id6ch09aTFcUyG8PbIG66&sz=w1000",
  "https://drive.google.com/thumbnail?id=1mJxRFNyGo2xXT89oLeiuAGZtSvRlw0Jf&sz=w1000",
  "https://drive.google.com/thumbnail?id=1Q8ra1vjG-2D3bDbXvYRUvQeriv-tJbb5&sz=w1000",
  "https://drive.google.com/thumbnail?id=1wyWEgY5Wazc7-chGSdz5IjlpvKAzXL80&sz=w1000",
];

export function ControlRoomOverlays() {
  return (
    <>
      <PieceWizard />
      <InventoryDetailSheet />
      <OrderDetailSheet />
      <CustomerDetailSheet />
      <OfflineSaleDialog />
      <ControlRoomNotice />
    </>
  );
}

function PieceWizard() {
  const { pieceWizard, closeNewPiece, saveNewPiece } = useControlRoom();

  return (
    <Dialog open={pieceWizard.open} onOpenChange={(open) => !open && closeNewPiece()}>
      <DialogContent className="max-h-[92dvh] w-full max-w-[980px] overflow-hidden rounded-[24px] bg-[#F7F5EF] p-0">
        <DialogTitle className="sr-only">Add a piece to inventory</DialogTitle>
        <DialogDescription className="sr-only">
          A four-step workflow for media, stock, pricing and publication.
        </DialogDescription>
        {pieceWizard.open ? (
          <PieceWizardForm
            key={pieceWizard.requestId}
            onCancel={closeNewPiece}
            onSave={saveNewPiece}
            prefill={pieceWizard.prefill}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PieceWizardForm({
  prefill,
  onCancel,
  onSave,
}: {
  prefill: NewStyleDraft;
  onCancel: () => void;
  onSave: (draft: NewStyleDraft) => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<NewStyleDraft>(prefill);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const steps = ["Identity & media", "Stock & variants", "Pricing & details", "Review & publish"];

  function update<K extends keyof NewStyleDraft>(key: K, value: NewStyleDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function validateCurrentStep() {
    if (step === 0 && !draft.name.trim()) return "Give this piece or style a name.";
    if (step === 0 && !draft.category.trim()) return "Choose a category.";
    if (step === 1 && !draft.variants.length) return "Add at least one stock variant.";
    if (
      step === 1 &&
      draft.variants.some((variant) => variant.quantity < 1)
    ) {
      return "Every variant needs at least one unit.";
    }
    if (step === 2 && draft.price <= 0) return "Add a selling price.";
    return "";
  }

  function next() {
    const message = validateCurrentStep();
    if (message) {
      setError(message);
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  }

  function addImage() {
    const nextImage = imageUrl.trim();
    if (!nextImage) return;
    update("images", [...draft.images, nextImage]);
    if (!draft.cover) update("cover", nextImage);
    setImageUrl("");
  }

  function addSampleImage() {
    const image = placeholderImages[draft.images.length % placeholderImages.length];
    update("images", [...draft.images, image]);
    if (!draft.cover) update("cover", image);
  }

  function updateVariant(
    index: number,
    patch: Partial<NewStyleDraft["variants"][number]>,
  ) {
    update(
      "variants",
      draft.variants.map((variant, rowIndex) =>
        rowIndex === index ? { ...variant, ...patch } : variant,
      ),
    );
  }

  function addVariant() {
    update("variants", [
      ...draft.variants,
      {
        size: draft.stockMode === "unique" ? "OS" : "",
        color: "",
        quantity: 1,
        sku: "",
        reorderAt: draft.stockMode === "unique" ? 0 : 2,
      },
    ]);
  }

  return (
    <div className="grid max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto]">
      <div className="border-b border-[#DDDAD1] bg-white px-5 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#7C8C63]">
              Inventory workflow
            </p>
            <h2 className="mt-1 font-serif text-[30px] font-medium">
              Add a piece without leaving the control room
            </h2>
            <p className="mt-1 text-[11.5px] text-[#858278]">
              One-of-one items and stocked styles use the same guided workflow.
            </p>
          </div>
          <button
            aria-label="Close add piece workflow"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[#DDDAD1]"
            onClick={onCancel}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <ol className="mt-5 grid grid-cols-4 gap-2">
          {steps.map((label, index) => (
            <li key={label}>
              <button
                className="w-full text-left"
                disabled={index > step}
                onClick={() => setStep(index)}
                type="button"
              >
                <span
                  className={cn(
                    "mb-2 block h-1.5 rounded-full",
                    index <= step ? "bg-[#667252]" : "bg-[#E4E1D8]",
                  )}
                />
                <span className={cn("hidden text-[10px] font-semibold sm:block", index === step ? "text-[#1D241B]" : "text-[#99968D]")}>{index + 1}. {label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="overflow-y-auto px-5 py-6 sm:px-7">
        {step === 0 ? (
          <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
            <section>
              <SectionLabel icon={<ImagePlus />} title="Media rail" text="Add the images that identify and explain the piece." />
              <div className="mt-4 grid grid-cols-2 gap-3">
                {draft.images.map((image, index) => (
                  <div className="group relative aspect-[4/5] overflow-hidden rounded-[15px] bg-[#E6E5DF]" key={`${image}-${index}`}>
                    <Image alt="Piece media" fill sizes="220px" src={image} className="object-cover" />
                    <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                      <button className="rounded-full bg-white/92 px-2.5 py-1 text-[9px] font-semibold" onClick={() => update("cover", image)} type="button">{draft.cover === image ? "Cover" : "Make cover"}</button>
                      <button aria-label="Remove image" className="grid size-7 place-items-center rounded-full bg-[#1D241B]/85 text-white" onClick={() => update("images", draft.images.filter((_, rowIndex) => rowIndex !== index))} type="button"><Trash2 className="size-3" /></button>
                    </div>
                  </div>
                ))}
                <button className="flex aspect-[4/5] flex-col items-center justify-center rounded-[15px] border border-dashed border-[#CFCBC0] bg-white text-center" onClick={addSampleImage} type="button"><Upload className="size-5 text-[#667252]" /><span className="mt-3 text-[11px] font-semibold">Add sample image</span><span className="mt-1 px-4 text-[9.5px] leading-[1.4] text-[#8A887E]">Upload integration remains a backend boundary.</span></button>
              </div>
              <div className="mt-3 flex gap-2"><label className="sr-only" htmlFor="piece-image-url">Image URL</label><input className="h-10 min-w-0 flex-1 rounded-[10px] border border-[#DDDAD1] bg-white px-3 text-[11.5px] outline-none" id="piece-image-url" onChange={(event) => setImageUrl(event.target.value)} placeholder="Or paste an image URL" value={imageUrl} /><button className="h-10 rounded-full border border-[#D8D5CB] px-4 text-[10.5px] font-semibold" onClick={addImage} type="button">Add</button></div>
            </section>
            <section>
              <SectionLabel icon={<Layers3 />} title="Piece identity" text="Name it the way your team and shoppers will recognise it." />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField label="Piece or style name" className="sm:col-span-2"><input autoFocus className="control-input" onChange={(event) => update("name", event.target.value)} placeholder="Botanical Utility Jean" value={draft.name} /></FormField>
                <FormField label="Category"><select className="control-input" onChange={(event) => update("category", event.target.value)} value={draft.category}><option>Denim</option><option>Jackets</option><option>Shirts</option><option>Dresses</option><option>Knitwear</option><option>Accessories</option><option>Skirts</option><option>Blazers</option></select></FormField>
                <FormField label="Collection"><input className="control-input" onChange={(event) => update("collection", event.target.value)} placeholder="Botanical Workwear" value={draft.collection} /></FormField>
                <FormField label="Condition" className="sm:col-span-2"><select className="control-input" onChange={(event) => update("condition", event.target.value)} value={draft.condition}><option>Excellent</option><option>Good</option><option>Fair</option><option>New old stock</option><option>New</option></select></FormField>
              </div>
            </section>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <SectionLabel icon={<Layers3 />} title="How should stock be tracked?" text="Choose one-of-one for a single physical item, or stocked for a style with quantities and variants." />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ModeCard active={draft.stockMode === "unique"} icon={<ShieldCheck />} title="One-of-one piece" text="One physical item. Once sold, it stays in the archive." onClick={() => { update("stockMode", "unique"); update("variants", [{ ...(draft.variants[0] ?? { size: "M", color: "", sku: "" }), quantity: 1, reorderAt: 0 }]); }} />
              <ModeCard active={draft.stockMode === "stocked"} icon={<Layers3 />} title="Stocked style" text="Multiple units across sizes, colours or other variants." onClick={() => update("stockMode", "stocked")} />
            </div>

            <div className="mt-7 overflow-hidden rounded-[18px] border border-[#DDDAD1] bg-white">
              <div className="flex items-center justify-between border-b border-[#E8E5DD] px-4 py-3.5"><div><p className="text-[12px] font-semibold">Stock variants</p><p className="mt-0.5 text-[10px] text-[#8A887E]">Each row receives its own SKU and availability.</p></div>{draft.stockMode === "stocked" ? <button className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1D241B] px-3.5 text-[10.5px] font-semibold text-white" onClick={addVariant} type="button"><Plus className="size-3.5" />Add variant</button> : null}</div>
              <div className="divide-y divide-[#ECE9E1]">
                {draft.variants.map((variant, index) => (
                  <div className="grid gap-3 p-4 md:grid-cols-[.7fr_1fr_.7fr_1fr_.7fr_38px] md:items-end" key={index}>
                    <FormField label="Size"><input className="control-input" onChange={(event) => updateVariant(index, { size: event.target.value })} placeholder="M" value={variant.size} /></FormField>
                    <FormField label="Colour"><input className="control-input" onChange={(event) => updateVariant(index, { color: event.target.value })} placeholder="Indigo" value={variant.color} /></FormField>
                    <FormField label="Quantity"><input className="control-input" min={1} onChange={(event) => updateVariant(index, { quantity: Number(event.target.value) })} type="number" value={variant.quantity} /></FormField>
                    <FormField label="SKU"><input className="control-input" onChange={(event) => updateVariant(index, { sku: event.target.value })} placeholder="Auto if blank" value={variant.sku} /></FormField>
                    <FormField label="Low-stock at"><input className="control-input" disabled={draft.stockMode === "unique"} min={0} onChange={(event) => updateVariant(index, { reorderAt: Number(event.target.value) })} type="number" value={variant.reorderAt} /></FormField>
                    <button aria-label="Remove variant" className="mb-1 grid size-9 place-items-center rounded-full border border-[#DDDAD1] text-[#9A5147] disabled:opacity-30" disabled={draft.variants.length === 1} onClick={() => update("variants", draft.variants.filter((_, rowIndex) => rowIndex !== index))} type="button"><Trash2 className="size-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <section>
              <SectionLabel icon={<CircleDollarSign />} title="Pricing" text="Track selling price and cost so revenue has context." />
              <div className="mt-4 space-y-4"><FormField label="Selling price"><MoneyInput value={draft.price} onChange={(value) => update("price", value)} /></FormField><FormField label="Cost per unit"><MoneyInput value={draft.cost} onChange={(value) => update("cost", value)} /></FormField><div className="rounded-[15px] bg-[#EEF1E8] p-4"><p className="text-[10px] uppercase tracking-[.1em] text-[#667252]">Gross margin preview</p><p className="mt-2 font-serif text-[27px]">{draft.price > 0 ? `${Math.max(0, Math.round(((draft.price - draft.cost) / draft.price) * 100))}%` : "—"}</p><p className="mt-1 text-[10.5px] text-[#747B68]">Before delivery, payment and operating costs.</p></div></div>
            </section>
            <section>
              <SectionLabel icon={<BadgeCheck />} title="Description and selling truth" text="Give the team enough information to fulfil and support the customer." />
              <FormField className="mt-4" label="Description"><textarea className="min-h-36 w-full resize-y rounded-[12px] border border-[#D8D5CB] bg-white px-3.5 py-3 text-[12.5px] leading-[1.55] outline-none focus:border-[#7C8C63]" onChange={(event) => update("description", event.target.value)} placeholder="Describe fit, fabric, construction and anything the customer should know." value={draft.description} /></FormField>
              <div className="mt-4 rounded-[16px] border border-[#E4D9BC] bg-[#FFF8E9] p-4"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#9A762D]" /><div><p className="text-[11.5px] font-semibold text-[#7D6128]">Inventory truth check</p><p className="mt-1 text-[10.5px] leading-[1.5] text-[#8E774A]">Held units remain inside on-hand quantity but are excluded from available stock. Offline sales can never consume those units.</p></div></div></div>
            </section>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
            <section className="overflow-hidden rounded-[20px] border border-[#DDDAD1] bg-white">
              <div className="relative aspect-[16/11] bg-[#E6E5DF]">{draft.cover ? <Image alt={draft.name || "New inventory piece"} fill sizes="480px" src={draft.cover} className="object-cover" /> : <div className="grid h-full place-items-center text-[#8A887E]"><ImagePlus className="size-7" /></div>}</div>
              <div className="p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#E8EEE1] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.08em] text-[#566347]">{draft.stockMode}</span><span className="rounded-full bg-[#F0EEE8] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.08em] text-[#67655E]">{draft.condition}</span></div><h3 className="mt-3 font-serif text-[28px]">{draft.name || "Untitled piece"}</h3><p className="mt-1 text-[11.5px] text-[#858278]">{draft.collection || "No collection"} · {draft.variants.length} variants</p><p className="mt-4 font-serif text-[24px]">{draft.price ? naira(draft.price) : "Price not set"}</p></div>
            </section>
            <section>
              <SectionLabel icon={<PackageCheck />} title="Ready to create" text="Review the operational record before it enters inventory." />
              <div className="mt-4 space-y-3"><ReviewLine label="Stock model" value={draft.stockMode === "unique" ? "One-of-one physical item" : "Stocked style with quantities"} /><ReviewLine label="Total units" value={String(draft.variants.reduce((sum, variant) => sum + variant.quantity, 0))} /><ReviewLine label="Variants" value={String(draft.variants.length)} /><ReviewLine label="Media" value={`${draft.images.length} images`} /><ReviewLine label="Selling price" value={draft.price ? naira(draft.price) : "Missing"} /><ReviewLine label="Cost per unit" value={draft.cost ? naira(draft.cost) : "Not entered"} /></div>
              <button aria-pressed={draft.publishNow} className="mt-5 flex w-full items-center justify-between gap-4 rounded-[16px] border border-[#D8D5CB] bg-white p-4 text-left" onClick={() => update("publishNow", !draft.publishNow)} type="button"><div><p className="text-[12px] font-semibold">Publish to the storefront now</p><p className="mt-1 text-[10.5px] text-[#858278]">Leave off to save as an inventory draft.</p></div><span className={cn("relative h-6 w-11 rounded-full", draft.publishNow ? "bg-[#667252]" : "bg-[#D7D4CA]")}><span className={cn("absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform", draft.publishNow ? "translate-x-6" : "translate-x-1")} /></span></button>
            </section>
          </div>
        ) : null}

        {error ? <p className="mt-5 rounded-[12px] bg-[#F8E7E4] px-4 py-3 text-[11.5px] font-semibold text-[#944C43]" role="alert">{error}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#DDDAD1] bg-white px-5 py-4 sm:px-7">
        <button className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D8D5CB] px-4 text-[11.5px] font-semibold disabled:opacity-40" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} type="button"><ArrowLeft className="size-3.5" />Back</button>
        <span className="text-[10.5px] text-[#8A887E]">Step {step + 1} of 4</span>
        {step < 3 ? <button className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1D241B] px-5 text-[11.5px] font-semibold text-white" onClick={next} type="button">Continue<ArrowRight className="size-3.5" /></button> : <button className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1D241B] px-5 text-[11.5px] font-semibold text-white" onClick={() => onSave(draft)} type="button"><Save className="size-3.5" />{draft.publishNow ? "Create & publish" : "Save inventory draft"}</button>}
      </div>
    </div>
  );
}

function InventoryDetailSheet() {
  const {
    selectedStyle,
    closeStyle,
    updateStyle,
    updateVariant,
    togglePublish,
    openOfflineSale,
  } = useControlRoom();
  const [tab, setTab] = useState<"stock" | "details" | "media">("stock");

  const totals = selectedStyle ? inventoryTotals(selectedStyle) : null;

  return (
    <Sheet open={Boolean(selectedStyle)} onOpenChange={(open) => !open && closeStyle()}>
      <SheetContent className="w-full max-w-full overflow-y-auto bg-[#F7F5EF] p-0 sm:max-w-[720px]" side="right">
        {selectedStyle && totals ? (
          <div>
            <div className="relative aspect-[16/7] overflow-hidden bg-[#E6E5DF]">
              <Image alt={selectedStyle.name} fill sizes="720px" src={selectedStyle.cover} className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(18,22,16,.78))] px-6 pb-5 pt-20 text-white">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/60">{selectedStyle.collection}</p>
                    <SheetTitle className="mt-1 font-serif text-[32px] font-medium text-white">{selectedStyle.name}</SheetTitle>
                    <SheetDescription className="mt-1 text-[11.5px] text-white/65">{selectedStyle.stockMode === "unique" ? "One-of-one piece" : `${selectedStyle.variants.length} stocked variants`} · updated {selectedStyle.updatedAt}</SheetDescription>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold backdrop-blur">{selectedStyle.published ? "Visible online" : "Hidden from store"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 border-b border-[#DDDAD1] bg-white">
              <SheetMetric label="Available" value={totals.available} />
              <SheetMetric label="Held" value={totals.held} />
              <SheetMetric label="Sold" value={totals.sold} />
              <SheetMetric label="Sell-through" value={`${totals.sellThrough}%`} />
            </div>

            <div className="sticky top-0 z-10 flex gap-1 border-b border-[#DDDAD1] bg-[#F7F5EF]/94 px-5 py-3 backdrop-blur">
              {(["stock", "details", "media"] as const).map((item) => <button aria-pressed={tab === item} className={cn("h-9 rounded-full px-4 text-[10.5px] font-semibold capitalize", tab === item ? "bg-[#1D241B] text-white" : "text-[#6E6C64]")} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}
              <div className="flex-1" />
              <button className="h-9 rounded-full border border-[#D8D5CB] bg-white px-3.5 text-[10.5px] font-semibold" onClick={() => openOfflineSale(selectedStyle.id)} type="button">Record sale</button>
            </div>

            <div className="p-5 sm:p-6">
              {tab === "stock" ? (
                <div>
                  <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#7C8C63]">Variant ledger</p><h3 className="mt-1 font-serif text-[26px]">Stock by size and colour</h3></div><span className="text-[10.5px] text-[#8A887E]">Held units remain on hand</span></div>
                  <div className="space-y-3">{selectedStyle.variants.map((variant) => { const available = variant.onHand - variant.held; return <div className="rounded-[17px] border border-[#DDDAD1] bg-white p-4" key={variant.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[13px] font-semibold">{variant.size} · {variant.color}</p><p className="mt-1 text-[10.5px] text-[#8A887E]">SKU {variant.sku}</p></div><div className="flex items-center gap-2"><button aria-label="Decrease stock" className="grid size-8 place-items-center rounded-full border border-[#DDDAD1]" disabled={variant.onHand <= variant.held} onClick={() => updateVariant(selectedStyle.id, variant.id, { onHand: Math.max(variant.held, variant.onHand - 1) })} type="button"><Minus className="size-3" /></button><span className="min-w-10 text-center font-serif text-[22px]">{variant.onHand}</span><button aria-label="Increase stock" className="grid size-8 place-items-center rounded-full bg-[#1D241B] text-white" onClick={() => updateVariant(selectedStyle.id, variant.id, { onHand: variant.onHand + 1 })} type="button"><Plus className="size-3" /></button></div></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#ECE9E1] pt-4"><SmallStat label="Available" value={available} /><SmallStat label="Held" value={variant.held} /><SmallStat label="Sold" value={variant.sold} /></div>{variant.reorderAt > 0 && available <= variant.reorderAt ? <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#FFF4E1] px-3 py-2 text-[10.5px] font-semibold text-[#8B6531]"><AlertTriangle className="size-3.5" />Low-stock threshold reached</div> : null}</div>; })}</div>
                </div>
              ) : null}

              {tab === "details" ? (
                <div className="space-y-5"><SectionLabel icon={<BadgeCheck />} title="Selling details" text="Edit the fields your team and storefront use." /><FormField label="Style name"><input className="control-input" defaultValue={selectedStyle.name} onBlur={(event) => event.target.value !== selectedStyle.name && updateStyle(selectedStyle.id, { name: event.target.value })} /></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField label="Selling price"><MoneyInput value={selectedStyle.price} onChange={(price) => updateStyle(selectedStyle.id, { price })} /></FormField><FormField label="Cost per unit"><MoneyInput value={selectedStyle.cost} onChange={(cost) => updateStyle(selectedStyle.id, { cost })} /></FormField></div><FormField label="Description"><textarea className="min-h-32 w-full rounded-[12px] border border-[#D8D5CB] bg-white px-3.5 py-3 text-[12.5px] outline-none" defaultValue={selectedStyle.description} onBlur={(event) => event.target.value !== selectedStyle.description && updateStyle(selectedStyle.id, { description: event.target.value })} /></FormField><button aria-pressed={selectedStyle.published} className="flex w-full items-center justify-between gap-4 rounded-[16px] border border-[#DDDAD1] bg-white p-4 text-left" onClick={() => togglePublish(selectedStyle.id)} type="button"><div><p className="text-[12px] font-semibold">Visible on the storefront</p><p className="mt-1 text-[10.5px] text-[#858278]">Turn off without deleting stock history.</p></div><span className={cn("relative h-6 w-11 rounded-full", selectedStyle.published ? "bg-[#667252]" : "bg-[#D7D4CA]")}><span className={cn("absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform", selectedStyle.published ? "translate-x-6" : "translate-x-1")} /></span></button></div>
              ) : null}

              {tab === "media" ? (
                <div><SectionLabel icon={<ImagePlus />} title="Media library" text="Choose the cover and review every image attached to this style." /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{selectedStyle.images.map((image, index) => <button className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[#E6E5DF]" key={`${image}-${index}`} onClick={() => updateStyle(selectedStyle.id, { cover: image })} type="button"><Image alt={`${selectedStyle.name} image ${index + 1}`} fill sizes="220px" src={image} className="object-cover" />{selectedStyle.cover === image ? <span className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2.5 py-1 text-[9px] font-semibold">Cover</span> : null}</button>)}</div></div>
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function OrderDetailSheet() {
  const { selectedOrder, closeOrder, updateOrderStatus, inventory } = useControlRoom();
  const style = selectedOrder ? inventory.find((item) => item.id === selectedOrder.styleId) : null;
  const variant = selectedOrder && style ? style.variants.find((item) => item.id === selectedOrder.variantId) : null;
  const statuses: OrderStatus[] = ["new", "paid", "packing", "dispatched", "delivered", "cancelled"];

  return (
    <Sheet open={Boolean(selectedOrder)} onOpenChange={(open) => !open && closeOrder()}>
      <SheetContent className="w-full max-w-full overflow-y-auto bg-[#F7F5EF] p-0 sm:max-w-[580px]" side="right">
        {selectedOrder ? <div><SheetHeader className="border-b border-[#DDDAD1] bg-white p-6 text-left"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7C8C63]">Order {selectedOrder.id}</p><SheetTitle className="mt-1 font-serif text-[30px] font-medium">{selectedOrder.customer}</SheetTitle><SheetDescription>{selectedOrder.placedAt} · {selectedOrder.channel}</SheetDescription></SheetHeader><div className="p-5 sm:p-6"><div className="flex gap-4 rounded-[18px] border border-[#DDDAD1] bg-white p-4"><div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[12px] bg-[#E6E5DF]">{style ? <Image alt={style.name} fill sizes="80px" src={style.cover} className="object-cover" /> : null}</div><div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold">{style?.name}</p><p className="mt-1 text-[11px] text-[#858278]">{variant?.size} · {variant?.color} · Qty {selectedOrder.quantity}</p><p className="mt-4 font-serif text-[22px]">{naira(selectedOrder.amount)}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3"><InfoCard label="Payment" value={selectedOrder.payment} icon={<WalletCards />} /><InfoCard label="Delivery" value={selectedOrder.delivery} icon={<Truck />} /></div><div className="mt-6"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#7C8C63]">Move order</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{statuses.map((status) => <button aria-pressed={selectedOrder.status === status} className={cn("h-10 rounded-full border px-3 text-[10.5px] font-semibold capitalize", selectedOrder.status === status ? "border-[#1D241B] bg-[#1D241B] text-white" : "border-[#D8D5CB] bg-white")} key={status} onClick={() => updateOrderStatus(selectedOrder.id, status)} type="button">{status}</button>)}</div></div><div className="mt-6 rounded-[17px] border border-[#E4D9BC] bg-[#FFF8E9] p-4"><p className="text-[11px] font-semibold text-[#7D6128]">Fulfilment note</p><p className="mt-1 text-[11px] leading-[1.55] text-[#8E774A]">{selectedOrder.note}</p></div><div className="mt-6 space-y-3 border-t border-[#DDDAD1] pt-5"><InfoRow label="Email" value={selectedOrder.email} /><InfoRow label="Payment state" value={selectedOrder.payment} /><InfoRow label="Sales channel" value={selectedOrder.channel} /></div></div></div> : null}
      </SheetContent>
    </Sheet>
  );
}

function CustomerDetailSheet() {
  const { selectedCustomer, closeCustomer, orders, openOrder } = useControlRoom();
  const customerOrders = selectedCustomer ? orders.filter((order) => order.customerId === selectedCustomer.id) : [];
  return <Sheet open={Boolean(selectedCustomer)} onOpenChange={(open) => !open && closeCustomer()}><SheetContent className="w-full max-w-full overflow-y-auto bg-[#F7F5EF] p-0 sm:max-w-[620px]" side="right">{selectedCustomer ? <div><SheetHeader className="border-b border-[#DDDAD1] bg-white p-6 text-left"><div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-full bg-[#E8ECE1] font-serif text-[20px] text-[#596548]">{selectedCustomer.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><div><SheetTitle className="font-serif text-[30px] font-medium">{selectedCustomer.name}</SheetTitle><SheetDescription>{selectedCustomer.city} · joined {selectedCustomer.joinedAt}</SheetDescription></div></div></SheetHeader><div className="p-5 sm:p-6"><div className="grid grid-cols-3 gap-3"><SmallCard label="Spent" value={naira(selectedCustomer.totalSpent)} /><SmallCard label="Orders" value={String(selectedCustomer.orderCount)} /><SmallCard label="Delivery" value={`${selectedCustomer.deliverySuccess}%`} /></div><div className="mt-5 flex flex-wrap gap-1.5">{selectedCustomer.tags.map((tag) => <span className="rounded-full bg-[#EEF1E8] px-2.5 py-1 text-[9.5px] font-semibold text-[#5F7043]" key={tag}>{tag}</span>)}</div><div className="mt-6 space-y-3 rounded-[18px] border border-[#DDDAD1] bg-white p-4"><InfoRow label="Email" value={selectedCustomer.email} /><InfoRow label="Phone" value={selectedCustomer.phone} /><InfoRow label="Average payment" value={selectedCustomer.averagePaymentTime} /><InfoRow label="Delivered / cancelled" value={`${selectedCustomer.deliveredCount} / ${selectedCustomer.cancelledCount}`} /></div><div className="mt-7"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#7C8C63]">Order history</p><div className="mt-3 space-y-2.5">{customerOrders.length ? customerOrders.map((order) => <button className="flex w-full items-center justify-between gap-4 rounded-[14px] border border-[#DDDAD1] bg-white p-3.5 text-left" key={order.id} onClick={() => openOrder(order.id)} type="button"><div><p className="text-[12px] font-semibold">{order.id}</p><p className="mt-1 text-[10.5px] capitalize text-[#858278]">{order.status} · {order.placedAt}</p></div><span className="font-serif text-[18px]">{naira(order.amount)}</span></button>) : <p className="rounded-[14px] border border-dashed border-[#D8D5CB] px-4 py-7 text-center text-[11px] text-[#8A887E]">No seeded order history for this profile.</p>}</div></div><div className="mt-7"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#7C8C63]">Reviews</p><div className="mt-3 space-y-3">{selectedCustomer.reviews.length ? selectedCustomer.reviews.map((review) => <div className="rounded-[16px] border border-[#DDDAD1] bg-white p-4" key={review.id}><div className="flex items-center gap-1 text-[#C49A51]">{Array.from({ length: 5 }).map((_, index) => <Star className={cn("size-3.5", index < review.rating && "fill-current")} key={index} />)}</div><p className="mt-3 text-[11.5px] leading-[1.55] text-[#65635C]">{review.text}</p><p className="mt-2 text-[9.5px] text-[#9A978D]">{review.createdAt}</p></div>) : <p className="rounded-[14px] bg-[#F0EEE8] px-4 py-5 text-[11px] text-[#77756D]">No written review yet.</p>}</div></div></div></div> : null}</SheetContent></Sheet>;
}

function OfflineSaleDialog() {
  const { offlineSaleOpen, closeOfflineSale, inventory, recordOfflineSale } = useControlRoom();
  const sellableStyles = inventory.filter((style) => inventoryTotals(style).available > 0 && style.status !== "archived");
  return <Dialog open={offlineSaleOpen} onOpenChange={(open) => !open && closeOfflineSale()}><DialogContent className="w-full max-w-[640px] rounded-[24px] bg-[#F7F5EF] p-0"><DialogTitle className="sr-only">Record an offline sale</DialogTitle><DialogDescription className="sr-only">Choose inventory, quantity, buyer and payment details.</DialogDescription>{offlineSaleOpen ? <OfflineSaleForm key={String(offlineSaleOpen)} styles={sellableStyles} onCancel={closeOfflineSale} onSubmit={recordOfflineSale} /> : null}</DialogContent></Dialog>;
}

function OfflineSaleForm({ styles, onCancel, onSubmit }: { styles: ReturnType<typeof useControlRoom>["inventory"]; onCancel: () => void; onSubmit: (input: OfflineSaleInput) => boolean }) {
  const firstStyle = styles[0];
  const [styleId, setStyleId] = useState(firstStyle?.id ?? "");
  const style = styles.find((item) => item.id === styleId) ?? firstStyle;
  const availableVariants = style?.variants.filter((variant) => variant.onHand - variant.held > 0) ?? [];
  const [variantId, setVariantId] = useState(availableVariants[0]?.id ?? "");
  const variant = availableVariants.find((item) => item.id === variantId) ?? availableVariants[0];
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState(style?.price ?? 0);
  const [channel, setChannel] = useState<SaleChannel>("WhatsApp");
  const [buyer, setBuyer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Transfer");
  const [error, setError] = useState("");

  function chooseStyle(nextId: string) {
    const nextStyle = styles.find((item) => item.id === nextId);
    const nextVariant = nextStyle?.variants.find((item) => item.onHand - item.held > 0);
    setStyleId(nextId);
    setVariantId(nextVariant?.id ?? "");
    setAmount(nextStyle?.price ?? 0);
    setQuantity(1);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!style || !variant) { setError("Choose an available style and variant."); return; }
    if (amount <= 0) { setError("Enter the amount actually paid."); return; }
    const success = onSubmit({ styleId: style.id, variantId: variant.id, quantity, amount, channel, buyer, paymentMethod });
    if (!success) setError("The sale could not be recorded with the current stock.");
  }

  return <form onSubmit={submit}><div className="border-b border-[#DDDAD1] bg-white px-6 py-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7C8C63]">Offline counter</p><h2 className="mt-1 font-serif text-[30px]">Record a sale</h2><p className="mt-1 text-[11px] text-[#858278]">This immediately updates available stock and offline revenue.</p></div><button aria-label="Close offline sale" className="grid size-10 place-items-center rounded-full border border-[#DDDAD1]" onClick={onCancel} type="button"><X className="size-4" /></button></div></div><div className="space-y-4 px-6 py-6"><FormField label="Style"><select className="control-input" onChange={(event) => chooseStyle(event.target.value)} value={styleId}>{styles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>{style ? <div className="flex gap-3 rounded-[15px] border border-[#DDDAD1] bg-white p-3"><div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[10px] bg-[#E6E5DF]"><Image alt={style.name} fill sizes="64px" src={style.cover} className="object-cover" /></div><div><p className="text-[12.5px] font-semibold">{style.name}</p><p className="mt-1 text-[10.5px] text-[#858278]">{inventoryTotals(style).available} units available after holds</p><p className="mt-3 font-serif text-[19px]">List price {naira(style.price)}</p></div></div> : null}<div className="grid gap-4 sm:grid-cols-2"><FormField label="Variant"><select className="control-input" onChange={(event) => setVariantId(event.target.value)} value={variantId}>{availableVariants.map((item) => <option key={item.id} value={item.id}>{item.size} · {item.color} · {item.onHand - item.held} ready</option>)}</select></FormField><FormField label="Quantity"><input className="control-input" max={variant ? variant.onHand - variant.held : 1} min={1} onChange={(event) => setQuantity(Number(event.target.value))} type="number" value={quantity} /></FormField><FormField label="Amount paid"><MoneyInput value={amount} onChange={setAmount} /></FormField><FormField label="Channel"><select className="control-input" onChange={(event) => setChannel(event.target.value as SaleChannel)} value={channel}><option>WhatsApp</option><option>Instagram</option><option>Walk-in</option><option>Pop-up</option></select></FormField><FormField label="Buyer name"><input className="control-input" onChange={(event) => setBuyer(event.target.value)} placeholder="Optional for walk-ins" value={buyer} /></FormField><FormField label="Payment method"><select className="control-input" onChange={(event) => setPaymentMethod(event.target.value)} value={paymentMethod}><option>Transfer</option><option>Cash</option><option>POS</option></select></FormField></div>{error ? <p className="rounded-[10px] bg-[#F8E7E4] px-3 py-2.5 text-[10.5px] font-semibold text-[#944C43]" role="alert">{error}</p> : null}<div className="rounded-[14px] bg-[#EEF1E8] p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#60704C]" /><p className="text-[10.5px] leading-[1.5] text-[#657056]">Held online units are protected. Only the currently available quantity can be recorded as an offline sale.</p></div></div></div><div className="flex justify-end gap-2 border-t border-[#DDDAD1] bg-white px-6 py-4"><button className="h-10 rounded-full border border-[#D8D5CB] px-4 text-[11px] font-semibold" onClick={onCancel} type="button">Cancel</button><button className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1D241B] px-5 text-[11px] font-semibold text-white" type="submit"><Banknote className="size-3.5" />Record sale</button></div></form>;
}

function ControlRoomNotice() {
  const { notice, dismissNotice } = useControlRoom();
  if (!notice) return null;
  return <div aria-live="polite" className={cn("fixed bottom-5 left-1/2 z-[120] flex w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 items-start gap-3 rounded-[16px] px-4 py-3.5 text-white shadow-[0_18px_60px_rgba(0,0,0,.22)]", notice.tone === "success" && "bg-[#263322]", notice.tone === "info" && "bg-[#2C3544]", notice.tone === "danger" && "bg-[#713E37]")}><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/12">{notice.tone === "success" ? <Check className="size-3.5" /> : notice.tone === "danger" ? <AlertTriangle className="size-3.5" /> : <BadgeCheck className="size-3.5" />}</span><div className="min-w-0 flex-1"><p className="text-[11.5px] font-semibold">{notice.title}</p><p className="mt-1 text-[10.5px] leading-[1.45] text-white/68">{notice.message}</p></div><button aria-label="Dismiss notification" onClick={dismissNotice} type="button"><X className="size-3.5" /></button></div>;
}

function SectionLabel({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#EEF1E8] text-[#60704C] [&_svg]:size-4">{icon}</span><div><h3 className="font-serif text-[24px]">{title}</h3><p className="mt-1 text-[11px] leading-[1.5] text-[#858278]">{text}</p></div></div>; }
function FormField({ label, children, className }: { label: string; children: ReactNode; className?: string }) { return <label className={cn("block", className)}><span className="mb-1.5 block text-[10.5px] font-semibold text-[#67655E]">{label}</span>{children}</label>; }
function MoneyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) { return <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#77756D]">₦</span><input className="control-input pl-8" min={0} onChange={(event) => onChange(Number(event.target.value))} type="number" value={value || ""} /></div>; }
function ModeCard({ active, icon, title, text, onClick }: { active: boolean; icon: ReactNode; title: string; text: string; onClick: () => void }) { return <button aria-pressed={active} className={cn("rounded-[18px] border p-5 text-left", active ? "border-[#667252] bg-[#EEF1E8]" : "border-[#DDDAD1] bg-white")} onClick={onClick} type="button"><span className={cn("grid size-10 place-items-center rounded-full [&_svg]:size-4", active ? "bg-[#667252] text-white" : "bg-[#F0EEE8] text-[#67655E]")}>{icon}</span><h3 className="mt-4 text-[13px] font-semibold">{title}</h3><p className="mt-1 text-[10.5px] leading-[1.5] text-[#77756D]">{text}</p></button>; }
function ReviewLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 rounded-[12px] bg-white px-4 py-3"><span className="text-[10.5px] text-[#858278]">{label}</span><span className="text-right text-[11.5px] font-semibold">{value}</span></div>; }
function SheetMetric({ label, value }: { label: string; value: string | number }) { return <div className="border-r border-[#ECE9E1] px-3 py-4 text-center last:border-r-0"><p className="font-serif text-[23px]">{value}</p><p className="mt-1 text-[9px] uppercase tracking-[.08em] text-[#8A887E]">{label}</p></div>; }
function SmallStat({ label, value }: { label: string; value: number }) { return <div><p className="text-[9px] uppercase tracking-[.08em] text-[#8A887E]">{label}</p><p className="mt-1 text-[13px] font-semibold">{value}</p></div>; }
function InfoCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) { return <div className="rounded-[15px] border border-[#DDDAD1] bg-white p-4"><span className="grid size-8 place-items-center rounded-full bg-[#EEF1E8] text-[#60704C] [&_svg]:size-3.5">{icon}</span><p className="mt-3 text-[9.5px] uppercase tracking-[.08em] text-[#8A887E]">{label}</p><p className="mt-1 text-[11.5px] font-semibold capitalize">{value}</p></div>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4"><span className="text-[10.5px] text-[#858278]">{label}</span><span className="max-w-[65%] text-right text-[11.5px] font-semibold capitalize">{value}</span></div>; }
function SmallCard({ label, value }: { label: string; value: string }) { return <div className="rounded-[14px] border border-[#DDDAD1] bg-white p-3 text-center"><p className="font-serif text-[19px]">{value}</p><p className="mt-1 text-[8.5px] uppercase tracking-[.08em] text-[#8A887E]">{label}</p></div>; }
