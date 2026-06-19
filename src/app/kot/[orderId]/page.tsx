import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";

const KOT_STYLES = `
  @page { size: 80mm 120mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', 'Lucida Console', monospace; font-size: 14px; line-height: 1.5; color: #000; background: #fff; padding: 3mm 2mm; width: 72mm; }
  .item { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; padding: 3px 0; border-bottom: 1px dashed #ccc; }
  .item-name { flex: 1; }
  .item-qty { text-align: right; min-width: 36px; }
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
    },
  });

  if (!order) notFound();

  return (
    <html>
      <head>
        <title>KOT</title>
        <style>{KOT_STYLES}</style>
      </head>
      <body>
        {order.items.map((item) => (
          <div key={item.id} className="item">
            <span className="item-name">
              {item.item.name}
              {item.variant ? ` (${item.variant.name})` : ""}
            </span>
            <span className="item-qty">x{item.quantity}</span>
          </div>
        ))}

        {print === "true" && (
          <script dangerouslySetInnerHTML={{ __html: "window.print()" }} />
        )}
      </body>
    </html>
  );
}
