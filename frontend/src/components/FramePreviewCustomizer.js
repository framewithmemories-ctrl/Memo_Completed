import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Frame, Image as ImageIcon, RotateCcw, Upload } from "lucide-react";

const FRAME_SIZES = [
  ["4 × 4", 1],
  ["6 × 4", 1.5],
  ["6 × 6", 1],
  ["8 × 6", 1.3333],
  ["12 × 8", 1.5],
  ["12 × 10", 1.2],
  ["12 × 12", 1],
  ["12 × 15", 0.8],
  ["12 × 18", 0.6667],
  ["12 × 24", 0.5],
  ["18 × 24", 0.75],
  ["20 × 30", 0.6667]
];

export const FramePreviewCustomizer = () => {
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [borderWidth, setBorderWidth] = useState(18);
  const [zoom, setZoom] = useState(100);
  const [selectedSize, setSelectedSize] = useState("12 × 8");
  const [mode, setMode] = useState("frame");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleOpen = (event) => {
      const detail = event.detail || {};
      setSuggestion(detail.suggestion || null);
      setImageUrl(detail.previewPhoto?.url || detail.suggestion?.image_url || "");
      setBorderWidth(18);
      setZoom(100);
      setSelectedSize("12 × 8");
      setMode("frame");
      setOpen(true);
    };

    window.addEventListener("memories:customize-frame", handleOpen);
    return () => window.removeEventListener("memories:customize-frame", handleOpen);
  }, []);

  const handleLocalPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setBorderWidth(18);
    setZoom(100);
    setSelectedSize("12 × 8");
    setMode("frame");
  };

  const selectedRatio = FRAME_SIZES.find(([label]) => label === selectedSize)?.[1] || 1.5;
  const frameWidth = selectedRatio < 1 ? 220 : 300;
  const frameHeight = Math.round(frameWidth / selectedRatio);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] overflow-y-auto p-0">
        <div className="p-6 pb-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Frame className="w-6 h-6 text-gray-900" />
              See Your Photo Framed
            </DialogTitle>
            <DialogDescription>
              Preview the recommendation with a realistic black frame before you order. Adjust the frame thickness live.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 px-6 pb-6">
          <div className={`rounded-2xl p-5 min-h-[430px] flex items-center justify-center ${mode === "wall" ? "bg-stone-200" : "bg-gray-100"}`}>
            <div
              className="relative flex items-center justify-center transition-all duration-200"
              style={{
                width: `${frameWidth + borderWidth * 2}px`,
                height: `${frameHeight + borderWidth * 2}px`,
                background: "#050505",
                padding: `${borderWidth}px`,
                boxShadow: mode === "wall" ? "0 22px 45px rgba(0,0,0,.30)" : "0 12px 30px rgba(0,0,0,.20)"
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Framed photo preview"
                  className="w-full h-full object-cover bg-white transition-transform duration-200"
                  style={{ transform: `scale(${zoom / 100})` }}
                />
              ) : (
                <div className="w-full h-full bg-white flex flex-col items-center justify-center text-gray-400 text-center p-6">
                  <ImageIcon className="w-12 h-12 mb-3" />
                  <p className="font-medium">Upload your photo to preview it</p>
                  <p className="text-sm mt-1">The black frame will update instantly.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {suggestion?.name && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold">AI recommendation</p>
                <p className="font-semibold text-gray-900 mt-1">{suggestion.name}</p>
              </div>
            )}

            <Button className="w-full bg-gray-900 hover:bg-black" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              {imageUrl ? "Change Photo" : "Upload Your Photo"}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLocalPhoto} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-900">Frame size</label>
                <span className="text-sm text-gray-600">{selectedSize}</span>
              </div>
              <select
                value={selectedSize}
                onChange={(event) => setSelectedSize(event.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                {FRAME_SIZES.map(([label]) => <option key={label}>{label}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="frame-thickness" className="text-sm font-semibold text-gray-900">Black frame thickness</label>
                <span className="text-sm text-gray-600">{borderWidth}px</span>
              </div>
              <input
                id="frame-thickness"
                type="range"
                min="4"
                max="48"
                step="1"
                value={borderWidth}
                onChange={(event) => setBorderWidth(Number(event.target.value))}
                className="w-full accent-black"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Thin</span><span>Bold</span></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="photo-zoom" className="text-sm font-semibold text-gray-900">Photo zoom</label>
                <span className="text-sm text-gray-600">{zoom}%</span>
              </div>
              <input
                id="photo-zoom"
                type="range"
                min="80"
                max="125"
                step="1"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-black"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 block mb-2">Preview</label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={mode === "frame" ? "default" : "outline"} onClick={() => setMode("frame")}>
                  <Frame className="w-4 h-4 mr-2" /> Flat
                </Button>
                <Button variant={mode === "wall" ? "default" : "outline"} onClick={() => setMode("wall")}>
                  Wall View
                </Button>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-2" /> Reset Preview
            </Button>

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
              <strong>Preview only:</strong> your original photo is not changed. This tool shows how it can look with a black frame.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
