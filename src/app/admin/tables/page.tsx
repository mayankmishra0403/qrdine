import { getTables } from "@/lib/actions/tables";
import { AddTableForm } from "./add-table-form";
import { TableCard } from "./table-card";
import { PrintAllQR } from "./print-all-qr";

export default async function TablesPage() {
  const tables = await getTables();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tables</h1>
        <div className="flex items-center gap-2">
          <PrintAllQR tables={tables} />
          <AddTableForm />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <TableCard key={table.id} table={table} />
        ))}
      </div>

      {tables.length === 0 && (
        <p className="text-muted-foreground">
          No tables yet. Add your first table to get started.
        </p>
      )}
    </div>
  );
}
