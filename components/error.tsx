import { ShieldAlert } from "lucide-react";

interface ErrorAlertProps {
  title: string;
  description: string;
}

const ErrorAlert = ({ title, description }: ErrorAlertProps) => {
  return (
    <div className="flex items-center justify-center flex-col mx-4 h-96 mt-24 gap-4 rounded-md border border-red-600 dark:border-red-900 bg-stone-900/20">
      <ShieldAlert
        width={50}
        height={50}
        className="text-red-500 dark:text-red-800"
      />
      <div className="text-red-500 font-bold text-3xl dark:text-red-800">
        {title}
      </div>
      <div className="text-red-700 dark:text-red-900">{description}</div>
    </div>
  );
};

export default ErrorAlert;
