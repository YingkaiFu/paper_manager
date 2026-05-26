import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, InputNumber, Space, Spin, Typography } from "antd";
import {
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./PdfViewer.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function PdfViewer({ filePath, title, onClose }) {
  const scrollRef = useRef(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth, setPageWidth] = useState(420);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!filePath) {
      setSource(null);
      setError("");
      setNumPages(0);
      setPageNumber(1);
      return undefined;
    }

    let revokedUrl = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      setSource(null);
      setNumPages(0);
      setPageNumber(1);
      try {
        const result = await window.electronAPI.readPdfBytes(filePath);
        if (cancelled) return;
        if (!result?.ok) {
          setError(result?.error || "Could not load PDF.");
          return;
        }
        if (result.encoding === "bloburl" && result.url) {
          revokedUrl = result.url;
          setSource(result.url);
          return;
        }
        if (result.encoding === "base64" && result.data) {
          setSource({ data: base64ToUint8Array(result.data) });
          return;
        }
        setError("Unsupported PDF payload.");
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Could not load PDF.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [filePath]);

  useEffect(() => {
    setZoom(1);
  }, [filePath]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const updateWidth = () => {
      setPageWidth(Math.max(240, el.clientWidth - 24));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [filePath]);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }) => {
    setNumPages(total);
    setPageNumber(1);
  }, []);

  const goPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goNext = () => setPageNumber((p) => Math.min(numPages || 1, p + 1));
  const zoomIn = () => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))));
  const zoomOut = () => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))));

  if (!filePath) {
    return (
      <div className="pdf-viewer pdf-viewer-empty">
        <Typography.Text type="secondary">Select a paper to preview.</Typography.Text>
      </div>
    );
  }

  const displayTitle = title || filePath.split(/[/\\]/).pop() || "PDF";

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer-toolbar">
        <Typography.Text ellipsis title={displayTitle} className="pdf-viewer-title">
          {displayTitle}
        </Typography.Text>
        <Space size={4} wrap>
          <Button size="small" icon={<LeftOutlined />} disabled={pageNumber <= 1} onClick={goPrev} />
          <InputNumber
            size="small"
            min={1}
            max={numPages || 1}
            value={pageNumber}
            onChange={(v) => v && setPageNumber(Math.min(numPages || 1, Math.max(1, v)))}
            style={{ width: 56 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            / {numPages || "—"}
          </Typography.Text>
          <Button
            size="small"
            icon={<RightOutlined />}
            disabled={!numPages || pageNumber >= numPages}
            onClick={goNext}
          />
          <Button size="small" icon={<ZoomOutOutlined />} onClick={zoomOut} />
          <Button size="small" icon={<ZoomInOutlined />} onClick={zoomIn} />
          {onClose ? (
            <Button size="small" icon={<CloseOutlined />} onClick={onClose} title="Close preview" />
          ) : null}
        </Space>
      </div>

      <div ref={scrollRef} className="pdf-viewer-scroll">
        {loading ? (
          <div className="pdf-viewer-center">
            <Spin tip="Loading PDF…" />
          </div>
        ) : null}
        {!loading && error ? (
          <div className="pdf-viewer-center">
            <Typography.Text type="danger">{error}</Typography.Text>
          </div>
        ) : null}
        {!loading && !error && source ? (
          <Document
            file={source}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(e) => setError(e?.message || "Failed to render PDF.")}
            loading={
              <div className="pdf-viewer-center">
                <Spin />
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={Math.round(pageWidth * zoom)}
              renderAnnotationLayer
              renderTextLayer
            />
          </Document>
        ) : null}
      </div>
    </div>
  );
}
