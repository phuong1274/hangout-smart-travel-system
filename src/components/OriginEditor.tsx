import React, { useState, useEffect } from 'react';

// Small, non-draggable origin editor component.
// Props: value = { label?, lat?, lng? } | null
// onChange called with normalized origin object while editing (debounced not handled here)
// onSubmit called when user finishes (onBlur or Enter)
export default function OriginEditor({ value, onChange, onSubmit }) {
  const [text, setText] = useState(value?.label || '');

  useEffect(() => {
    setText(value?.label || '');
  }, [value]);

  function handleBlur() {
    const origin = { label: text, lat: value?.lat, lng: value?.lng };
    onChange && onChange(origin);
    onSubmit && onSubmit(origin);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden style={{ width: 18, height: 18, background: '#d33', borderRadius: 4 }} />
      <input
        aria-label="Origin"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Edit origin"
        style={{ flex: 1, padding: '6px 8px' }}
      />
      {value?.lat != null && value?.lng != null ? (
        <span style={{ color: '#666', fontSize: 12 }}>
          {value.lat.toFixed(4)},{' '}{value.lng.toFixed(4)}
        </span>
      ) : null}
    </div>
  );
}
