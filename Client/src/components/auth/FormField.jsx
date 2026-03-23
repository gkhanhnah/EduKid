export function FormField({ id, label, required, error, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const inputClass =
  'w-full px-5 py-3.5 bg-input-background border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary border-border'

export function TextInput({ id, error, className = '', ...props }) {
  return (
    <input
      id={id}
      className={`${inputClass} ${error ? 'border-destructive ring-1 ring-destructive/30' : ''} ${className}`}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    />
  )
}

export function SelectInput({ id, error, children, className = '', ...props }) {
  return (
    <select
      id={id}
      className={`${inputClass} ${error ? 'border-destructive ring-1 ring-destructive/30' : ''} ${className}`}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    >
      {children}
    </select>
  )
}
