"use client";

import { useActionState } from "react";
import { updateOrgSettings } from "@/lib/actions/traction";
import { traction } from "./colors";

const fieldStyle = { borderColor: traction.line, color: traction.ink, background: "#fff" };

export function OrgSettingsForm({ company, tagline }: { company: string; tagline: string }) {
  const [state, action, pending] = useActionState(updateOrgSettings, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="mb-1 block text-sm font-medium" style={{ color: traction.inkSoft }}>
            Bedrijfsnaam (koptekst)
          </label>
          <input id="company" name="company" defaultValue={company} className="w-full rounded-md border p-2 text-sm" style={fieldStyle} />
        </div>
        <div>
          <label htmlFor="tagline" className="mb-1 block text-sm font-medium" style={{ color: traction.inkSoft }}>
            Ondertitel (optioneel)
          </label>
          <input id="tagline" name="tagline" defaultValue={tagline} className="w-full rounded-md border p-2 text-sm" style={fieldStyle} />
        </div>
      </div>
      <div>
        <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: traction.navy }}>
          {pending ? "Bezig..." : "Opslaan"}
        </button>
        {state?.message && <span className="ml-3 text-sm" style={{ color: traction.ok }}>{state.message}</span>}
      </div>
    </form>
  );
}
