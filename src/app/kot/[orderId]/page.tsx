import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";

const KOT_STYLES = `
  @page {
    size: 90mm;
    margin: 0;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: 'Courier New', 'Courier', monospace;
    font-size: 12px;
    line-height: 1.2;
    color: #000;
    background: #fff;
    width: 90mm;
    padding: 0;
  }
  .kot {
    padding: 0.5mm 0;
  }
  .restaurant-name {
    font-size: 22px;
    font-weight: 900;
    text-align: center;
    letter-spacing: 1px;
    padding: 1px 0;
  }
  .divider {
    border: none;
    border-top: 1.5px dashed #000;
    margin: 1px 0;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 11px;
    font-weight: 700;
    padding: 0.5px 0;
  }
  .info {
    font-size: 11px;
    font-weight: 700;
    padding: 0.5px 0;
  }
  .items-header {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 0.5px 0;
    border-bottom: 1.5px solid #000;
  }
  .item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 15px;
    font-weight: 800;
    padding: 2px 0;
    border-bottom: 1px dotted #ccc;
  }
  .item:last-child {
    border-bottom: none;
  }
  .item-name {
    flex: 1;
    padding-right: 2px;
    line-height: 1.15;
    word-break: break-word;
  }
  .item-qty {
    text-align: right;
    min-width: 30px;
    white-space: nowrap;
    font-weight: 900;
    font-size: 15px;
  }
  .no-print {
    display: none;
  }
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
      restaurant: { select: { name: true } },
    },
  });

  if (!order) notFound();

  const createdAt = new Date(order.createdAt);
  const dateStr = createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = createdAt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const kotNum = orderId.slice(-6).toUpperCase();
  const isTakeaway = order.type === "takeaway" || !order.table;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>KOT</title>
        <style>{KOT_STYLES}</style>
      </head>
      <body>
        <div className="kot">
          <div className="restaurant-name">
            {order.restaurant?.name || "RESTAURANT"}
          </div>
          <div className="divider" />
          <div className="info-row">
            <span>
              {dateStr} {timeStr}
            </span>
            <span>KOT #{kotNum}</span>
          </div>
          <div className="info-row">
            <span>
              {isTakeaway ? "TAKEAWAY" : `Table ${order.table!.tableNumber}`}
            </span>
            {order.waiter && <span>Server: {order.waiter.name}</span>}
          </div>
          <div className="divider" />
          <div className="items-header">
            <span>ITEM</span>
            <span>QTY</span>
          </div>
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
        {print === "true" && (
          <script dangerouslySetInnerHTML={{ __html: "window.print()" }} />
        )}
      </body>
    </html>
  );
}
