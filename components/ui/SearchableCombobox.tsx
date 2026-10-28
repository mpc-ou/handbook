"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Lock, Search, X } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  depth?: number;
  badge?: string;
  /** When true the option is shown but cannot be selected */
  disabled?: boolean;
  /** Reason shown (in red) when hovering a disabled option */
  disabledReason?: string;
}

interface SearchableComboboxProps {
  value?: string;
  onValueChange: (val: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  defaultLimit?: number;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export function SearchableCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  emptyText = "No matching results found",
  defaultLimit = 5,
  className,
  triggerClassName,
  disabled = false,
  allowClear = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) {
      // Default: show up to defaultLimit items.
      // If currently selected item is not in top items, include it so user can see it!
      const topItems = options.slice(0, defaultLimit);
      if (
        selectedOption &&
        !topItems.some((item) => item.value === selectedOption.value)
      ) {
        return [...topItems, selectedOption];
      }
      return topItems;
    }

    // Filter by label or description
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(trimmed) ||
        (opt.description && opt.description.toLowerCase().includes(trimmed)) ||
        opt.value.toLowerCase().includes(trimmed)
    );
  }, [options, search, defaultLimit, selectedOption]);

  const SelectedIcon = selectedOption?.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between text-xs font-normal h-9 bg-background cursor-pointer",
            !selectedOption && "text-muted-foreground",
            triggerClassName
          )}
        >
          <div className="flex items-center gap-2 truncate text-left min-w-0">
            {SelectedIcon && (
              <SelectedIcon className="size-3.5 text-primary shrink-0" />
            )}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {allowClear && selectedOption && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("");
                }}
                className="hover:text-foreground text-muted-foreground p-0.5 rounded"
              >
                <X className="size-3" />
              </button>
            )}
            <ChevronDown className="size-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn("w-[280px] sm:w-[320px] p-2 space-y-2", className)}
      >
        {/* Search Input Box */}
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 pr-7 text-xs bg-muted/30 focus-visible:ring-1"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Options List */}
        <div className="max-h-56 overflow-y-auto space-y-0.5 py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-disabled={opt.disabled || undefined}
                  title={opt.disabled ? opt.disabledReason : undefined}
                  onClick={() => {
                    if (opt.disabled) return;
                    onValueChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "group/opt flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                    opt.disabled
                      ? "cursor-not-allowed text-muted-foreground/50 hover:bg-destructive/5"
                      : isSelected
                      ? "bg-primary/10 text-primary font-medium cursor-pointer"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    opt.depth === 2 && "pl-5"
                  )}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    {Icon && (
                      <Icon
                        className={cn(
                          "size-3.5 shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    )}
                    <span className="truncate">
                      {opt.depth === 2 && !opt.label.startsWith("↳")
                        ? `↳ ${opt.label}`
                        : opt.label}
                    </span>
                  </div>
                  {opt.disabled ? (
                    <span className="flex items-center gap-1 shrink-0 text-[10px]">
                      <Lock className="size-3 text-muted-foreground/60 group-hover/opt:text-destructive" />
                      <span className="hidden group-hover/opt:inline text-destructive font-medium">
                        {opt.disabledReason || "No permission"}
                      </span>
                    </span>
                  ) : (
                    isSelected && <Check className="size-3.5 shrink-0 text-primary" />
                  )}
                </button>
              );
            })
          ) : (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {emptyText}
            </div>
          )}
        </div>

        {/* Footer info banner */}
        {!search.trim() && options.length > defaultLimit && (
          <div className="border-t border-border/60 pt-1.5 px-1 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Showing {filteredOptions.length}/{options.length} items</span>
            <span>Type to search more...</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

