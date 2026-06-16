"use client";

import { updateRestaurant } from "@/lib/actions/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  currency: string;
};

export function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    toast.promise(
      updateRestaurant({
        name: (form.get("name") as string).trim(),
        address: (form.get("address") as string).trim() || undefined,
        phone: (form.get("phone") as string).trim() || undefined,
        currency: (form.get("currency") as string).trim(),
      }),
      {
        loading: "Saving...",
        success: "Settings saved",
        error: (err) => err.error || "Failed to save",
      }
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={restaurant.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={restaurant.slug}
              disabled
              className="text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Used for subdomain URL. Cannot be changed.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={restaurant.address || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={restaurant.phone || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" name="currency" defaultValue={restaurant.currency} />
          </div>
          <Button type="submit">Save Changes</Button>
        </CardContent>
      </Card>
    </form>
  );
}
