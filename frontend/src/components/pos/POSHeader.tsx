import { useClock } from "@/hooks/useClock";
import { useAppContext } from "@/hooks/useAppContext";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Maximize2, User, ShoppingBag, LogOut, Monitor } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/api/auth";
import { toast } from "react-toastify";

export const POSHeader = () => {
  const { formattedTime } = useClock();
  const { user } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { mutate: handleLogout, isPending } = useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["validateToken"] });
      localStorage.clear();
      navigate("/");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Sign out failed.");
    },
  });

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className="h-14 flex items-center justify-between px-4 flex-shrink-0"
      style={{ backgroundColor: '#1e293b', boxShadow: '0 1px 6px rgba(0,0,0,0.2)' }}
    >
      {/* Logo + clock */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#22c55e)' }}>
            <ShoppingBag className="w-4 h-4" style={{ color: '#fff' }} />
          </div>
          <span className="font-bold text-base" style={{ color: '#f1f5f9' }}>QuickPOS</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ backgroundColor: '#16a34a' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#bbf7d0' }} />
          <span className="text-xs font-semibold" style={{ color: '#f0fdf4' }}>{formattedTime}</span>
        </div>
      </div>

      {/* Dashboard button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
        style={{ backgroundColor: '#d97706', color: '#fff' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#b45309')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#d97706')}
      >
        <LayoutDashboard className="w-4 h-4" />
        Dashboard
      </button>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Customer display */}
        <button
          onClick={() => window.open("/pos-display", "customer-display", "width=1024,height=768,menubar=no,toolbar=no,location=no,status=no")}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: '#94a3b8', backgroundColor: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Open Customer Screen"
        >
          <Monitor className="w-4 h-4" />
        </button>

        <button
          onClick={handleFullscreen}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: '#94a3b8', backgroundColor: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* User avatar + dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
            style={{ backgroundColor: menuOpen ? 'rgba(255,255,255,0.12)' : 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#3b82f6)' }}>
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium hidden sm:block" style={{ color: '#e2e8f0' }}>
              {user?.name ?? "User"}
            </span>
            <svg
              className={`w-3.5 h-3.5 hidden sm:block transition-transform ${menuOpen ? "rotate-180" : ""}`}
              style={{ color: '#64748b' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 rounded-xl overflow-hidden shadow-2xl"
              style={{ top: "calc(100% + 8px)", minWidth: 200, backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", zIndex: 9999 }}
            >
              {/* User info */}
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>{user?.name ?? "User"}</p>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{user?.roleType ?? ""}</p>
              </div>

              {/* Sign out */}
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                disabled={isPending}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold transition-colors"
                style={{ color: "#f87171", backgroundColor: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <LogOut className="w-4 h-4" />
                {isPending ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
