import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Wallet,
} from "lucide-react";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Spinner } from "@/shared/components/Spinner";
import { useAuth } from "@/shared/hooks/useAuth";
import { useCart } from "@/shared/hooks/useCart";
import {
  orderService,
  type OrderAddress,
} from "@/shared/services/order.service";
import { calculateOrderTotals } from "@/shared/services/orderTotals.service";
import type { Order, Restaurant } from "@/shared/types";
import { formatCurrency } from "@/shared/utils/format";
import {
  isValidAddress,
  isValidCardExpiry,
  isValidCardNumber,
  isValidCvc,
  isValidPhone,
} from "@/shared/utils/validation";
import { useLanguage } from "@/shared/hooks/useLanguage";

type Payment = "cash" | "card";
const DRAFT_KEY = "crown-anchor-checkout-draft";
interface Draft {
  name: string;
  phone: string;
  address: string;
  notes: string;
  payment: Payment;
  delivery: "asap" | "scheduled";
  slot: string;
  tip: number;
  customTip: string;
  promo: string;
}
const initialDraft: Draft = {
  name: "",
  phone: "",
  address: "",
  notes: "",
  payment: "cash",
  delivery: "asap",
  slot: "",
  tip: 0,
  customTip: "",
  promo: "",
};
function getDraft(): Draft {
  try {
    return {
      ...initialDraft,
      ...(JSON.parse(
        localStorage.getItem(DRAFT_KEY) ?? "{}",
      ) as Partial<Draft>),
    };
  } catch {
    return initialDraft;
  }
}
function money(value: number) {
  return formatCurrency(value);
}

export default function CheckoutPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState<Draft>(() => {
    const draft = getDraft();
    return {
      ...draft,
      name: draft.name || user?.name || "",
      phone: draft.phone || user?.phone || "",
    };
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [addresses, setAddresses] = useState<OrderAddress[]>(() =>
    orderService.getAddresses(),
  );
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [promo, setPromo] = useState<{
    code: string;
    discount: number;
    deliveryFee: number;
  } | null>(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveAddress, setSaveAddress] = useState(false);

  useEffect(() => {
    fetch("/mock/restaurants.json")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load restaurant details.");
        setRestaurants((await response.json()) as Restaurant[]);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? t(reason.message)
            : "Could not load restaurant details.",
        ),
      )
      .finally(() => setLoadingRestaurant(false));
  }, [t]);
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const cartGroups = useMemo(() => {
    const groups = new Map<number, { restaurant: Restaurant | null; items: typeof cart.items; subtotal: number }>();
    cart.items.forEach((item) => {
      const existing = groups.get(item.restaurantId);
      if (existing) {
        existing.items.push(item);
        existing.subtotal += item.price * item.quantity;
      } else {
        groups.set(item.restaurantId, {
          restaurant: restaurants.find((value) => value.id === item.restaurantId) ?? null,
          items: [item],
          subtotal: item.price * item.quantity,
        });
      }
    });
    return Array.from(groups.entries()).map(([restaurantId, group]) => ({ restaurantId, ...group }));
  }, [cart.items, restaurants]);
  const deliveryFee = promo?.deliveryFee ?? cartGroups.reduce(
    (total, group) => total + (group.restaurant?.deliveryFee ?? 0), 0
  );
  const tip = form.customTip.trim()
    ? Math.max(0, Number(form.customTip) || 0)
    : form.tip;
  const groupedTotals = useMemo(() => {
    let allocatedDiscount = 0;
    let allocatedTip = 0;
    return cartGroups.map((group, index) => {
      const isLast = index === cartGroups.length - 1;
      const discountShare = isLast
        ? Number(((promo?.discount ?? 0) - allocatedDiscount).toFixed(2))
        : Number(((promo?.discount ?? 0) * group.subtotal / (cart.subtotal || 1)).toFixed(2));
      const tipShare = isLast
        ? Number((tip - allocatedTip).toFixed(2))
        : Number((tip * group.subtotal / (cart.subtotal || 1)).toFixed(2));
      allocatedDiscount += discountShare;
      allocatedTip += tipShare;
      return {
        ...group,
        totals: calculateOrderTotals({
          subtotal: group.subtotal,
          deliveryFee: promo?.deliveryFee === 0 ? 0 : (group.restaurant?.deliveryFee ?? 0),
          discount: discountShare,
          tip: tipShare,
        }),
      };
    });
  }, [cartGroups, promo, tip, cart.subtotal]);
  const totals = useMemo(
    () => groupedTotals.reduce((sum, group) => ({
      subtotal: sum.subtotal + group.totals.subtotal,
      deliveryFee: sum.deliveryFee + group.totals.deliveryFee,
      serviceFee: sum.serviceFee + group.totals.serviceFee,
      tax: sum.tax + group.totals.tax,
      discount: sum.discount + group.totals.discount,
      tip: sum.tip + group.totals.tip,
      total: sum.total + group.totals.total,
    }), { subtotal: 0, deliveryFee: 0, serviceFee: 0, tax: 0, discount: 0, tip: 0, total: 0 }),
    [groupedTotals],
  );
  const [slotsStart] = useState(() => Date.now());
  const slots = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date(slotsStart + (index + 1) * 60 * 60 * 1000);
        date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30, 0, 0);
        return date;
      }),
    [slotsStart],
  );

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = t("Enter your full name.");
    if (!isValidPhone(form.phone)) next.phone = t("Enter a valid phone number.");
    if (!isValidAddress(form.address))
      next.address = t("Enter a complete delivery address.");
    const belowMinimum = cartGroups.find(
      (group) => group.restaurant && group.subtotal < group.restaurant.minOrder
    );
    if (belowMinimum?.restaurant) {
      next.cart = t('Minimum order for {name} is {amount}.', {
        name: t(belowMinimum.restaurant.name),
        amount: money(belowMinimum.restaurant.minOrder),
      });
    }
    if (cartGroups.some((group) => !group.restaurant)) {
      next.cart = t('Some restaurant details could not be loaded. Please refresh and try again.');
    }
    if (form.delivery === "scheduled" && !form.slot)
      next.slot = t("Choose a delivery time.");
    if (form.payment === "card") {
      if (!isValidCardNumber(card.number))
        next.cardNumber = t("Enter a valid card number.");
      if (!isValidCardExpiry(card.expiry))
        next.expiry = t("Use a valid MM/YY expiry date.");
      if (!isValidCvc(card.cvc)) next.cvc = t("Enter a 3 or 4 digit CVC.");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const applyPromo = async () => {
    const result = await orderService.validatePromo(
      form.promo,
      cart.subtotal,
      deliveryFee,
    );
    setPromo(result);
    setPromoMessage(
      result
        ? result.code === "FREESHIP"
          ? t("Free delivery applied.")
          : t("10% discount applied.")
        : t("That promo code is not valid."),
    );
    if (!result) update("promo", form.promo.toUpperCase());
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !user || !cart.items.length || cartGroups.some((group) => !group.restaurant)) return;
    if (!validate()) {
      document
        .querySelector('[aria-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const scheduledFor = form.delivery === "scheduled" ? form.slot : null;
      const orders: Order[] = [];
      for (const group of groupedTotals) {
        const currentRestaurant = group.restaurant;
        if (!currentRestaurant) throw new Error(t('Some restaurant details could not be loaded. Please refresh and try again.'));
        const groupTotals = group.totals;
        const estimated = new Date(
          Date.now() + (currentRestaurant.deliveryTimeMinutes + 15) * 60000,
        );
        const createdOrder = await orderService.createOrder({
          customerId: user.id,
          customerName: form.name.trim(),
          phone: form.phone.trim(),
          restaurantId: currentRestaurant.id,
          items: group.items,
          deliveryAddress: form.address.trim(),
          paymentMethod: form.payment,
          notes: form.notes.trim(),
          subtotal: groupTotals.subtotal,
          deliveryFee: groupTotals.deliveryFee,
          serviceFee: groupTotals.serviceFee,
          tax: groupTotals.tax,
          discount: groupTotals.discount,
          tip: groupTotals.tip,
          promoCode: promo?.code ?? null,
          scheduledFor,
          estimatedDeliveryAt: new Date(
            Math.max(
              estimated.getTime(),
              scheduledFor ? new Date(scheduledFor).getTime() : 0,
            ),
          ).toISOString(),
        });
        orders.push(createdOrder);
      }
      if (saveAddress) {
        await orderService.saveAddress({
          id: selectedAddressId || crypto.randomUUID(),
          label:
            addresses.find((item) => item.id === selectedAddressId)?.label ??
            t("Saved address"),
          address: form.address.trim(),
          phone: form.phone.trim(),
        });
        setAddresses(orderService.getAddresses());
      }
      localStorage.removeItem(DRAFT_KEY);
      cart.clearCart();
      const firstOrder = orders[0];
      if (!firstOrder) throw new Error(t('We could not create your orders. Please try again.'));
      const relatedIds = orders.slice(1).map((order) => order.id).join(',');
      navigate(`/orders/${firstOrder.id}/confirmation${relatedIds ? `?related=${relatedIds}` : ''}`, { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("We could not place your order. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart.items.length)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title={t("Your cart is empty")}
          description={t("Add a few meals before checking out.")}
          action={
            <Button onClick={() => navigate("/meals")}>{t("Browse meals")}</Button>
          }
        />
      </div>
    );
  if (loadingRestaurant)
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t("Preparing checkout...")} />
      </div>
    );

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        to="/meals"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-brand-red"
      >
        <ArrowLeft size={16} /> {t("Continue browsing")}
      </Link>
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-red">
          {t("Almost there")}
        </p>
        <h1 className="mt-1 text-3xl font-bold">{t("Checkout")}</h1>
        <p className="mt-2 text-text-slate">
          {t("Review your details and place your order securely.")}
        </p>
      </header>
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
        >
          {error}
        </div>
      )}
      <form
        onSubmit={submit}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-5">
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-lg bg-brand-red/10 p-2 text-brand-red">
                <MapPin size={19} />
              </span>
              <div>
                <h2 className="font-semibold">{t("Delivery details")}</h2>
                <p className="text-xs text-text-slate">
                  {t("Where should we bring your order?")}
                </p>
              </div>
            </div>
            {addresses.length > 0 && (
              <>
                <Select
                  label={t("Choose a saved address")}
                  value={selectedAddressId}
                  onChange={(event) => {
                    setSelectedAddressId(event.target.value);
                    const address = addresses.find(
                      (item) => item.id === event.target.value,
                    );
                    if (address) {
                      setForm((current) => ({
                        ...current,
                        address: address.address,
                        phone: address.phone,
                      }));
                    }
                  }}
                >
                  <option value="">{t("Select saved address")}</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label} — {address.address}
                    </option>
                  ))}
                </Select>
                {selectedAddressId && (
                  <button
                    type="button"
                    onClick={() => {
                      orderService.deleteAddress(selectedAddressId);
                      setAddresses(orderService.getAddresses());
                      setSelectedAddressId("");
                    }}
                    className="mt-2 text-xs font-semibold text-danger underline"
                  >
                    {t("Delete selected saved address")}
                  </button>
                )}
              </>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label={t("Full name")}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                error={errors.name}
                autoComplete="name"
                required
              />
              <Input
                label={t("Phone number")}
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                error={errors.phone}
                autoComplete="tel"
                required
              />
            </div>
            <Input
              wrapperClassName="mt-4"
              label={t("Delivery address")}
              value={form.address}
              onChange={(event) => update("address", event.target.value)}
              error={errors.address}
              autoComplete="street-address"
              placeholder={t("Street, building, floor, apartment")}
              required
            />
            <label className="mt-4 flex items-center gap-2 text-sm text-text-slate">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
                className="accent-brand-red"
              />{" "}
              {t("Save this address for next time")}
            </label>
          </Card>
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-lg bg-brand-yellow/25 p-2 text-brand-red">
                <Clock3 size={19} />
              </span>
              <div>
                <h2 className="font-semibold">{t("Delivery time")}</h2>
                <p className="text-xs text-text-slate">
                  {t("Choose when you want your food.")}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => update("delivery", "asap")}
                className={`rounded-xl border p-4 text-start ${form.delivery === "asap" ? "border-brand-red bg-brand-red/5" : "border-border-subtle"}`}
              >
                <span className="font-semibold">
                  {t("As soon as possible")}
                </span>
                <span className="mt-1 block text-xs text-text-slate">
                  {t('About {minutes} minutes', { minutes: Math.max(30, ...cartGroups.map((group) => group.restaurant?.deliveryTimeMinutes ?? 30)) })}
                </span>
              </button>
              <button
                type="button"
                onClick={() => update("delivery", "scheduled")}
                className={`rounded-xl border p-4 text-start ${form.delivery === "scheduled" ? "border-brand-red bg-brand-red/5" : "border-border-subtle"}`}
              >
                <span className="font-semibold">{t("Schedule for later")}</span>
                <span className="mt-1 block text-xs text-text-slate">
                  {t("Pick a time slot")}
                </span>
              </button>
            </div>
            {form.delivery === "scheduled" && (
              <Select
                wrapperClassName="mt-4"
                label={t("Available time slots")}
                value={form.slot}
                onChange={(event) => update("slot", event.target.value)}
                error={errors.slot}
              >
                <option value="">{t("Choose a time")}</option>
                {slots.map((slot) => (
                  <option key={slot.toISOString()} value={slot.toISOString()}>
                    {slot.toLocaleString([], {
                      weekday: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
              </Select>
            )}
          </Card>
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-lg bg-brand-red/10 p-2 text-brand-red">
                <Wallet size={19} />
              </span>
              <div>
                <h2 className="font-semibold">{t("Payment method")}</h2>
                <p className="text-xs text-text-slate">
                  {t("Choose how you would like to pay.")}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => update("payment", "cash")}
                className={`flex items-center gap-3 rounded-xl border p-4 text-start ${form.payment === "cash" ? "border-brand-red bg-brand-red/5" : "border-border-subtle"}`}
              >
                <Wallet />
                <span>
                  <b className="block">{t("Cash on delivery")}</b>
                  <small className="text-text-slate">{t("Pay when it arrives")}</small>
                </span>
              </button>
              <button
                type="button"
                onClick={() => update("payment", "card")}
                className={`flex items-center gap-3 rounded-xl border p-4 text-start ${form.payment === "card" ? "border-brand-red bg-brand-red/5" : "border-border-subtle"}`}
              >
                <CreditCard />
                <span>
                  <b className="block">{t("Card")}</b>
                  <small className="text-text-slate">
                    {t("Simulated demo payment")}
                  </small>
                </span>
              </button>
            </div>
            {form.payment === "card" && (
              <div className="mt-4 rounded-xl border border-brand-yellow/50 bg-brand-yellow/10 p-3 text-sm text-text-main">
                {t("Demo only: card details are validated in your browser and are never sent or saved.")}
              </div>
            )}
            {form.payment === "card" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  wrapperClassName="sm:col-span-2"
                  label={t("Card number")}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={card.number}
                  onChange={(event) =>
                    setCard((current) => ({
                      ...current,
                      number: event.target.value,
                    }))
                  }
                  error={errors.cardNumber}
                  placeholder="1234 5678 9012 3456"
                />
                <Input
                  label={t("Expiry (MM/YY)")}
                  autoComplete="cc-exp"
                  value={card.expiry}
                  onChange={(event) =>
                    setCard((current) => ({
                      ...current,
                      expiry: event.target.value,
                    }))
                  }
                  error={errors.expiry}
                  placeholder="MM/YY"
                />
                <Input
                  label={t("CVC")}
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={card.cvc}
                  onChange={(event) =>
                    setCard((current) => ({
                      ...current,
                      cvc: event.target.value,
                    }))
                  }
                  error={errors.cvc}
                  placeholder="123"
                />
              </div>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{t('Order notes')}</h2>
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={3}
              maxLength={300}
              placeholder={t("Allergies, gate code, delivery instructions...")}
              className="w-full rounded-lg border border-border-subtle bg-surface-white p-3 text-sm text-text-main"
            />
            <p className="mt-1 text-end text-xs text-text-slate">
              {form.notes.length}/300
            </p>
          </Card>
        </div>
        <aside className="lg:sticky lg:top-6">
          <Card>
            <button
              type="button"
              className="flex w-full items-center justify-between text-start lg:cursor-default"
              onClick={() => setShowSummary((value) => !value)}
              aria-expanded={showSummary}
            >
              <span className="flex items-center gap-2 font-semibold">
                <ShoppingBag size={18} /> {t('Order summary')} ({cart.totalItems})
              </span>
              <span className="text-sm font-semibold lg:hidden">
                {money(totals.total)}
              </span>
            </button>
            <div
              className={`${showSummary ? "block" : "hidden"} mt-4 space-y-4 lg:block`}
            >
              <div className="space-y-4">
                {cartGroups.map((group) => (
                  <section key={group.restaurantId} className="space-y-2">
                    <h3 className="text-sm font-bold text-text-main">
                      {t(group.restaurant?.name ?? group.items[0]?.restaurantName ?? 'Unknown restaurant')}
                    </h3>
                    {group.items.map((item) => (
                  <div
                    key={`${item.restaurantId}-${item.menuItemId}`}
                    className="rounded-xl border border-border-subtle bg-surface-white p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={t(item.name)}
                          className="size-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-brand-yellow/20 text-brand-red">
                          <ShoppingBag size={22} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-text-main">{t(item.name)}</p>
                        <p className="mt-1 text-xs text-text-slate">{money(item.price)} / {t("item")}</p>
                        <p className="mt-1 text-sm font-bold text-brand-red">{money(item.price * item.quantity)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
                      <span className="text-xs font-medium text-text-slate">{t("Quantity")}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={t("Decrease quantity of {name}", { name: t(item.name) })}
                          onClick={() => item.quantity <= 1 ? cart.removeFromCart(item.restaurantId, item.menuItemId) : cart.updateQuantity(item.restaurantId, item.menuItemId, item.quantity - 1)}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border-subtle text-text-main transition-colors hover:border-brand-red hover:text-brand-red"
                        >
                          <Minus size={15} />
                        </button>
                        <span className="min-w-5 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={t("Increase quantity of {name}", { name: t(item.name) })}
                          onClick={() => cart.updateQuantity(item.restaurantId, item.menuItemId, item.quantity + 1)}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border-subtle text-text-main transition-colors hover:border-brand-red hover:text-brand-red"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                    </div>
                    ))}
                  </section>
                ))}
              </div>
              <div className="border-t border-border-subtle pt-4">
                <div className="flex gap-2">
                  <Input
                    label={t('Promo code')}
                    value={form.promo}
                    onChange={(event) => update("promo", event.target.value)}
                    placeholder={t("WELCOME10")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6"
                    onClick={() => void applyPromo()}
                  >
                    <Tag size={15} />
                    {t('Apply')}
                  </Button>
                </div>
                {promoMessage && (
                  <p
                    role="status"
                    className={`mt-2 text-xs ${promo ? "text-green-700" : "text-danger"}`}
                  >
                    {promoMessage}
                  </p>
                )}
              </div>
              <div className="border-t border-border-subtle pt-4">
                <p className="mb-2 text-sm font-semibold">{t('Driver tip')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 5, 10, 15].map((percent) => (
                    <button
                      type="button"
                      key={percent}
                      onClick={() => {
                        update(
                          "tip",
                          Number(((cart.subtotal * percent) / 100).toFixed(2)),
                        );
                        update("customTip", "");
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs ${form.tip === Number(((cart.subtotal * percent) / 100).toFixed(2)) && !form.customTip ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-border-subtle"}`}
                    >
                      {percent === 0 ? t('No tip') : `${percent}%`}
                    </button>
                  ))}
                </div>
                <Input
                  wrapperClassName="mt-3"
                  label={t('Custom tip amount ($)')}
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.customTip}
                  onChange={(event) => update("customTip", event.target.value)}
                  placeholder={t('Optional')}
                />
              </div>
              <div className="space-y-2 border-t border-border-subtle pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-slate">{t('Subtotal')}</span>
                  <span>{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-slate">{t('Delivery fee')}</span>
                  <span>{money(totals.deliveryFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-slate">{t('Service fee')}</span>
                  <span>{money(totals.serviceFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-slate">{t('Tax')}</span>
                  <span>{money(totals.tax)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>{t("Discount")}</span>
                    <span>-{money(totals.discount)}</span>
                  </div>
                )}
                {totals.tip > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-slate">{t('Driver tip')}</span>
                    <span>{money(totals.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border-subtle pt-3 text-lg font-bold">
                  <span>{t('Total')}</span>
                  <span>{money(totals.total)}</span>
                </div>
              </div>
              {errors.cart && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {errors.cart}
                </p>
              )}
              <Button
                type="submit"
                loading={submitting}
                className="mt-5 w-full !text-white"
                disabled={cartGroups.some((group) => !group.restaurant) || submitting}
              >
                <CheckCircle2 size={17} />
                {t('Place order')} · {money(totals.total)}
              </Button>
              <p className="mt-3 text-center text-xs text-text-slate">
                {t('By placing your order, you agree to our demo checkout terms.')}
              </p>
            </div>
          </Card>
        </aside>
      </form>
    </section>
  );
}
