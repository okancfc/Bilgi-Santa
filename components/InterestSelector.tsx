"use client"

import { INTEREST_CATEGORIES } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface InterestSelectorProps {
  selectedInterests: string[]
  onInterestsChange: (interests: string[]) => void
}

export function InterestSelector({ selectedInterests, onInterestsChange }: InterestSelectorProps) {
  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      onInterestsChange(selectedInterests.filter((i) => i !== interest))
    } else {
      onInterestsChange([...selectedInterests, interest])
    }
  }

  return (
    <div className="space-y-6">
      {Object.entries(INTEREST_CATEGORIES).map(([key, category]) => (
        <div key={key}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">{category.label}</h4>
          <div className="flex flex-wrap gap-2">
            {category.items.map((interest) => {
              const isSelected = selectedInterests.includes(interest)
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isSelected
                      ? "bg-bilgi-red text-white shadow-lg shadow-bilgi-red/30"
                      : "bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                  )}
                >
                  {interest}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
