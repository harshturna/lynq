import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Ellipsis,
  Pencil,
  Settings as SettingsIcon,
  Trash2,
} from "lucide-react";

const Settings = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Ellipsis className="hover:text-stone-100 text-stone-400 transition duration-500 absolute top-7 right-5 cursor-pointer" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuItem className="p-3 cursor-pointer">
          <Pencil width={15} height={15} />
          Edit Website
        </DropdownMenuItem>
        <DropdownMenuItem className="p-3 cursor-pointer">
          <Trash2 width={15} height={15} />
          Delete Website
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Settings;
