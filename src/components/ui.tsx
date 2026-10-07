import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" };
export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "gray" | "violet" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className || ""}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className || ""}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field textarea ${props.className || ""}`} />;
}
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-backdrop" />
        <DialogPrimitive.Content className={`modal ${wide ? "modal-wide" : ""}`}>
          <div className="modal-heading"><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Close className="icon-button" aria-label="Close"><X size={19} /></DialogPrimitive.Close></div>
          <DialogPrimitive.Description className="sr-only">{title} form</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="form-field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}
