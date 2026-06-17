"use client";

import { useState, useEffect, useCallback } from "react";
import { getRooms, createRoom, deleteRoom, assignTableToRoom } from "@/lib/actions/pos-session";
import { getTables } from "@/lib/actions/tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Room = {
  id: string;
  name: string;
  description: string | null;
  tables: Array<{ id: string; tableNumber: number; status: string; capacity: number }>;
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allTables, setAllTables] = useState<Array<{ id: string; tableNumber: number; status: string; capacity: number; roomId: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const fetch = useCallback(async () => {
    const [r, t] = await Promise.all([getRooms(), getTables()]);
    if (r.success) setRooms(r.data as unknown as Room[]);
    setAllTables(t as unknown as typeof allTables);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const r = await createRoom(newName.trim());
    if (r.success) { toast.success("Room created"); setShowAdd(false); setNewName(""); await fetch(); }
    else toast.error(r.error || "Failed");
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete room "${name}"? Tables will be unassigned.`)) return;
    await deleteRoom(id);
    toast.success("Room deleted");
    await fetch();
  }

  async function handleAssign(tableId: string, roomId: string | null) {
    await assignTableToRoom(tableId, roomId);
    await fetch();
  }

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  const unassigned = allTables.filter((t) => !t.roomId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rooms & Zones</h1>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Cancel" : "Add Room"}</Button>
      </div>

      {showAdd && (
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Room name (e.g., Main Hall, Terrace, VIP)" className="h-8 text-sm flex-1" />
          <Button size="sm" className="text-xs h-8" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{room.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{room.tables.length} tables</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-red-600" onClick={() => handleDelete(room.id, room.name)}>Remove</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allTables
                  .filter((t) => t.roomId === room.id)
                  .sort((a, b) => a.tableNumber - b.tableNumber)
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleAssign(t.id, null)}
                      className={`text-[10px] px-2 py-1 rounded border ${
                        t.status === "occupied" ? "bg-red-50 border-red-300 text-red-700" : "bg-white"
                      }`}
                      title="Click to unassign"
                    >
                      T{t.tableNumber}
                    </button>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {unassigned.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Unassigned Tables ({unassigned.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {unassigned.map((t) => (
                <div key={t.id} className="relative group">
                  <span className="text-[10px] px-2 py-1 rounded border bg-white inline-block">
                    T{t.tableNumber}
                  </span>
                  <select
                    onChange={(e) => handleAssign(t.id, e.target.value || null)}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>Move to...</option>
                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rooms.length === 0 && (
        <p className="text-center py-10 text-muted-foreground text-sm">No rooms yet. Create your first zone (Main Hall, Terrace, VIP Room).</p>
      )}
    </div>
  );
}
