import React, { useEffect, useState } from "react";
import { Button, Checkbox, Modal, Typography } from "antd";
import { HolderOutlined } from "@ant-design/icons";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  columnLabel,
  defaultTableColumnPrefs,
  isColumnRequired,
  saveTableColumnPrefs,
} from "../tableColumns.js";
import "./TableColumnSettings.css";

function SortableColumnRow({ item, onToggleVisible }) {
  const required = isColumnRequired(item.key);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`table-column-settings-row${isDragging ? " table-column-settings-row-dragging" : ""}`}
    >
      <span
        className="table-column-settings-handle"
        aria-label="拖动排序"
        {...attributes}
        {...listeners}
      >
        <HolderOutlined />
      </span>
      <Checkbox
        checked={item.visible}
        disabled={required}
        onChange={(e) => onToggleVisible(item.key, e.target.checked)}
      >
        {columnLabel(item.key)}
        {required ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {" "}
            (固定)
          </Typography.Text>
        ) : null}
      </Checkbox>
    </div>
  );
}

export default function TableColumnSettings({
  open,
  onClose,
  columnPrefs,
  onChange,
}) {
  const [items, setItems] = useState(columnPrefs);

  useEffect(() => {
    if (open) setItems(columnPrefs);
  }, [open, columnPrefs]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const applyOrder = (next) => {
    setItems(next);
    onChange(next);
    saveTableColumnPrefs(next);
  };

  const toggleVisible = (key, checked) => {
    if (isColumnRequired(key)) return;
    const next = items.map((item) =>
      item.key === key ? { ...item, visible: checked } : { ...item }
    );
    applyOrder(next);
  };

  const reset = () => {
    applyOrder(defaultTableColumnPrefs());
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.key === active.id);
      const newIndex = current.findIndex((item) => item.key === over.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleDragEnd = () => {
    setItems((current) => {
      onChange(current);
      saveTableColumnPrefs(current);
      return current;
    });
  };

  return (
    <Modal
      title="表格列设置"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="reset" onClick={reset}>
          恢复默认
        </Button>,
        <Button key="done" type="primary" onClick={onClose}>
          完成
        </Button>,
      ]}
      width={420}
      destroyOnHidden
    >
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        勾选显示列，拖动左侧手柄调整顺序。
      </Typography.Text>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="table-column-settings-list">
            {items.map((item) => (
              <SortableColumnRow
                key={item.key}
                item={item}
                onToggleVisible={toggleVisible}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Modal>
  );
}
