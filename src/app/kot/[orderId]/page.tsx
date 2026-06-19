import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";

const KOT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', 'Lucida Console', monospace; font-size: 14px; line-height: 1.5; color: #000; background: #fff; padding: 3mm 2mm; width: 72mm; }
  .header { text-align: center; margin-bottom: 8px; }
  .header h1 { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
  .header p { font-size: 11px; }
  .divider { border-top: 2px dashed #000; margin: 8px 0; }
  .meta { font-size: 13px; font-weight: 600; padding: 2px 0; }
  .meta .lbl { color: #555; }
  .items { margin: 8px 0; }
  .item { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; padding: 2px 0; }
  .item-name { flex: 1; }
  .item-qty { text-align: right; min-width: 40px; }
  .notes { margin: 8px 0; padding: 6px; border: 1px dashed #000; font-size: 12px; font-style: italic; font-weight: 600; }
  .footer { text-align: center; font-size: 11px; font-weight: 600; margin-top: 12px; border-top: 1px dashed #000; padding-top: 8px; }
  @media print { .no-print { display: none !important; } }
`;

export default async function KotPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { orderId } = await params;
  const { print } = await searchParams;
  const session = await requireAuth();

  const order = await prisma.order.findUnique({
    where: { id: orderId, restaurantId: session.user.restaurantId },
    include: {
      items: { include: { item: true, variant: true } },
      table: true,
      waiter: { select: { name: true } },
      customer: { select: { name: true, phone: true } },
      restaurant: { select: { name: true, address: true, phone: true } },
    },
  });

  if (!order) notFound();

  const kotId = order.id.slice(-6).toUpperCase();
  const createdAt = new Date(order.createdAt);

  return (
    <html>
      <head>
        <title>KOT #{kotId}</title>
        <style>{KOT_STYLES}</style>
      </head>
      <body>
        <div className="header">
          <h1>{order.restaurant?.name || "RITAM BHARAT"}</h1>
          <p>KITCHEN ORDER TICKET</p>
        </div>

        <div className="divider" />

        <div className="meta">
          <span className="lbl">KOT:</span> #{kotId}
        </div>
        {order.table && (
          <div className="meta">
            <span className="lbl">Table:</span> {order.table.tableNumber}
          </div>
        )}
        {order.waiter && (
          <div className="meta">
            <span className="lbl">Server:</span> {order.waiter.name}
          </div>
        )}
        <div className="meta">
          <span className="lbl">Time:</span> {createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} {createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </div>

        <div className="divider" />

        <div className="items">
          {order.items.map((item) => (
            <div key={item.id} className="item">
              <span className="item-name">
                {item.item.name}
                {item.variant ? ` (${item.variant.name})` : ""}
              </span>
              <span className="item-qty">x{item.quantity}</span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="notes">📝 {order.notes}</div>
        )}

        <div className="footer">
          {order.restaurant?.address && <p>{order.restaurant.address}</p>}
          <p>Thank you!</p>
        </div>

        {print === "true" && (
          <script dangerouslySetInnerHTML={{ __html: "window.print()" }} />
        )}
      </body>
    </html>
  );
}
