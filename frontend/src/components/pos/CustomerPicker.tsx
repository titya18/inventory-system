import { useEffect, useRef, useState } from "react";
import { User, Search, Plus, X, Loader2, Check, Phone } from "lucide-react";
import { CustomerType } from "@/data_types/types";
import { upsertCustomer } from "@/api/customer";
import { toast } from "react-toastify";

interface Props {
  customers: CustomerType[];
  selectedCustomerId: number;
  onSelect: (id: number) => void;
  onCustomerCreated: (customer: CustomerType) => void;
}

export const CustomerPicker = ({ customers, selectedCustomerId, onSelect, onCustomerCreated }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;

  const filtered = search.trim()
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone ?? "").includes(search)
      )
    : customers;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (id: number) => {
    onSelect(id);
    setOpen(false);
    setSearch("");
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    // Phone required + uniqueness check
    const phone = newPhone.trim();
    if (!phone) { setPhoneError("Phone number is required."); return; }
    const duplicate = customers.find((c) => c.phone?.replace(/\s/g, "") === phone.replace(/\s/g, ""));
    if (duplicate) { setPhoneError(`Phone already used by "${duplicate.name}".`); return; }
    setPhoneError("");
    if (!newAddress.trim()) return;
    setCreating(true);
    try {
      const created = await upsertCustomer({
        name: newName.trim(),
        phone,
        email: newEmail.trim() || undefined,
        address: newAddress.trim(),
      });
      onCustomerCreated(created);
      onSelect(created.id!);
      toast.success(`Customer "${created.name}" created.`);
      setShowCreate(false);
      setOpen(false);
      setSearch("");
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewAddress("");
      setPhoneError("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create customer.");
    } finally {
      setCreating(false);
    }
  };

  const displayLabel = selectedCustomerId === 0
    ? "Walk-in Customer"
    : selectedCustomer
    ? `${selectedCustomer.name}${selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}`
    : "Walk-in Customer";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200 text-left"
        style={{ minHeight: 38 }}
      >
        <User className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
        <span className="flex-1 text-sm text-gray-700 truncate">{displayLabel}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 rounded-xl overflow-hidden shadow-xl border border-gray-200 flex flex-col"
          style={{ top: "calc(100% + 4px)", zIndex: 9999, backgroundColor: "#fff", maxHeight: 320 }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-shrink-0">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm focus:outline-none text-gray-700 bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {/* Walk-in option */}
            <button
              onClick={() => handleSelect(0)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-indigo-50 text-left transition-colors"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e0e7ff" }}>
                <User className="w-3.5 h-3.5" style={{ color: "#6366f1" }} />
              </div>
              <span className="text-sm text-gray-700 flex-1">Walk-in Customer</span>
              {selectedCustomerId === 0 && <Check className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />}
            </button>

            {/* Customer list */}
            {filtered.length === 0 && search ? (
              <p className="text-xs text-gray-400 text-center py-4">No customers found</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id!)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-indigo-50 text-left transition-colors border-t border-gray-50"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: "#6366f1" }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                    {c.phone && <p className="text-[11px] text-gray-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{c.phone}</p>}
                  </div>
                  {selectedCustomerId === c.id && <Check className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>

          {/* Create new */}
          <div className="flex-shrink-0 border-t border-gray-100 p-2">
            <button
              onClick={() => { setShowCreate(true); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#dcfce7")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#f0fdf4")}
            >
              <Plus className="w-3.5 h-3.5" />
              Create new customer
            </button>
          </div>
        </div>
      )}

      {/* Create customer mini-modal */}
      {showCreate && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(2px)" }}
        >
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#3b82f6)" }}>
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1e293b" }}>New Customer</p>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>Add a customer to this order</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#fee2e2"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f1f5f9"; (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fields */}
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>
                  Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Customer name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b" }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>
                  Phone <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 012 345 678"
                  value={newPhone}
                  onChange={e => { setNewPhone(e.target.value); setPhoneError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: `1.5px solid ${phoneError ? "#ef4444" : "#e2e8f0"}`, backgroundColor: "#f8fafc", color: "#1e293b" }}
                />
                {phoneError && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{phoneError}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>Email</label>
                <input
                  type="email"
                  placeholder="optional"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748b" }}>
                  Address <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Customer address"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b" }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim() || !newPhone.trim() || !newAddress.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: creating || !newName.trim() || !newPhone.trim() || !newAddress.trim() ? "#e2e8f0" : "linear-gradient(to right,#6366f1,#4f46e5)",
                  color: creating || !newName.trim() || !newPhone.trim() || !newAddress.trim() ? "#94a3b8" : "#fff",
                  boxShadow: creating || !newName.trim() || !newPhone.trim() || !newAddress.trim() ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
                }}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? "Saving…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
