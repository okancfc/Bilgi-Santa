"use client"

import { GIFT_PREFERENCES } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface GiftPreferenceSelectorProps {
  selectedPreferences: string[]
  onPreferencesChange: (preferences: string[]) => void
}

export function GiftPreferenceSelector({ selectedPreferences, onPreferencesChange }: GiftPreferenceSelectorProps) {
  const togglePreference = (preference: string) => {
    if (selectedPreferences.includes(preference)) {
      onPreferencesChange(selectedPreferences.filter((p) => p !== preference))
    } else {
      onPreferencesChange([...selectedPreferences, preference])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {GIFT_PREFERENCES.map((preference) => {
        const isSelected = selectedPreferences.includes(preference)
        return (
          <button
            key={preference}
            type="button"
            onClick={() => togglePreference(preference)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              isSelected
                ? "bg-gold-accent text-dark-bg shadow-lg shadow-gold-accent/30"
                : "bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
            )}
          >
            {preference}
          </button>
        )
      })}
    </div>
  )
}
