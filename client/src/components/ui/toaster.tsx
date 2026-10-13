import { useToast } from "@/hooks/use-toast"
import { extractApiErrorMessage } from "@/lib/queryClient"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

// Many call sites pass `error.message` straight through, which for API
// failures is `"<status>: <raw JSON body>"`. Turn that into the server's
// human `message` here so every toast reads cleanly. Other text is untouched.
function readable(value: React.ReactNode): React.ReactNode {
  if (typeof value !== "string" || !/^\d{3}:\s*/.test(value)) return value
  return extractApiErrorMessage(new Error(value), value)
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid flex-1 gap-1">
              {title && <ToastTitle>{readable(title)}</ToastTitle>}
              {description && (
                <ToastDescription>{readable(description)}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
