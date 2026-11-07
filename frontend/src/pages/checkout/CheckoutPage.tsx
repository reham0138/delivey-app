import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
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
import type { Restaurant } from "@/shared/types";
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
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
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
        const values = (await response.json()) as Restaurant[];
        setRestaurant(
          values.find((item) => item.id === cart.restaurantId) ?? null,
        );
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load restaurant details.",
        ),
      )
      .finally(() => setLoadingRestaurant(false));
  }, [cart.restaurantId]);
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const deliveryFee = promo?.deliveryFee ?? restaurant?.deliveryFee ?? 0;
  const tip = form.customTip.trim()
    ? Math.max(0, Number(form.customTip) || 0)
    : form.tip;
  const totals = useMemo(
    () =>
      calculateOrderTotals({
        subtotal: cart.subtotal,
        deliveryFee,
        discount: promo?.discount ?? 0,
        tip,
      }),
    [cart.subtotal, deliveryFee, promo, tip],
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
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!isValidPhone(form.phone)) next.phone = "Enter a valid phone number.";
    if (!isValidAddress(form.address))
      next.address = "Enter a complete delivery address.";
    if (restaurant && cart.subtotal < restaurant.minOrder)
      next.cart = `Minimum order is ${money(restaurant.minOrder)}.`;
    if (form.delivery === "scheduled" && !form.slot)
      next.slot = "Choose a delivery time.";
    if (form.payment === "card") {
      if (!isValidCardNumber(card.number))
        next.cardNumber = "Enter a valid card number.";
      if (!isValidCardExpiry(card.expiry))
        next.expiry = "Use a valid MM/YY expiry date.";
      if (!isValidCvc(card.cvc)) next.cvc = "Enter a 3 or 4 digit CVC.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const applyPromo = async () => {
    const result = await orderService.validatePromo(
      form.promo,
      cart.subtotal,
      restaurant?.deliveryFee ?? deliveryFee,
    );
    setPromo(result);
    setPromoMessage(
      result
        ? result.code === "FREESHIP"
          ? "Free delivery applied."
          : "10% discount applied."
        : "That promo code is not valid.",
    );
    if (!result) update("promo", form.promo.toUpperCase());
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !user || !cart.items.length || !restaurant) return;
    if (!validate()) {
      document
        .querySelector('[aria-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const estimated = new Date(
        Date.now() + (restaurant.deliveryTimeMinutes + 15) * 60000,
      );
      const scheduledFor = form.delivery === "scheduled" ? form.slot : null;
      const order = await orderService.createOrder({
        customerId: user.id,
        customerName: form.name.trim(),
        phone: form.phone.trim(),
        restaurantId: restaurant.id,
        items: cart.items,
        deliveryAddress: form.address.trim(),
        paymentMethod: form.payment,
        notes: form.notes.trim(),
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        serviceFee: totals.serviceFee,
        tax: totals.tax,
        discount: totals.discount,
        tip: totals.tip,
        promoCode: promo?.code ?? null,
        scheduledFor,
        estimatedDeliveryAt: new Date(
          Math.max(
            estimated.getTime(),
            scheduledFor ? new Date(scheduledFor).getTime() : 0,
          ),
        ).toISOString(),
      });
      if (saveAddress) {
        await orderService.saveAddress({
          id: selectedAddressId || crypto.randomUUID(),
          label:
            addresses.find((item) => item.id === selectedAddressId)?.label ??
            "Saved address",
          address: form.address.trim(),
          phone: form.phone.trim(),
        });
        setAddresses(orderService.getAddresses());
      }
      localStorage.removeItem(DRAFT_KEY);
      cart.clearCart();
      navigate(`/orders/${order.id}/confirmation`, { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart.items.length)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add a few meals before checking out."
          action={
            <Button onClick={() => navigate("/meals")}>Browse meals</Button>
          }
        />
      </div>
    );
  if (loadingRestaurant)
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Preparing checkout..." />
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
                  About {restaurant?.deliveryTimeMinutes ?? 30} minutes
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
                <h2 className="font-semibold">Payment method</h2>
                <p className="text-xs text-text-slate">
                  Choose how you would like to pay.
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
                  <b className="block">Cash on delivery</b>
                  <small className="text-text-slate">Pay when it arrives</small>
                </span>
              </button>
              <button
                type="button"
                onClick={() => update("payment", "card")}
                className={`flex items-center gap-3 rounded-xl border p-4 text-start ${form.payment === "card" ? "border-brand-red bg-brand-red/5" : "border-border-subtle"}`}
              >
                <CreditCard />
                <span>
                  <b className="block">Card</b>
                  <small className="text-text-slate">
                    Simulated demo payment
                  </small>
                </span>
              </button>
            </div>
            {form.payment === "card" && (
              <div className="mt-4 rounded-xl border border-brand-yellow/50 bg-brand-yellow/10 p-3 text-sm text-text-main">
                Demo only: card details are validated in your browser and are
                never sent or saved.
              </div>
            )}
            {form.payment === "card" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  wrapperClassName="sm:col-span-2"
                  label="Card number"
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
                  label="Expiry (MM/YY)"
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
                  label="CVC"
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
            <h2 className="mb-3 font-semibold">Order notes</h2>
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Allergies, gate code, delivery instructions..."
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
                <ShoppingBag size={18} /> Order summary ({cart.totalItems})
              </span>
              <span className="text-sm font-semibold lg:hidden">
                {money(totals.total)}
              </span>
            </button>
            <div
              className={`${showSummary ? "block" : "hidden"} mt-4 space-y-4 lg:block`}
            >
              <p className="text-sm font-semibold text-text-slate">
                {restaurant?.name ?? cart.restaurantName}
              </p>
              {cart.items.map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-text-slate">
                      Qty {item.quantity}
                    </p>
                  </div>
                  <span>{money(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-border-subtle pt-4">
                <div className="flex gap-2">
                  <Input
                    label="Promo code"
                    value={form.promo}
                    onChange={(event) => update("promo", event.target.value)}
                    placeholder="WELCOME10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6"
                    onClick={() => void applyPromo()}
                  >
                    <Tag size={15} />
                    Apply
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
                <p className="mb-2 text-sm font-semibold">Driver tip</p>
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
                      {percent === 0 ? "No tip" : `${percent}%`}
                    </button>
                  ))}
                </div>
                <Input
                  wrapperClassName="mt-3"
                  label="Custom tip amount ($)"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.customTip}
                  onChange={(event) => update("customTip", event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2 border-t border-border-subtle pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-slate">Subtotal</span>
                  <span>{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-slate">Delivery fee</span>
                  <span>{money(totals.deliveryFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-slate">Service fee</span>
                  <span>{money(totals.serviceFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-slate">Tax</span>
                  <span>{money(totals.tax)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span>-{money(totals.discount)}</span>
                  </div>
                )}
                {totals.tip > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-slate">Driver tip</span>
                    <span>{money(totals.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border-subtle pt-3 text-lg font-bold">
                  <span>Total</span>
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
                className="mt-5 w-full"
                disabled={!restaurant || submitting}
              >
                <CheckCircle2 size={17} />
                Place order · {money(totals.total)}
              </Button>
              <p className="mt-3 text-center text-xs text-text-slate">
                By placing your order, you agree to our demo checkout terms.
              </p>
            </div>
          </Card>
        </aside>
      </form>
    </section>
  );
}
