"use client";

import { useActionState } from "react";
import { verifyTotpLogin } from "@/lib/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export default function TotpVerifyPage() {
  const [state, action, pending] = useActionState(verifyTotpLogin, undefined);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-red-800">Vaartijd</h1>
        <p className="mb-6 text-sm text-slate-500">
          Voer de 6-cijferige code uit je authenticator-app in.
        </p>
        <form action={action} className="flex flex-col gap-4">
          <Field label="Code" htmlFor="code">
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              autoFocus
              required
            />
          </Field>
          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Bezig..." : "Bevestigen"}
          </Button>
        </form>
      </div>
    </main>
  );
}
