import { Sparkles, Warehouse } from 'lucide-react'

export default function BremerLoginHero() {
  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 z-10 hidden w-1/2 items-end p-12 lg:flex">
      <div className="max-w-md rounded-2xl border border-white/12 bg-black/22 p-8 text-white shadow-2xl backdrop-blur-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/10">
            <Warehouse className="size-5" aria-hidden="true" />
          </div>
          <div className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/6">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
        </div>
        <p className="text-3xl font-semibold tracking-tight">Innowacja &amp; Solidnosc</p>
        <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">
          Cyfrowy dostep do zgloszen gwarancyjnych BREMER z pelnym wgladem w status, historie i komunikacje projektowa.
        </p>
      </div>
    </div>
  )
}
