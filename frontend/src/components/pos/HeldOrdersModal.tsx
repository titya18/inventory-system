import { useRef, useState } from "react";
import { useCart, HeldOrder } from "@/hooks/useCart";
import { X, ShoppingBag, RotateCcw, Trash2, Clock, ChevronUp, ChevronDown, Pencil, Check } from "lucide-react";

interface Props {
  onClose: () => void;
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const timeAgo = (date: Date) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

export const HeldOrdersModal = ({ onClose }: Props) => {
  const { heldOrders, recallOrder, removeHeldOrder, updateHeldOrder, reorderHeldOrders } = useCart();
  const [orders, setOrders] = useState<HeldOrder[]>(heldOrders);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const handleRecall = (id: string) => {
    recallOrder(id);
    onClose();
  };

  const handleDelete = (id: string) => {
    removeHeldOrder(id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const startEdit = (order: HeldOrder) => {
    setEditingId(order.id);
    setEditValue(order.note || `Order ${orders.findIndex(o => o.id === order.id) + 1}`);
    setEditError("");
    setTimeout(() => editRef.current?.select(), 50);
  };

  const saveEdit = (id: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditingId(null); setEditError(""); return; }
    const isDuplicate = orders.some(o => o.id !== id && o.note === trimmed);
    if (isDuplicate) {
      setEditError(`"${trimmed}" is already used`);
      editRef.current?.select();
      return;
    }
    updateHeldOrder(id, { note: trimmed });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, note: trimmed } : o));
    setEditingId(null);
    setEditError("");
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...orders];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setOrders(next);
    reorderHeldOrders(next);
  };

  const moveDown = (idx: number) => {
    if (idx === orders.length - 1) return;
    const next = [...orders];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setOrders(next);
    reorderHeldOrders(next);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              <Clock className="w-4 h-4" style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: '#1e293b' }}>Held Orders</h2>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} on hold</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-3">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <ShoppingBag className="w-12 h-12" style={{ color: '#e2e8f0' }} />
              <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>No orders on hold</p>
            </div>
          ) : (
            orders.map((order, idx) => {
              const total = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
              const isEditing = editingId === order.id;
              return (
                <div key={order.id} className="rounded-xl p-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>

                  {/* Row: badge + name + move + total */}
                  <div className="flex items-center gap-2 mb-3">
                    {/* Order badge */}
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                      #{idx + 1}
                    </div>

                    {/* Editable name */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div>
                          <div className="flex items-center gap-1">
                          <input
                            ref={editRef}
                            value={editValue}
                            onChange={e => { setEditValue(e.target.value); setEditError(""); }}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(order.id); if (e.key === 'Escape') { setEditingId(null); setEditError(""); } }}
                            onBlur={() => saveEdit(order.id)}
                            className="flex-1 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none"
                            style={{ border: `1.5px solid ${editError ? '#ef4444' : '#6366f1'}`, backgroundColor: editError ? '#fef2f2' : '#eef2ff', color: '#1e293b', minWidth: 0 }}
                            autoFocus
                          />
                          <button onClick={() => saveEdit(order.id)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#6366f1', color: '#fff' }}>
                            <Check className="w-3 h-3" />
                          </button>
                          </div>
                          {editError && (
                            <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#ef4444' }}>{editError}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(order)}
                          className="flex items-center gap-1 group text-left w-full"
                          title="Click to rename"
                        >
                          <span className="text-xs font-semibold truncate" style={{ color: '#1e293b' }}>
                            {order.note || `Order ${idx + 1}`}
                          </span>
                          <Pencil className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#94a3b8' }} />
                        </button>
                      )}
                      <p className="text-[11px] flex items-center gap-0.5 mt-0.5" style={{ color: '#94a3b8' }}>
                        <Clock className="w-2.5 h-2.5" /> {timeAgo(order.heldAt)}
                      </p>
                    </div>

                    {/* Move up/down */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                        style={{ backgroundColor: idx === 0 ? '#f1f5f9' : '#e0e7ff', color: idx === 0 ? '#cbd5e1' : '#6366f1' }}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === orders.length - 1}
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                        style={{ backgroundColor: idx === orders.length - 1 ? '#f1f5f9' : '#e0e7ff', color: idx === orders.length - 1 ? '#cbd5e1' : '#6366f1' }}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total */}
                    <span className="font-bold text-sm flex-shrink-0" style={{ color: '#4f46e5' }}>${fmt(total)}</span>
                  </div>

                  {/* Items preview */}
                  <div className="space-y-1 mb-3 pl-9">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.product.id} className="flex justify-between text-xs" style={{ color: '#64748b' }}>
                        <span className="truncate mr-2">{item.product.name} × {item.quantity} {item.unitName}</span>
                        <span className="flex-shrink-0">${fmt(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs" style={{ color: '#94a3b8' }}>+{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRecall(order.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold"
                      style={{ background: 'linear-gradient(to right,#6366f1,#4f46e5)', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Recall
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl"
                      style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
