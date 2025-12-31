import { useState } from "react";
import { useGlenairStore } from "@/stores/glenair-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShellStyleSelector } from "./shell-style-selector";
import { STANDARD_WIRE_SIZES } from "@/lib/glenair/utils";
import type { WireSystem } from "@/types/glenair";

export function PartNumberBuilder() {
  const store = useGlenairStore();
  const [wireValue, setWireValue] = useState("");
  const [conductors, setConductors] = useState(1);

  const handleWireSubmit = () => {
    store.setWireSelection(store.wireSystem, wireValue, conductors);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Glenair Series 80 PN Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Wire Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>System</Label>
              <Select value={store.wireSystem} onValueChange={(v: WireSystem) => store.setWireSelection(v, wireValue, conductors)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AWG">AWG</SelectItem>
                  <SelectItem value="MM2">MM²</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Wire Size</Label>
              <Select value={wireValue} onValueChange={setWireValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {(store.wireSystem === 'AWG' ? STANDARD_WIRE_SIZES.awg : STANDARD_WIRE_SIZES.mm2).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conductors</Label>
              <Input type="number" value={conductors} onChange={(e) => setConductors(parseInt(e.target.value))} />
            </div>
          </div>
          <Button className="w-full" onClick={handleWireSubmit}>Find Compatible Connectors</Button>

          {/* Step 2: Contact Size */}
          {store.availableContactSizes.length > 0 && (
            <div className="space-y-2">
              <Label>Compatible Contact Sizes</Label>
              <div className="flex gap-2">
                {store.availableContactSizes.map(size => (
                  <Button 
                    key={size} 
                    variant={store.contactSize === size ? "default" : "outline"}
                    onClick={() => store.setContactSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Arrangements */}
          {store.availableArrangements.length > 0 && (
            <div className="space-y-2">
              <Label>Arrangements</Label>
              <Select value={store.arrangement || ""} onValueChange={store.setArrangement}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Arrangement" />
                </SelectTrigger>
                <SelectContent>
                  {store.availableArrangements.map(arr => (
                    <SelectItem key={arr.arrangement} value={arr.arrangement}>
                      {arr.arrangement} ({arr.total_contacts} contacts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 4: Shell Style */}
          {store.arrangement && <ShellStyleSelector />}

          {/* Result */}
          {store.shellStyle && (
            <Button className="w-full" size="lg" onClick={store.buildPart}>Generate Part Number</Button>
          )}

          {store.result && (
            <div className="p-4 bg-muted rounded-lg border text-center">
              <p className="text-sm text-muted-foreground">Generated Part Number</p>
              <p className="text-2xl font-mono font-bold text-primary">{store.result.partNumber}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
