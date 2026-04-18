import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';

export function SortableDayCard({ id, children, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type: 'day' }, disabled });

  const dragHandle = (
    <span
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      style={{
        cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        padding: '0 6px',
        color: '#bfbfbf',
        display: 'inline-flex',
        alignItems: 'center',
      }}
      title="Drag to reorder day"
    >
      <HolderOutlined />
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {children({ dragHandle, isDragging })}
    </div>
  );
}
