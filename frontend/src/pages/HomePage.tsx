import { useEffect, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, Clock3, MapPin, Utensils } from 'lucide-react'
import { Button } from '../shared/components/Button'

const slides = [
  {
    eyebrow: 'MADE FOR YOUR CRAVINGS',
    title: 'Good food.\nGood mood.',
    description: 'From the first bite to the last, let your next favourite meal find its way to you.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1800&q=85',
    imageAlt: 'Juicy burger with fresh lettuce and tomato',
    accent: 'A little happiness, delivered.',
  },
  {
    eyebrow: 'GATHER AROUND THE TABLE',
    title: 'Something\nfor everyone.',
    description: 'A comforting classic, a new discovery, or a treat worth sharing — it starts here.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1800&q=85',
    imageAlt: 'Freshly baked pizza topped with herbs',
    accent: 'Make every meal a moment.',
  },
  {
    eyebrow: 'FRESH, BRIGHT & DELICIOUS',
    title: 'Fresh choices.\nHappy days.',
    description: 'Keep it light, colourful, and full of flavour with something fresh on the menu.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1800&q=85',
    imageAlt: 'Colourful fresh salad bowl',
    accent: 'A fresh take on your favourites.',
  },
]

const categories = ['Burgers', 'Pizza', 'Shawarma', 'Sushi', 'Grill', 'Desserts', 'Coffee', 'Healthy']

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const currentSlide = slides[activeSlide]

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, 5500)

    return () => window.clearInterval(intervalId)
  }, [])

  const showPrevious = () => setActiveSlide((current) => (current - 1 + slides.length) % slides.length)
  const showNext = () => setActiveSlide((current) => (current + 1) % slides.length)

  return (
    <div className="bg-surface-cream text-text-main">
      <section aria-label="Featured food" className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-10">
        <div className="relative isolate h-[min(620px,calc(100svh-7rem))] min-h-[440px] overflow-hidden rounded-2xl bg-text-main">
          {slides.map((slide, index) => (
            <img
              key={slide.image}
              src={slide.image}
              alt={index === activeSlide ? slide.imageAlt : ''}
              aria-hidden={index !== activeSlide}
              className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out motion-reduce:transition-none ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/10" />

          <div className="flex h-full flex-col justify-between p-5 text-white sm:p-8 lg:p-10 xl:p-12">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/35 bg-black/20 px-4 py-2 text-[11px] font-semibold tracking-[0.2em] text-white backdrop-blur-sm">
                <span className="size-2 rounded-full bg-brand-yellow" />
                {currentSlide.eyebrow}
              </span>
              <span className="text-sm font-medium tabular-nums text-white/80">
                0{activeSlide + 1} <span className="mx-1 text-white/50">/</span> 0{slides.length}
              </span>
            </div>

            <div className="max-w-2xl py-5 sm:py-7">
              <p className="mb-3 text-sm font-medium tracking-wide text-brand-yellow sm:mb-4 sm:text-base">
                {currentSlide.accent}
              </p>
              <h1 className="whitespace-pre-line text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {currentSlide.title}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/85 sm:mt-5 sm:text-base sm:leading-7">
                {currentSlide.description}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
                <Button
                  size="lg"
                  onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}
                  className="!bg-brand-red !text-white hover:!bg-brand-red-hover"
                >
                  Explore food <ArrowRight aria-hidden="true" size={18} />
                </Button>
                <button
                  type="button"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/45 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  How it works
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2" aria-label="Choose featured slide">
                {slides.map((slide, index) => (
                  <button
                    key={slide.eyebrow}
                    type="button"
                    aria-label={`Show slide ${index + 1}`}
                    aria-current={activeSlide === index ? 'true' : undefined}
                    onClick={() => setActiveSlide(index)}
                    className={`h-1.5 rounded-full transition-all ${activeSlide === index ? 'w-10 bg-brand-yellow' : 'w-5 bg-white/55 hover:bg-white'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={showPrevious} aria-label="Previous slide" className="inline-flex size-10 items-center justify-center rounded-full border border-white/45 text-white transition-colors hover:bg-white/15">
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
                <button type="button" onClick={showNext} aria-label="Next slide" className="inline-flex size-10 items-center justify-center rounded-full border border-white/45 text-white transition-colors hover:bg-white/15">
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="scroll-mt-8 border-y border-border-subtle bg-surface-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-12">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-brand-red">WHAT ARE YOU CRAVING?</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">A world of flavour awaits.</h2>
          </div>
          <div className="flex max-w-3xl flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category} className="rounded-full border border-border-subtle bg-surface-cream px-4 py-2 text-sm font-medium text-text-main">
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-brand-red">GOOD FOOD, MADE SIMPLE</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Your next meal is just a few steps away.</h2>
          <p className="mt-4 leading-7 text-text-slate">A smoother way to find what you love and enjoy it wherever you are.</p>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
          <div className="border-t-2 border-brand-red pt-5">
            <span className="text-sm font-bold tracking-widest text-brand-red">01</span>
            <div className="mt-4 flex size-11 items-center justify-center rounded-full bg-brand-red/10 text-brand-red"><MapPin size={21} /></div>
            <h3 className="mt-4 text-lg font-semibold">Find your flavour</h3>
            <p className="mt-2 text-sm leading-6 text-text-slate">Explore food and discover something that sounds just right.</p>
          </div>
          <div className="border-t-2 border-brand-red pt-5">
            <span className="text-sm font-bold tracking-widest text-brand-red">02</span>
            <div className="mt-4 flex size-11 items-center justify-center rounded-full bg-brand-red/10 text-brand-red"><Utensils size={21} /></div>
            <h3 className="mt-4 text-lg font-semibold">Choose your favourites</h3>
            <p className="mt-2 text-sm leading-6 text-text-slate">Take your time, explore the menu, and pick what you love.</p>
          </div>
          <div className="border-t-2 border-brand-red pt-5">
            <span className="text-sm font-bold tracking-widest text-brand-red">03</span>
            <div className="mt-4 flex size-11 items-center justify-center rounded-full bg-brand-red/10 text-brand-red"><Clock3 size={21} /></div>
            <h3 className="mt-4 text-lg font-semibold">Enjoy the moment</h3>
            <p className="mt-2 text-sm leading-6 text-text-slate">Sit back and look forward to a delicious moment.</p>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-red px-6 py-7 text-white sm:px-8">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Ready for something delicious?</h2>
            <p className="mt-1 text-sm text-white/85">Your next favourite meal is waiting to be discovered.</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-surface-white px-5 py-2.5 text-sm font-semibold text-brand-red transition-colors hover:bg-surface-cream"
          >
            Explore categories <ArrowDown size={17} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  )
}
