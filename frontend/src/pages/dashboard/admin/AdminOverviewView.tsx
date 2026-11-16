import { useState } from "react";
import { Flag, ShoppingBag, Store, Timer, Users, Wallet } from "lucide-react";
import { BarChart } from "@/shared/components/BarChart";
import { StatCard } from "@/shared/components/StatCard";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { useLanguage } from "@/shared/hooks/useLanguage";
import type { AdminOverview } from "@/shared/services/dashboard.service";
import type { OrderStatus } from "@/shared/types";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
  "on_the_way",
  "delivered",
  "cancelled",
];
const RECENT_ORDERS_LIMIT = 8;

type Metric = "orders" | "revenue";
const METRICS: { id: Metric; label: string }[] = [
  { id: "orders", label: "Orders" },
  { id: "revenue", label: "Revenue" },
];

function shortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function AdminOverviewView({ overview }: { overview: AdminOverview }) {
  const { t } = useLanguage();
  const [metric, setMetric] = useState<Metric>("orders");
  const { stats, orders, restaurants } = overview;

  const restaurantNames = new Map<number, string>(
    restaurants.map((restaurant) => [restaurant.id, restaurant.name] as const),
  );
  const totalUsers =
    stats.usersByRole.admin +
    stats.usersByRole.restaurant +
    stats.usersByRole.customer;
  const delivered = stats.ordersByStatus.delivered ?? 0;
  const pending = stats.ordersByStatus.pending ?? 0;

  const formatMetric = (value: number) =>
    metric === "orders" ? String(value) : formatCurrency(value);
  const chartData = stats.last14Days.map((day) => ({
    key: day.date,
    label: day.date.slice(8),
    description: shortDate(day.date),
    value: metric === "orders" ? day.orders : day.revenue,
  }));
  const chartTotal = chartData.reduce((total, day) => total + day.value, 0);
  const recentOrders = orders.slice(0, RECENT_ORDERS_LIMIT);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={t("Total orders")}
          value={String(stats.totalOrders)}
          icon={ShoppingBag}
          hint={t("{count} delivered", { count: delivered })}
        />
        <StatCard
          label={t("Platform revenue")}
          value={formatCurrency(stats.totalRevenue)}
          icon={Wallet}
          hint={t("Delivered orders only")}
        />
        <StatCard
          label={t("Pending orders")}
          value={String(pending)}
          icon={Timer}
          hint={t("Waiting for a restaurant to accept")}
          attention={pending > 0}
        />
        <StatCard
          label={t("Active restaurants")}
          value={String(stats.activeRestaurants)}
          icon={Store}
          hint={t("of {total} registered", { total: restaurants.length })}
        />
        <StatCard
          label={t("Users")}
          value={String(totalUsers)}
          icon={Users}
          hint={t("{count} suspended", { count: stats.suspendedUsers })}
        />
        <StatCard
          label={t("Reported reviews")}
          value={String(stats.reportedReviews)}
          icon={Flag}
          hint={t("Waiting for moderation")}
          attention={stats.reportedReviews > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-main">
                {t("Last 14 days")}
              </h2>
              <p className="mt-1 text-sm text-text-slate">
                {t("Total")}: {formatMetric(chartTotal)}
              </p>
            </div>
            <div
              role="group"
              aria-label={t("Chart metric")}
              className="flex gap-1"
            >
              {METRICS.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant={metric === option.id ? "primary" : "secondary"}
                  aria-pressed={metric === option.id}
                  onClick={() => setMetric(option.id)}
                >
                  {t(option.label)}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <BarChart
              data={chartData}
              formatValue={formatMetric}
              caption={t("Last 14 days")}
              labelHeader={t("Date")}
              valueHeader={t(metric === "orders" ? "Orders" : "Revenue")}
            />
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-text-main">
            {t("Orders by status")}
          </h2>
          <ul className="mt-4 space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = stats.ordersByStatus[status] ?? 0;
              const share =
                stats.totalOrders > 0 ? (count / stats.totalOrders) * 100 : 0;
              return (
                <li key={status}>
                  <div className="flex items-center justify-between gap-3">
                    <Badge status={status} />
                    <span className="text-sm font-semibold text-text-main">
                      {count}
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-2 h-2 overflow-hidden rounded-full bg-surface-cream"
                  >
                    <div
                      className="h-full rounded-full bg-brand-red"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-text-main">
            {t("Top restaurants")}
          </h2>
          <p className="mt-1 text-sm text-text-slate">
            {t("Ranked by revenue")}
          </p>
          {stats.topRestaurants.length === 0 ? (
            <EmptyState
              title={t("No orders yet")}
              description={t(
                "Orders will appear here as soon as customers place them.",
              )}
            />
          ) : (
            <ol className="mt-2 divide-y divide-border-subtle">
              {stats.topRestaurants.map((restaurant, index) => (
                <li
                  key={restaurant.restaurantId}
                  className="flex items-center gap-3 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-yellow/20 text-xs font-bold text-text-main"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-main">
                      {restaurant.name}
                    </p>
                    <p className="text-xs text-text-slate">
                      {t("Orders")}: {restaurant.orders}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-text-main">
                    {formatCurrency(restaurant.revenue)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card padding="lg" className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-main">
            {t("Recent orders")}
          </h2>
          {recentOrders.length === 0 ? (
            <EmptyState
              title={t("No orders yet")}
              description={t(
                "Orders will appear here as soon as customers place them.",
              )}
            />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">{t("Recent orders")}</caption>
                <thead>
                  <tr className="border-b border-border-subtle text-xs text-text-slate">
                    <th
                      scope="col"
                      className="py-2 pe-3 text-start font-medium"
                    >
                      {t("Order no.")}
                    </th>
                    <th
                      scope="col"
                      className="py-2 pe-3 text-start font-medium"
                    >
                      {t("Customer")}
                    </th>
                    <th
                      scope="col"
                      className="py-2 pe-3 text-start font-medium"
                    >
                      {t("Restaurant")}
                    </th>
                    <th
                      scope="col"
                      className="py-2 pe-3 text-start font-medium"
                    >
                      {t("Status")}
                    </th>
                    <th
                      scope="col"
                      className="py-2 pe-3 text-start font-medium"
                    >
                      {t("Total")}
                    </th>
                    <th scope="col" className="py-2 text-start font-medium">
                      {t("Placed")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <th
                        scope="row"
                        className="py-3 pe-3 text-start font-medium text-text-main"
                      >
                        #{order.id}
                      </th>
                      <td className="py-3 pe-3 text-text-main">
                        {order.customerName}
                      </td>
                      <td className="py-3 pe-3 text-text-main">
                        {restaurantNames.get(order.restaurantId) ??
                          `#${order.restaurantId}`}
                      </td>
                      <td className="py-3 pe-3">
                        <Badge status={order.status} />
                      </td>
                      <td className="py-3 pe-3 font-semibold text-text-main">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 text-text-slate">
                        {formatDateTime(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
