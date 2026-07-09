"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  customerSeed,
  defaultNewStyleDraft,
  holdSeed,
  intakeSeed,
  inventorySeed,
  inventoryTotals,
  makeStyleFromDraft,
  offlineSalesSeed,
  orderSeed,
  type ControlRoomCustomer,
  type ControlRoomHold,
  type ControlRoomOrder,
  type IntakeItem,
  type InventoryStyle,
  type InventoryVariant,
  type NewStyleDraft,
  type OfflineSale,
  type OrderStatus,
  type SaleChannel,
} from "@/lib/control-room";

type Notice = {
  tone: "success" | "info" | "danger";
  title: string;
  message: string;
};

export type OfflineSaleInput = {
  styleId: string;
  variantId: string;
  quantity: number;
  amount: number;
  channel: SaleChannel;
  buyer: string;
  paymentMethod: string;
};

type PieceWizardState = {
  open: boolean;
  prefill: NewStyleDraft;
  sourceIntakeId?: string;
  requestId: number;
};

type ControlRoomContextValue = {
  inventory: InventoryStyle[];
  intake: IntakeItem[];
  orders: ControlRoomOrder[];
  holds: ControlRoomHold[];
  customers: ControlRoomCustomer[];
  offlineSales: OfflineSale[];
  notice: Notice | null;
  pieceWizard: PieceWizardState;
  selectedStyle: InventoryStyle | null;
  selectedOrder: ControlRoomOrder | null;
  selectedCustomer: ControlRoomCustomer | null;
  offlineSaleOpen: boolean;
  openNewPiece: (prefill?: Partial<NewStyleDraft>, sourceIntakeId?: string) => void;
  closeNewPiece: () => void;
  saveNewPiece: (draft: NewStyleDraft) => void;
  openIntakeItem: (item: IntakeItem) => void;
  moveIntake: (id: string, stage: IntakeItem["stage"]) => void;
  deleteIntake: (id: string) => void;
  openStyle: (id: string) => void;
  closeStyle: () => void;
  updateStyle: (id: string, patch: Partial<InventoryStyle>) => void;
  updateVariant: (
    styleId: string,
    variantId: string,
    patch: Partial<InventoryVariant>,
  ) => void;
  togglePublish: (id: string) => void;
  openOrder: (id: string) => void;
  closeOrder: () => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  extendHold: (id: string, seconds?: number) => void;
  releaseHold: (id: string) => void;
  openCustomer: (id: string) => void;
  closeCustomer: () => void;
  openOfflineSale: (styleId?: string) => void;
  closeOfflineSale: () => void;
  recordOfflineSale: (input: OfflineSaleInput) => boolean;
  dismissNotice: () => void;
};

const ControlRoomContext = createContext<ControlRoomContextValue | null>(null);

export function ControlRoomProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryStyle[]>(inventorySeed);
  const [intake, setIntake] = useState<IntakeItem[]>(intakeSeed);
  const [orders, setOrders] = useState<ControlRoomOrder[]>(orderSeed);
  const [holds, setHolds] = useState<ControlRoomHold[]>(holdSeed);
  const [customers] = useState<ControlRoomCustomer[]>(customerSeed);
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>(offlineSalesSeed);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pieceWizard, setPieceWizard] = useState<PieceWizardState>({
    open: false,
    prefill: defaultNewStyleDraft(),
    requestId: 0,
  });
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [offlineSaleOpen, setOfflineSaleOpen] = useState(false);
  const [offlineStyleId, setOfflineStyleId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHolds((current) =>
        current.map((hold) => ({
          ...hold,
          secondsLeft: Math.max(0, hold.secondsLeft - 1),
        })),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const selectedStyle = useMemo(
    () => inventory.find((style) => style.id === selectedStyleId) ?? null,
    [inventory, selectedStyleId],
  );
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const showNotice = useCallback(
    (tone: Notice["tone"], title: string, message: string) => {
      setNotice({ tone, title, message });
    },
    [],
  );

  const openNewPiece = useCallback(
    (prefill?: Partial<NewStyleDraft>, sourceIntakeId?: string) => {
      const base = defaultNewStyleDraft();
      setPieceWizard((current) => ({
        open: true,
        prefill: {
          ...base,
          ...prefill,
          variants: prefill?.variants ?? base.variants,
          images: prefill?.images ?? base.images,
        },
        sourceIntakeId,
        requestId: current.requestId + 1,
      }));
    },
    [],
  );

  const closeNewPiece = useCallback(() => {
    setPieceWizard((current) => ({ ...current, open: false }));
  }, []);

  const saveNewPiece = useCallback(
    (draft: NewStyleDraft) => {
      const style = makeStyleFromDraft(draft);
      setInventory((current) => [style, ...current]);
      if (pieceWizard.sourceIntakeId) {
        setIntake((current) =>
          current.filter((item) => item.id !== pieceWizard.sourceIntakeId),
        );
      }
      setPieceWizard((current) => ({ ...current, open: false }));
      setSelectedStyleId(style.id);
      showNotice(
        "success",
        draft.publishNow ? "Piece published" : "Inventory draft created",
        `${style.name} now has tracked stock, variants, pricing and media.`,
      );
    },
    [pieceWizard.sourceIntakeId, showNotice],
  );

  const openIntakeItem = useCallback(
    (item: IntakeItem) => {
      const quantity = item.stockMode === "unique" ? 1 : item.expectedUnits;
      openNewPiece(
        {
          name: item.name,
          category: item.category,
          stockMode: item.stockMode,
          cover: item.cover,
          images: [item.cover],
          variants: [
            {
              size: item.stockMode === "unique" ? "M" : "",
              color: "",
              quantity,
              sku: "",
              reorderAt: item.stockMode === "unique" ? 0 : Math.max(1, Math.floor(quantity * 0.2)),
            },
          ],
        },
        item.id,
      );
    },
    [openNewPiece],
  );

  const moveIntake = useCallback(
    (id: string, stage: IntakeItem["stage"]) => {
      setIntake((current) =>
        current.map((item) => (item.id === id ? { ...item, stage } : item)),
      );
      showNotice("info", "Intake moved", "The arrival is now in the next preparation stage.");
    },
    [showNotice],
  );

  const deleteIntake = useCallback(
    (id: string) => {
      setIntake((current) => current.filter((item) => item.id !== id));
      showNotice("info", "Intake removed", "The unfinished arrival was removed from the queue.");
    },
    [showNotice],
  );

  const openStyle = useCallback((id: string) => setSelectedStyleId(id), []);
  const closeStyle = useCallback(() => setSelectedStyleId(null), []);

  const updateStyle = useCallback(
    (id: string, patch: Partial<InventoryStyle>) => {
      setInventory((current) =>
        current.map((style) =>
          style.id === id
            ? { ...style, ...patch, updatedAt: "Just now" }
            : style,
        ),
      );
      showNotice("success", "Inventory updated", "The style details were saved.");
    },
    [showNotice],
  );

  const updateVariant = useCallback(
    (styleId: string, variantId: string, patch: Partial<InventoryVariant>) => {
      setInventory((current) =>
        current.map((style) =>
          style.id === styleId
            ? {
                ...style,
                updatedAt: "Just now",
                variants: style.variants.map((variant) =>
                  variant.id === variantId ? { ...variant, ...patch } : variant,
                ),
              }
            : style,
        ),
      );
    },
    [],
  );

  const togglePublish = useCallback(
    (id: string) => {
      setInventory((current) =>
        current.map((style) =>
          style.id === id
            ? {
                ...style,
                published: !style.published,
                status: !style.published ? "live" : style.status,
                updatedAt: "Just now",
              }
            : style,
        ),
      );
      showNotice("success", "Storefront visibility changed", "The style publication state is now updated.");
    },
    [showNotice],
  );

  const openOrder = useCallback((id: string) => setSelectedOrderId(id), []);
  const closeOrder = useCallback(() => setSelectedOrderId(null), []);

  const updateOrderStatus = useCallback(
    (id: string, status: OrderStatus) => {
      setOrders((current) =>
        current.map((order) => (order.id === id ? { ...order, status } : order)),
      );
      showNotice("success", "Order moved", `The order is now marked ${status}.`);
    },
    [showNotice],
  );

  const extendHold = useCallback(
    (id: string, seconds = 300) => {
      setHolds((current) =>
        current.map((hold) =>
          hold.id === id
            ? { ...hold, secondsLeft: hold.secondsLeft + seconds }
            : hold,
        ),
      );
      showNotice("success", "Hold extended", `${Math.round(seconds / 60)} minutes were added.`);
    },
    [showNotice],
  );

  const releaseHold = useCallback(
    (id: string) => {
      const hold = holds.find((item) => item.id === id);
      if (!hold) return;

      setHolds((current) => current.filter((item) => item.id !== id));
      setInventory((current) =>
        current.map((style) =>
          style.id === hold.styleId
            ? {
                ...style,
                variants: style.variants.map((variant) =>
                  variant.id === hold.variantId
                    ? {
                        ...variant,
                        held: Math.max(0, variant.held - hold.quantity),
                      }
                    : variant,
                ),
              }
            : style,
        ),
      );
      showNotice("info", "Hold released", "The units are available to shoppers again.");
    },
    [holds, showNotice],
  );

  const openCustomer = useCallback((id: string) => setSelectedCustomerId(id), []);
  const closeCustomer = useCallback(() => setSelectedCustomerId(null), []);

  const openOfflineSale = useCallback((styleId?: string) => {
    setOfflineStyleId(styleId ?? null);
    setOfflineSaleOpen(true);
  }, []);
  const closeOfflineSale = useCallback(() => {
    setOfflineSaleOpen(false);
    setOfflineStyleId(null);
  }, []);

  const recordOfflineSale = useCallback(
    (input: OfflineSaleInput) => {
      const style = inventory.find((item) => item.id === input.styleId);
      const variant = style?.variants.find((item) => item.id === input.variantId);
      if (!style || !variant) return false;

      const available = variant.onHand - variant.held;
      if (input.quantity < 1 || input.quantity > available) {
        showNotice(
          "danger",
          "Not enough available stock",
          `Only ${Math.max(0, available)} units can be sold without touching shopper holds.`,
        );
        return false;
      }

      setInventory((current) =>
        current.map((item) =>
          item.id === input.styleId
            ? {
                ...item,
                updatedAt: "Just now",
                variants: item.variants.map((row) =>
                  row.id === input.variantId
                    ? {
                        ...row,
                        onHand: row.onHand - input.quantity,
                        sold: row.sold + input.quantity,
                      }
                    : row,
                ),
              }
            : item,
        ),
      );

      const sale: OfflineSale = {
        id: `OFF-${String(offlineSales.length + 105).padStart(3, "0")}`,
        styleId: style.id,
        variantId: variant.id,
        styleName: style.name,
        quantity: input.quantity,
        amount: input.amount,
        channel: input.channel,
        buyer: input.buyer || "Walk-in customer",
        paymentMethod: input.paymentMethod,
        soldAt: "Just now",
      };
      setOfflineSales((current) => [sale, ...current]);
      setOfflineSaleOpen(false);
      setOfflineStyleId(null);
      showNotice(
        "success",
        "Offline sale recorded",
        `${input.quantity} ${input.quantity === 1 ? "unit" : "units"} removed from available stock and added to revenue.`,
      );
      return true;
    },
    [inventory, offlineSales.length, showNotice],
  );

  const contextValue = useMemo<ControlRoomContextValue>(
    () => ({
      inventory,
      intake,
      orders,
      holds,
      customers,
      offlineSales,
      notice,
      pieceWizard,
      selectedStyle,
      selectedOrder,
      selectedCustomer,
      offlineSaleOpen,
      openNewPiece,
      closeNewPiece,
      saveNewPiece,
      openIntakeItem,
      moveIntake,
      deleteIntake,
      openStyle,
      closeStyle,
      updateStyle,
      updateVariant,
      togglePublish,
      openOrder,
      closeOrder,
      updateOrderStatus,
      extendHold,
      releaseHold,
      openCustomer,
      closeCustomer,
      openOfflineSale,
      closeOfflineSale,
      recordOfflineSale,
      dismissNotice: () => setNotice(null),
    }),
    [
      closeCustomer,
      closeNewPiece,
      closeOfflineSale,
      closeOrder,
      closeStyle,
      customers,
      deleteIntake,
      extendHold,
      holds,
      intake,
      inventory,
      moveIntake,
      notice,
      offlineSaleOpen,
      offlineSales,
      openCustomer,
      openIntakeItem,
      openNewPiece,
      openOfflineSale,
      openOrder,
      openStyle,
      orders,
      pieceWizard,
      recordOfflineSale,
      releaseHold,
      saveNewPiece,
      selectedCustomer,
      selectedOrder,
      selectedStyle,
      togglePublish,
      updateOrderStatus,
      updateStyle,
      updateVariant,
    ],
  );

  return (
    <ControlRoomContext.Provider value={contextValue}>
      {children}
      <span className="sr-only" data-offline-style={offlineStyleId ?? ""} />
    </ControlRoomContext.Provider>
  );
}

export function useControlRoom() {
  const value = useContext(ControlRoomContext);
  if (!value) {
    throw new Error("useControlRoom must be used inside ControlRoomProvider");
  }
  return value;
}

export function findVariant(style: InventoryStyle, variantId: string) {
  return style.variants.find((variant) => variant.id === variantId) ?? style.variants[0];
}

export function availableUnits(style: InventoryStyle) {
  return inventoryTotals(style).available;
}
