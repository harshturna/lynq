declare type Website = {
  id: number;
  name: string;
  url: string;
  slug: string;
  user_id: string;
  is_first_visit: boolean;
};

declare type DatePickerValues =
  | "Today"
  | "Yesterday"
  | "This week"
  | "This month"
  | "This year";
