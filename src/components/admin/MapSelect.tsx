"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAP_OPTIONS, type MapValue } from "@/components/constants/maps";

type Props = {
  name: string;             // form-data key (gizli input için)
  defaultValue?: MapValue;  // varsayılan değer
  label?: string;           // opsiyonel başlık
  className?: string;
};

export default function MapSelect({ name, defaultValue = "RANDOM", label, className }: Props) {
  const [val, setVal] = React.useState<MapValue>(defaultValue);

  return (
    <div className={className}>
      {label && <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>}
      <Select value={val} onValueChange={(v) => setVal(v as MapValue)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Harita seçin" />
        </SelectTrigger>
        <SelectContent>
          {MAP_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Form submit için değer */}
      <input type="hidden" name={name} value={val} />
    </div>
  );
}
