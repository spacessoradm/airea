import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, MapPin, Star, Shield, MessageCircle } from "lucide-react"
import { useCallback, useEffect, useState } from 'react'

const marketInsights = [
  {
    icon: TrendingUp,
    iconColor: "text-green-600",
    bgColor: "bg-green-100",
    title: "Strong Market Growth",
    description: "Malaysia's property market delivered robust performance in 2024 with 6.2% increase in transaction volume to 311,211 transactions.",
    detail: "Total transaction value rising 14.4% to RM162.96 billion",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23065f46;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2310b981;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23bg)'/%3E%3Ctext x='200' y='100' text-anchor='middle' fill='white' font-size='24' font-weight='bold'%3EMarket Growth%3C/text%3E%3Ctext x='200' y='130' text-anchor='middle' fill='white' font-size='16'%3E+6.2% Volume%3C/text%3E%3C/svg%3E"
  },
  {
    icon: MapPin,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-100",
    title: "Johor Leading Growth",
    description: "Johor registered 48,885 transactions worth RM28.76 billion in H1 2024, up 44.4% driven by proximity to Singapore.",
    detail: "RTS Link and Special Economic Zone driving demand",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23075985;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%233b82f6;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23bg)'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='white' font-size='20' font-weight='bold'%3EJohor Growth%3C/text%3E%3Ctext x='200' y='120' text-anchor='middle' fill='white' font-size='16'%3E+44.4% Increase%3C/text%3E%3Ctext x='200' y='140' text-anchor='middle' fill='white' font-size='14'%3ERM28.76B Value%3C/text%3E%3C/svg%3E"
  },
  {
    icon: Star,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-100",
    title: "Strong Rental Yields",
    description: "Rental yields across major cities: Johor Bahru (5.47%), Petaling Jaya (5.28%), with 12.4% rise from Q1 2023.",
    detail: "Asking rents increased 2.2% quarter-over-quarter",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%235b21b6;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%238b5cf6;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23bg)'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='white' font-size='20' font-weight='bold'%3ERental Yields%3C/text%3E%3Ctext x='200' y='120' text-anchor='middle' fill='white' font-size='16'%3EUp to 5.47%25%3C/text%3E%3Ctext x='200' y='140' text-anchor='middle' fill='white' font-size='14'%3E+12.4%25 Growth%3C/text%3E%3C/svg%3E"
  },
  {
    icon: TrendingUp,
    iconColor: "text-orange-600",
    bgColor: "bg-orange-100",
    title: "2025 Growth Outlook",
    description: "Stable GDP growth projected at 4.5%-5.5% with low inflation at 1.9%, among the lowest in the region.",
    detail: "Infrastructure projects to drive significant growth",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23c2410c;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23f97316;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23bg)'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='white' font-size='20' font-weight='bold'%3E2025 Outlook%3C/text%3E%3Ctext x='200' y='120' text-anchor='middle' fill='white' font-size='16'%3E4.5-5.5%25 GDP%3C/text%3E%3Ctext x='200' y='140' text-anchor='middle' fill='white' font-size='14'%3E1.9%25 Inflation%3C/text%3E%3C/svg%3E"
  },
  {
    icon: Shield,
    iconColor: "text-red-600",
    bgColor: "bg-red-100",
    title: "Changing Buyer Preferences",
    description: "More Malaysians looking beyond city centres for affordability, space, and wellness-oriented developments.",
    detail: "Focus on suburban townships and nature-integrated properties",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23991b1b;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23ef4444;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23bg)'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='white' font-size='18' font-weight='bold'%3EBuyer Trends%3C/text%3E%3Ctext x='200' y='120' text-anchor='middle' fill='white' font-size='14'%3ESuburban Focus%3C/text%3E%3Ctext x='200' y='140' text-anchor='middle' fill='white' font-size='14'%3EWellness Living%3C/text%3E%3C/svg%3E"
  },
  {
    icon: MessageCircle,
    iconColor: "text-teal-600",
    bgColor: "bg-teal-100",
    title: "Technology Hub Growth",
    description: "Penang's tech hub status and Klang Valley's green-certified logistics facilities driving commercial demand.",
    detail: "RM10.8 billion industrial property transactions in 2024",
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23115e59;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2314b8a6;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23bg)'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='white' font-size='18' font-weight='bold'%3ETech Hubs%3C/text%3E%3Ctext x='200' y='120' text-anchor='middle' fill='white' font-size='14'%3EPenang %26 KL%3C/text%3E%3Ctext x='200' y='140' text-anchor='middle' fill='white' font-size='14'%3ERM10.8B Industrial%3C/text%3E%3C/svg%3E"
  }
]

export function MarketInsightsCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      align: 'start',
      skipSnaps: false,
      dragFree: true
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  )

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    setScrollSnaps(emblaApi.scrollSnapList())
    emblaApi.on('select', onSelect)
  }, [emblaApi, onSelect])

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Malaysia Property Market Insights 2025
          </h2>
          <p className="text-lg text-gray-600">
            Stay informed with the latest trends and opportunities in Malaysia's property market
          </p>
        </div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {marketInsights.map((insight, index) => {
                const IconComponent = insight.icon
                return (
                  <div key={index} className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] pl-4">
                    <Card className="hover:shadow-lg transition-shadow h-full">
                      <div className="relative overflow-hidden rounded-t-lg">
                        <img 
                          src={insight.image} 
                          alt={insight.title}
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute top-4 left-4">
                          <div className={`${insight.bgColor} rounded-full w-10 h-10 flex items-center justify-center`}>
                            <IconComponent className={`h-5 w-5 ${insight.iconColor}`} />
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-3">{insight.title}</h3>
                        <p className="text-gray-600 text-sm mb-4">
                          {insight.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {insight.detail}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === selectedIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() => scrollTo(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}