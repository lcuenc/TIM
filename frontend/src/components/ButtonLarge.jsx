// src/components/ButtonLarge.jsx
export default function ButtonLarge({ label, icon, type = "primary", onClick }) {
  const variants = {
    primary: "bg-primary hover:bg-secondary focus:ring-secondary",
    secondary: "bg-secondary hover:bg-primary focus:ring-primary",
    success: "bg-success hover:bg-success/80 focus:ring-success/50",
    error: "bg-error hover:bg-error/80 focus:ring-error/50",
    warning: "bg-warning hover:bg-warning/80 focus:ring-warning/50",
  };

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-2 
                  px-4 py-6 text-lg sm:text-xl font-bold text-white 
                  rounded-2xl shadow-md transition-transform active:scale-95 
                  focus:outline-none focus:ring-4 ${variants[type]} 
                  w-full`}
    >
      {icon && <span className="text-3xl">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
