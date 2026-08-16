import { CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="rw-toast">
      <CheckCircle2 size={16} />
      {toast}
    </div>
  );
}
