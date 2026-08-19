import { type ReactNode } from "react";

export function CheckboxGroup({
  name,
  items,
  defaultCheckedIds,
}: {
  name: string;
  items: { id: string; label: string }[];
  defaultCheckedIds: string[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Nog niets beschikbaar om toe te wijzen.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name={name}
            value={item.id}
            defaultChecked={defaultCheckedIds.includes(item.id)}
            className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-600"
          />
          {item.label}
        </label>
      ))}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error?.map((message) => (
        <p key={message} className="text-sm text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}

const inputClasses =
  "rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClasses} bg-white ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClasses} ${props.className ?? ""}`} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const variants = {
    primary: "bg-red-700 text-white hover:bg-red-800 disabled:bg-red-300",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  };
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    />
  );
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  SYNCED: "bg-emerald-100 text-emerald-800",
  ERROR: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  PENDING: "Wacht op sync",
  SYNCED: "Gesynchroniseerd",
  ERROR: "Fout",
};

export function SyncStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status] ?? "bg-slate-100 text-slate-700"}`}>
      {statusLabels[status] ?? status}
    </span>
  );
}
