import { useState, useEffect } from "react";
import { type ComponentProps, useId } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ComboboxProps extends Omit<ComponentProps<"input">, "onChange"> {
  label: string;
  error?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  // 文字列検索の結果、選択された値（value: ID）を返すコールバック
  onSelectOption?: (value: string, form?: HTMLFormElement) => void;
  // 初期値 (value: ID)
  defaultValue?: string;
}

export function Combobox({
  label,
  error,
  options,
  placeholder = "入力または選択してください",
  className,
  onSelectOption,
  defaultValue,
  name,
  ...props
}: ComboboxProps) {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const listId = `${inputId}-list`;

  // 初期値 (ID) からラベルを探す
  const initialOption = options.find((o) => o.value === defaultValue);
  const [inputValue, setInputValue] = useState(initialOption ? initialOption.label : "");
  const [selectedValue, setSelectedValue] = useState(defaultValue || "");

  // defaultValue (ID) が外部から変わった場合（クエリパラメータ変更時など）の同期
  useEffect(() => {
     const option = options.find((o) => o.value === defaultValue);
     if (option) {
         setInputValue(option.label);
         setSelectedValue(option.value);
     } else if (!defaultValue) {
         setInputValue("");
         setSelectedValue("");
     }
  }, [defaultValue, options]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    
    // 入力されたラベルに対応する value (ID) を探す
    const matchedOption = options.find((o) => o.label === newVal);
    
    if (matchedOption) {
      setSelectedValue(matchedOption.value);
      if (onSelectOption) {
        onSelectOption(matchedOption.value, e.target.form || undefined);
      }
    } else {
      // 一致しない場合はIDを空にする
      setSelectedValue("");
      if (newVal === "" && onSelectOption) {
          onSelectOption("", e.target.form || undefined);
      }
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={inputId} className="text-base font-medium text-black">
        {label}
      </label>
      <div className="relative w-full">
        <input
          id={inputId}
          list={listId}
          className={cn(
            "w-full rounded-md border border-green-500 bg-green-50 px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500 bg-red-50",
            className
          )}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleChange}
          autoComplete="off"
          {...props}
        />
        <datalist id={listId}>
          {options.map((option) => (
            <option key={option.value} value={option.label} />
          ))}
        </datalist>
        
        {/* 実際にサーバーに送信されるID用のinput */}
        <input 
            type="hidden" 
            name={name} 
            value={selectedValue}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
