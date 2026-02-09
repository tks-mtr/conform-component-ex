"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

interface ComboboxProps {
    label?: string; // アクセシビリティ用ラベル
    options: { label: string; value: string }[];
    value?: string;
    onSelect: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    name?: string; // フォーム送信用の hidden input 用
    className?: string;
}

export function Combobox({
    label,
    options,
    value,
    onSelect,
    placeholder = "選択してください...",
    searchPlaceholder = "検索...",
    emptyMessage = "見つかりませんでした。",
    disabled = false,
    name,
    className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value || "")
  
  // 外部から value (prop) が変更された場合に同期する
  React.useEffect(() => {
    setSelectedValue(value || "")
  }, [value])


  const selectedOption = options.find((option) => option.value === selectedValue)

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
        {label && <label className="text-base font-medium text-black">{label}</label>}
        <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-green-50 border-green-500 text-black hover:bg-green-100 hover:text-black hover:bg-green-100" // スタイル調整: 既存デザインに合わせる
            disabled={disabled}
            >
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                {options.map((option) => (
                    <CommandItem
                    key={option.value}
                    value={option.label} // cmdkの検索は value (content) に対して行われるため、ラベルを渡す
                    onSelect={(currentValue) => {
                        // currentValue は cmdk 内部で小文字化されたラベルが返ってくる場合があるため
                        // 本来の options から value (ID) を探し出す
                        const matchedOption = options.find(
                             (o) => o.label.toLowerCase() === currentValue.toLowerCase()
                        );
                        if (matchedOption) {
                             setSelectedValue(matchedOption.value)
                             onSelect(matchedOption.value)
                        }
                        setOpen(false)
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        selectedValue === option.value ? "opacity-100" : "opacity-0"
                        )}
                    />
                    {option.label}
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
            </Command>
        </PopoverContent>
        </Popover>
        {/* フォーム送信用の hidden input */}
        <input type="hidden" name={name} value={selectedValue} />
    </div>
  )
}
