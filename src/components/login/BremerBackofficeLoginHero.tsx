import { Building2, ShieldCheck } from 'lucide-react'

export default function BremerBackofficeLoginHero() {
  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 z-10 hidden w-1/2 items-end p-12 lg:flex">
      <div className="max-w-md rounded-2xl border border-white/12 bg-slate-950/70 p-8 text-white shadow-2xl backdrop-blur-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/10">
            <Building2 className="size-5" aria-hidden="true" />
          </div>
          <div className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/6">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
        </div>
        <p className="text-3xl font-semibold tracking-tight">Backoffice BREMER</p>
        <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">
          Dostęp dla zespołu wewnętrznego do administracji, obsługi procesów i nadzoru operacyjnego.
        </p>
      </div>
    </div>
  )
}
