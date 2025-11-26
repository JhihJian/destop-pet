import React from "react";
import type { MenuItem } from "./registry";

export default function DoubleClickMenuView({ items, onPick }: { items: MenuItem[]; onPick: (item: MenuItem) => void }) {
  return (
    <div className="action-buttons">
      {items.map((it) => (
        <button key={it.key} onClick={() => onPick(it)}>
          <span className="action-button-text">{it.label}</span>
          <span className="action-button-action"></span>
        </button>
      ))}
    </div>
  );
}
