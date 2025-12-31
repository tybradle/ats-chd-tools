import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useGlenairStore } from "@/stores/glenair-store";

const SHELL_STYLES = [
  { value: "0", label: "Square Flange Receptacle" },
  { value: "1", label: "In-Line Receptacle" },
  { value: "2", label: "Front Mount Jam Nut" },
  { value: "5", label: "Plug with Ratchet Mechanism" },
  { value: "7", label: "Rear Mount Jam Nut" },
];

export function ShellStyleSelector() {
  const { shellStyle, setShellStyle } = useGlenairStore();

  return (
    <div className="space-y-4">
      <Label>Shell Style</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SHELL_STYLES.map((style) => (
          <Button
            key={style.value}
            variant={shellStyle === style.value ? "default" : "outline"}
            className="justify-start text-left h-auto py-2 px-3"
            onClick={() => setShellStyle(style.value)}
          >
            <div className="flex flex-col">
              <span className="font-mono text-xs opacity-70">Style {style.value}</span>
              <span className="text-sm">{style.label}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
