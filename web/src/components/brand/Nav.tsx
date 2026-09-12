'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'campaigns' },
  { href: '/dashboard', label: 'organise' },
  { href: '/positions', label: 'invest' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-display font-bold text-lg lowercase">
          bangerz
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-[15px] transition-colors ${
                pathname === l.href ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="chip-text px-3 py-1.5 rounded-full bg-white/10 text-white/70">XRP Devnet</span>
        <Link
          href="/campaign/new"
          className="hidden sm:inline-block border border-white/25 text-white text-[14px] px-5 py-2.5 rounded-full hover:border-white/40 transition-colors"
        >
          Create a new party
        </Link>
      </div>
    </nav>
  )
}
