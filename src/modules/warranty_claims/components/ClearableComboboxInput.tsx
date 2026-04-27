"use client"

import * as React from 'react'

export type ClearableComboboxOption = {
  value: string
  label: string
  description?: string | null
}

type Props = {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  suggestions?: Array<string | ClearableComboboxOption>
  resolveLabel?: (value: string) => string
  resolveDescription?: (value: string) => string | null | undefined
  autoFocus?: boolean
  disabled?: boolean
  allowCustomValues?: boolean
}

function normalizeOptions(input?: Array<string | ClearableComboboxOption>): ClearableComboboxOption[] {
  if (!Array.isArray(input)) return []
  return input
    .map((option) => {
      if (typeof option === 'string') {
        const trimmed = option.trim()
        if (!trimmed) return null
        return { value: trimmed, label: trimmed }
      }
      const value = typeof option.value === 'string' ? option.value.trim() : ''
      if (!value) return null
      return {
        value,
        label: option.label?.trim() || value,
        description: option.description ?? null,
      }
    })
    .filter((option): option is ClearableComboboxOption => Boolean(option))
}

export function ClearableComboboxInput({
  value,
  onChange,
  placeholder,
  suggestions,
  resolveLabel,
  resolveDescription,
  autoFocus,
  disabled = false,
  allowCustomValues = true,
}: Props) {
  const [input, setInput] = React.useState('')
  const [touched, setTouched] = React.useState(false)
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const suppressBlurCommitRef = React.useRef(false)

  const optionMap = React.useMemo(() => {
    const map = new Map<string, ClearableComboboxOption>()
    for (const option of normalizeOptions(suggestions)) {
      if (!map.has(option.value)) map.set(option.value, option)
    }
    if (value && !map.has(value)) {
      map.set(value, {
        value,
        label: resolveLabel?.(value) ?? value,
        description: resolveDescription?.(value) ?? null,
      })
    }
    return map
  }, [resolveDescription, resolveLabel, suggestions, value])

  const availableOptions = React.useMemo(() => Array.from(optionMap.values()), [optionMap])
  const filteredSuggestions = React.useMemo(() => {
    const query = input.toLowerCase().trim()
    if (!query) return availableOptions
    return availableOptions.filter((option) => {
      const labelMatch = option.label.toLowerCase().includes(query)
      const descMatch = option.description?.toLowerCase().includes(query)
      return labelMatch || Boolean(descMatch)
    })
  }, [availableOptions, input])

  const showClearButton = Boolean(value) && !disabled

  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      const option = optionMap.get(value)
      setInput(option?.label ?? value ?? '')
    }
  }, [value, optionMap])

  const selectValue = React.useCallback((nextValue: string) => {
    if (disabled) return
    const trimmed = nextValue.trim()
    onChange(trimmed)
    const option = optionMap.get(trimmed)
    setInput(option?.label ?? trimmed)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [disabled, onChange, optionMap])

  const findOptionForInput = React.useCallback((raw: string): ClearableComboboxOption | null => {
    const query = raw.trim().toLowerCase()
    if (!query) return null
    for (const option of optionMap.values()) {
      if (option.value === raw.trim()) return option
      if (option.label.toLowerCase() === query) return option
    }
    return null
  }, [optionMap])

  const clearSelection = React.useCallback(() => {
    if (disabled) return
    selectValue('')
    setInput('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [disabled, selectValue])

  const confirmSelection = React.useCallback((raw: string) => {
    if (disabled) return
    if (!raw.trim()) {
      clearSelection()
      return
    }
    const option = findOptionForInput(raw)
    if (option) {
      selectValue(option.value)
      return
    }
    if (!allowCustomValues) {
      const currentOption = optionMap.get(value)
      setInput(currentOption?.label ?? value ?? '')
      setShowSuggestions(false)
      return
    }
    selectValue(raw)
  }, [allowCustomValues, clearSelection, disabled, findOptionForInput, optionMap, selectValue, value])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!showSuggestions) {
        setShowSuggestions(true)
        setSelectedIndex(0)
      } else {
        setSelectedIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1))
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        selectValue(filteredSuggestions[selectedIndex].value)
      } else {
        confirmSelection(input)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }, [confirmSelection, disabled, filteredSuggestions, input, selectValue, selectedIndex, showSuggestions])

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        className={[
          'w-full h-9 rounded border px-2 text-sm disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
          showClearButton ? 'pr-8' : '',
        ].filter(Boolean).join(' ')}
        value={input}
        placeholder={placeholder || 'Type to search...'}
        autoFocus={autoFocus}
        data-crud-focus-target=""
        disabled={disabled}
        onFocus={() => {
          setTouched(true)
          setShowSuggestions(true)
        }}
        onChange={(event) => {
          setTouched(true)
          setInput(event.target.value)
          setShowSuggestions(true)
          setSelectedIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (suppressBlurCommitRef.current) {
            suppressBlurCommitRef.current = false
            return
          }
          setTimeout(() => {
            if (disabled) return
            confirmSelection(input)
          }, 200)
        }}
      />

      {showClearButton ? (
        <button
          type="button"
          aria-label="Wyczyść wybór"
          className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onMouseDown={(event) => {
            suppressBlurCommitRef.current = true
            event.preventDefault()
          }}
          onClick={clearSelection}
        >
          <span aria-hidden="true" className="text-base leading-none">
            x
          </span>
        </button>
      ) : null}

      {showSuggestions && !disabled && filteredSuggestions.length > 0 ? (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded border bg-popover shadow-lg">
          {filteredSuggestions.map((option, index) => (
            <button
              key={option.value}
              type="button"
              className={[
                'flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors',
                index === selectedIndex ? 'bg-accent' : 'hover:bg-muted',
              ].filter(Boolean).join(' ')}
              onMouseDown={(event) => {
                suppressBlurCommitRef.current = true
                event.preventDefault()
              }}
              onClick={() => selectValue(option.value)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="font-medium">{option.label}</span>
              {option.description ? (
                <span className="text-xs text-muted-foreground">{option.description}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
