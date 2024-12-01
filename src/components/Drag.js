import React, { useCallback } from "react";

const DragAndDropArea = () => {
  const handleDragOver = useCallback((e) => {
    e.preventDefault(); // 防止默认处理（比如文件被打开）
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length) {
      const file = files[0];
      if (file.type === "application/pdf") {
        console.log("PDF file path:", file.path);
      } else {
        console.log("Not a PDF file");
      }
    }
  }, []);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        width: "100%",
        height: "200px",
        border: "2px dashed black",
        textAlign: "center",
        lineHeight: "200px",
      }}
    >
      拖拽PDF文件到这里
    </div>
  );
};

export default DragAndDropArea;
