"use client";

import { useState, useEffect, useCallback } from "react";
import { getAnalytics } from "@/lib/actions/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Kpi = { revenue: number; orders: number; cancelled: number; active: number; items: number; avgOrder: number; avgTurnTime: number };
type ChartItem = { hour: string; count: number };
type DayItem = { day: string; revenue: number; orders: number };
type PaymentItem = { method: string; amount: number };
type TypeItem = { type: string; count: number };
type DailyRevenue = { date: string; revenue: number; orders: number };
type ItemSales = { name: string; qty: number; revenue: number };
type WaiterData = { name: string; orders: number; revenue: number };
type Analytics = {
  range: { label: string; start: string };
  kpi: Kpi;
  charts: { byHour: ChartItem[]; byDay: DayItem[]; byPayment: PaymentItem[]; byType: TypeItem[]; dailyRevenue: DailyRevenue[] };
  items: { top: ItemSales[]; bottom: ItemSales[] };
  waiters: WaiterData[];
};

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-8 text-right text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right font-medium tabular-nums shrink-0">{typeof value === 'number' ? value.toFixed(1) : value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("today");

  const fetch = useCallback(async () => {
    const r = await getAnalytics(range);
    setData(r as unknown as Analytics);
    setLoading(false);
  }, [range]);

  useEffect(() => { fetch(); }, [fetch]);

  const maxHour = Math.max(...(data?.charts.byHour.map((h) => h.count) || [1]));
  const maxDay = Math.max(...(data?.charts.byDay.map((d) => d.revenue) || [1]));
  const maxPayment = Math.max(...(data?.charts.byPayment.map((p) => p.amount) || [1]));
  const maxTop = Math.max(...(data?.items.top.map((i) => i.qty) || [1]));

  if (loading) return <div className="text-center py-20 text-muted-foreground animate-pulse">Loading analytics...</div>;
  if (!data) return <div className="text-center py-20 text-muted-foreground">No data</div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {["today", "week", "month"].map((r) => (
            <button key={r} onClick={() => { setRange(r); setLoading(true); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${range === r ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <KpiCard title="Revenue" value={`₹${data.kpi.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
        <KpiCard title="Orders" value={data.kpi.orders.toString()} sub={`+${data.kpi.active} active`} />
        <KpiCard title="Avg Order" value={`₹${data.kpi.avgOrder.toFixed(2)}`} />
        <KpiCard title="Items Sold" value={data.kpi.items.toString()} />
        <KpiCard title="Cancelled" value={data.kpi.cancelled.toString()} color="text-red-600" />
        <KpiCard title="Active Tables" value={data.kpi.active.toString()} color="text-amber-600" />
        <KpiCard title="Turn Time" value={`${data.kpi.avgTurnTime}m`} sub="avg per table" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Sales by Hour</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {data.charts.byHour.map((h) => (
              <Bar key={h.hour} value={h.count} max={maxHour} color="bg-blue-500" label={`${h.hour}:00`} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Revenue by Day</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {data.charts.byDay.map((d) => (
              <Bar key={d.day} value={d.revenue} max={maxDay} color="bg-green-500" label={d.day} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Payment Methods</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {data.charts.byPayment.map((p) => (
              <Bar key={p.method} value={p.amount} max={maxPayment} color="bg-purple-500" label={p.method.toUpperCase()} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Order Types</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {data.charts.byType.map((t) => (
              <div key={t.type} className="flex items-center justify-between text-xs py-1">
                <span className="capitalize">{t.type}</span>
                <span className="font-bold">{t.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">🏆 Top Selling Items</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {data.items.top.map((i) => (
              <Bar key={i.name} value={i.qty} max={maxTop} color="bg-emerald-500" label={i.name.length > 15 ? i.name.slice(0, 15) + "…" : i.name} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">📉 Slow Movers</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {data.items.bottom.filter((i) => i.qty > 0).map((i) => (
              <div key={i.name} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-muted-foreground">{i.name}</span>
                <span>{i.qty} sold</span>
              </div>
            ))}
            {data.items.bottom.filter((i) => i.qty > 0).length === 0 && (
              <p className="text-xs text-muted-foreground">No slow moving items</p>
            )}
          </CardContent>
        </Card>
      </div>

      {data.waiters.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Waiter Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.waiters.map((w) => (
                <div key={w.name} className="flex items-center justify-between text-xs py-1 border-b border-dashed last:border-0">
                  <span className="font-medium">{w.name}</span>
                  <div className="flex gap-4">
                    <span>{w.orders} orders</span>
                    <span className="font-bold tabular-nums">₹{w.revenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Daily Revenue Trend</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {data.charts.dailyRevenue.map((d) => (
            <div key={d.date} className="flex items-center justify-between text-xs py-1 border-b border-dashed last:border-0">
              <span className="text-muted-foreground">{d.date}</span>
              <div className="flex gap-4">
                <span>{d.orders} orders</span>
                <span className="font-bold tabular-nums">₹{d.revenue.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value, sub, color }: { title: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground">{title}</p>
        <p className={`text-lg font-bold ${color || ""}`}>{value}</p>
        {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
