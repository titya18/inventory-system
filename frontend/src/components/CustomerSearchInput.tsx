import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { CustomerType } from "@/data_types/types";
import { Search, X } from "lucide-react";

interface CustomerSearchInputProps {
  customers: CustomerType[];
  value: string | number | undefined;
  onChange: (id: string) => void;
  className?: string;
}

const CustomerSearchInput: React.FC<CustomerSearchInputProps> = ({
  customers,
  value,
  onChange,
  className = "",
}) => {
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display when value is set externally (form load / edit)
  useEffect(() => {
    if (!value) { setSearchText(""); return; }
    const found = customers.find((c) => String(c.id) === String(value));
    if (found) setSearchText(found.name + (found.phone ? ` — ${found.phone}` : ""));
  }, [value, customers]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        const dropdown = document.getElementById("customer-search-dropdown");
        if (dropdown && !dropdown.contains(target)) setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Recalculate dropdown position when opened
  const openDropdown = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setIsOpen(true);
  };

  const filtered = searchText.trim()
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (c.phone && c.phone.includes(searchText)) ||
        (c.email && c.email.toLowerCase().includes(searchText.toLowerCase()))
      )
    : customers;

  const handleSelect = (c: CustomerType) => {
    onChange(String(c.id));
    setSearchText(c.name + (c.phone ? ` — ${c.phone}` : ""));
    setIsOpen(false);
  };

  const handleClear = () => { onChange(""); setSearchText(""); setIsOpen(false); };

  const dropdown = isOpen ? ReactDOM.createPortal(
    <div
      id="customer-search-dropdown"
      style={{
        position: 'absolute',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 99999,
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        maxHeight: '240px',
        overflowY: 'auto',
      }}
    >
      {filtered.length === 0 ? (
        <div style={{ padding: '12px 16px', fontSize: '14px', color: '#9ca3af' }}>
          No customers found
        </div>
      ) : (
        filtered.map((c, idx) => {
          const isSelected = String(c.id) === String(value);
          const isLast = idx === filtered.length - 1;
          return (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => handleSelect(c)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f3ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? '#eef2ff' : '#ffffff'; }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: '#4f46e5',
              }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '14px', fontWeight: 500, color: isSelected ? '#4338ca' : '#111827',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.name}
                </div>
                {c.phone && (
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '1px' }}>
                    {c.phone}
                  </div>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ left: '12px', color: '#9ca3af' }}
        />
        <input
          type="text"
          className="form-input ltr:rounded-r-none rtl:rounded-l-none ltr:border-r-0 rtl:border-l-0"
          style={{ paddingLeft: '38px', paddingRight: searchText ? '32px' : '12px' }}
          placeholder="Search customer by name or phone..."
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); openDropdown(); if (!e.target.value) onChange(""); }}
          onFocus={openDropdown}
          autoComplete="off"
        />
        {searchText && (
          <button type="button" onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: '#9ca3af' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
};

export default CustomerSearchInput;
