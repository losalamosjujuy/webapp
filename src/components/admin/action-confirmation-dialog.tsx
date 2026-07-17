"use client";

interface ActionConfirmationDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  intent?: "default" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}

export function ActionConfirmationDialog({
  cancelLabel = "Cancelar",
  confirmLabel = "Confirmar",
  description,
  intent = "default",
  onCancel,
  onConfirm,
  open,
  title
}: ActionConfirmationDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#170f0b]/55 p-4">
      <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-[0_30px_100px_rgba(23,15,11,0.25)]">
        <h3 className="text-xl font-semibold text-[#241b16]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#5f4f43]">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#eadccf] px-4 text-sm font-semibold text-[#6b5a4d]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              intent === "danger"
                ? "inline-flex h-11 items-center justify-center rounded-xl bg-[#c1473d] px-4 text-sm font-semibold text-white"
                : "inline-flex h-11 items-center justify-center rounded-xl bg-[linear-gradient(90deg,#8f5625_0%,#6d3d18_100%)] px-4 text-sm font-semibold text-white"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
