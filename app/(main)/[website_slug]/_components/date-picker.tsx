"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { datePickerValues } from "@/constants";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

interface DatePickerProps {
  selectedTimeFrame: (timeFrame: DatePickerValues) => void;
}

const DatePicker = ({ selectedTimeFrame }: DatePickerProps) => {
  const [selected, setSelected] = useState(datePickerValues[2]);

  const [datePickerStartingValues, datePickerEndValues] = [
    datePickerValues.slice(0, 2),
    datePickerValues.slice(2),
  ];

  function onValueChangeHandler(newValue: DatePickerValues) {
    setSelected(newValue);
    selectedTimeFrame(newValue);
  }

  return (
    <Select
      value={selected}
      onValueChange={(newValue: DatePickerValues) =>
        onValueChangeHandler(newValue)
      }
    >
      <SelectTrigger className="w-[180px] h-[44px]">
        <div className="justify-start gap-3 flex items-center">
          <CalendarDays className="text-white/80" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="text-right">
        <SelectGroup>
          {datePickerStartingValues.map((val) => (
            <SelectItem key={val} value={val}>
              {val === "Today" ? "24 hours" : val}
            </SelectItem>
          ))}
          <hr className="border-t m-2 border-stone-800" />
          {datePickerEndValues.map((val) => (
            <SelectItem key={val} value={val}>
              {val === "Today" ? "24 hours" : val}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default DatePicker;
