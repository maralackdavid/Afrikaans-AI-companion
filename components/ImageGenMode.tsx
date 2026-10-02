

import React, { useState } from 'react';
import { generateCapeImage, generateCapeVideo, getVideoStatus, downloadVideo } from '../services/gemini';
import { ImageSize, ImageStyle, ImageAspectRatio } from '../types';
import { IMAGE_STYLES } from '../constants';
import { Image as ImageIcon, Sparkles, Download, AlertCircle, Upload, X, Palette, Square, RectangleVertical, RectangleHorizontal, MapPin, Video, Film, Loader2 } from 'lucide-react';

const ImageGenMode: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [imageStyle, setImageStyle] = useState<ImageStyle>('Cartoon');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [useLocation, setUseLocation] = useState(true);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoStatusMsg, setVideoStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setGeneratedVideo(null);

    try {
      // Pass referenceImage (base64) if available
      const base64Data = await generateCapeImage(prompt, imageSize, imageStyle, aspectRatio, useLocation, referenceImage || undefined);
      setGeneratedImage(`data:image/png;base64,${base64Data}`);
    } catch (err) {
      setError("Failed to generate image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) return;

    setIsVideoLoading(true);
    setError(null);
    setGeneratedVideo(null);
    setGeneratedImage(null);
    setVideoStatusMsg('Initiating Veo 3.1 video engine...');

    try {
      // Set a warning if paid tier model prompt is required or if it just works
      const operationName = await generateCapeVideo(prompt, referenceImage || null, aspectRatio);
      
      const phrases = [
        "Pre-rendering cinematic vistas...",
        "Applying Kaapse lighting and atmosphere...",
        "Assembling motion frames with Veo...",
        "Interpolating smooth Cape Flats animations...",
        "Polishing high-fidelity camera angles...",
        "Vibe-checking the final details..."
      ];
      
      let phraseIndex = 0;
      const phraseInterval = setInterval(() => {
        setVideoStatusMsg(phrases[phraseIndex % phrases.length]);
        phraseIndex++;
      }, 5000);

      // Start Polling
      let isDone = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes total

      while (!isDone && attempts < maxAttempts) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 5000));
        
        const status = await getVideoStatus(operationName);
        if (status.done) {
          isDone = true;
          clearInterval(phraseInterval);
          setVideoStatusMsg('Downloading video data...');
          
          if (status.error) {
             throw new Error(status.error.message || "Veo failed to generate video");
          }

          const videoUrl = await downloadVideo(operationName);
          setGeneratedVideo(videoUrl);
        }
      }

      if (!isDone) {
        clearInterval(phraseInterval);
        throw new Error("Video generation timed out. Please try again.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate video with Veo. Please try again.");
    } finally {
      setIsVideoLoading(false);
      setVideoStatusMsg('');
    }
  };

  const handleDownload = async () => {
    const isVideo = !!generatedVideo;
    const mediaUrl = generatedVideo || generatedImage;
    if (!mediaUrl) return;

    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const extension = isVideo ? 'mp4' : 'png';
      const fileType = isVideo ? 'video/mp4' : 'image/png';
      const filename = `maralack-gen-${Date.now()}.${extension}`;
      const file = new File([blob], filename, { type: fileType });

      // Use Web Share API if available (best for mobile/iOS)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Maralack Generated ${isVideo ? 'Video' : 'Image'}`,
          text: 'Generated via Maralack Cape Flats AI Companion',
        });
        return;
      }

      // Fallback for desktop: standard download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("Save error:", err);
      // Last resort fallback
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = `maralack-gen-${Date.now()}.${isVideo ? 'mp4' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3 mb-2">
          <ImageIcon className="w-8 h-8 text-sa-green" />
          Kaapse Gallery Creator
        </h2>
        <p className="text-slate-500">
          Generate visuals inspired by the Western Cape. Upload a reference photo to guide the style, likeness, and vibe.
        </p>

        {/* Controls */}
        <div className="mt-6 space-y-6">
          
          {/* Prompt Input */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-slate-700">
                Describe your image
              </label>
              <button
                onClick={() => setUseLocation(!useLocation)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                  useLocation 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                }`}
                title="Use Google Search to verify specific locations mentioned in your prompt"
              >
                <MapPin className="w-3 h-3" />
                {useLocation ? 'Location Grounding ON' : 'Use Real Location'}
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={useLocation ? "e.g. A couple walking on the Sea Point Promenade..." : "e.g. A family having a potjiekos on the beach at Strand..."}
              className="w-full p-4 rounded-xl border border-slate-200 focus:border-sa-green focus:ring-1 focus:ring-sa-green outline-none h-24 resize-none placeholder:text-slate-400"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Reference Image Upload */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Reference Image (Optional)
              </label>
              <p className="text-xs text-slate-400 mb-2">Upload a photo to use as a style or likeness reference.</p>
              
              {!referenceImage ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 hover:border-sa-green transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Click to upload image</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              ) : (
                <div className="relative w-full h-32">
                  <img src={referenceImage} alt="Reference" className="w-full h-full object-cover rounded-xl border border-slate-200" />
                  <button 
                    onClick={clearReferenceImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-sa-gold" /> Art Style
              </label>
              <p className="text-xs text-slate-400 mb-2">Choose the aesthetic for your generation.</p>
              
              <div className="grid grid-cols-2 gap-2 h-32 overflow-y-auto pr-1 custom-scrollbar">
                {IMAGE_STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => setImageStyle(style)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left border ${
                      imageStyle === style
                        ? 'bg-sa-green text-white border-sa-green shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-sa-green hover:bg-slate-50'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Settings & Action */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center pt-4 border-t border-slate-100">
             
             <div className="flex flex-col sm:flex-row gap-6">
                 {/* Aspect Ratio */}
                 <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Format:</span>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                       <button
                          onClick={() => setAspectRatio('1:1')}
                          className={`p-2 rounded-md transition-all ${aspectRatio === '1:1' ? 'bg-white text-sa-green shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          title="Square (1:1)"
                       >
                          <Square className="w-5 h-5" />
                       </button>
                       <button
                          onClick={() => setAspectRatio('9:16')}
                          className={`p-2 rounded-md transition-all ${aspectRatio === '9:16' ? 'bg-white text-sa-green shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          title="Portrait (9:16)"
                       >
                          <RectangleVertical className="w-5 h-5" />
                       </button>
                       <button
                          onClick={() => setAspectRatio('16:9')}
                          className={`p-2 rounded-md transition-all ${aspectRatio === '16:9' ? 'bg-white text-sa-green shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          title="Landscape (16:9)"
                       >
                          <RectangleHorizontal className="w-5 h-5" />
                       </button>
                    </div>
                 </div>

                 {/* Quality */}
                 <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Size:</span>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                      {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => setImageSize(size)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            imageSize === size
                              ? 'bg-white text-sa-green shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                 </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                   onClick={handleGenerate}
                   disabled={isLoading || isVideoLoading || !prompt.trim()}
                   className="px-6 py-3 bg-sa-green text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                   {isLoading ? (
                     <>Generating Image <span className="animate-pulse">...</span></>
                   ) : (
                     <>Generate Image <ImageIcon className="w-4 h-4 text-white" /></>
                   )}
                </button>
                <button
                   onClick={async () => {
                      const stylePrompt = imageStyle !== 'None' ? `Style: ${imageStyle}. ${prompt}` : prompt;
                      // Now we run our upgraded video generator with the styled prompt
                      setIsVideoLoading(true);
                      setError(null);
                      setGeneratedVideo(null);
                      setGeneratedImage(null);
                      setVideoStatusMsg('Initiating Veo 3.1 video engine...');

                      try {
                        const operationName = await generateCapeVideo(stylePrompt, referenceImage || null, aspectRatio);
                        
                        const phrases = [
                          "Pre-rendering cinematic vistas...",
                          "Applying Kaapse lighting and atmosphere...",
                          "Assembling motion frames with Veo...",
                          "Interpolating smooth Cape Flats animations...",
                          "Polishing high-fidelity camera angles...",
                          "Vibe-checking the final details..."
                        ];
                        
                        let phraseIndex = 0;
                        const phraseInterval = setInterval(() => {
                          setVideoStatusMsg(phrases[phraseIndex % phrases.length]);
                          phraseIndex++;
                        }, 5000);

                        // Start Polling
                        let isDone = false;
                        let attempts = 0;
                        const maxAttempts = 60; // 5 minutes total

                        while (!isDone && attempts < maxAttempts) {
                          attempts++;
                          await new Promise((resolve) => setTimeout(resolve, 5000));
                          
                          const status = await getVideoStatus(operationName);
                          if (status.done) {
                            isDone = true;
                            clearInterval(phraseInterval);
                            setVideoStatusMsg('Downloading video data...');
                            
                            if (status.error) {
                               throw new Error(status.error.message || "Veo failed to generate video");
                            }

                            const videoUrl = await downloadVideo(operationName);
                            setGeneratedVideo(videoUrl);
                          }
                        }

                        if (!isDone) {
                          clearInterval(phraseInterval);
                          throw new Error("Video generation timed out. Please try again.");
                        }

                      } catch (err: any) {
                        console.error(err);
                        setError(err.message || "Failed to generate video with Veo. Please try again.");
                      } finally {
                        setIsVideoLoading(false);
                        setVideoStatusMsg('');
                      }
                   }}
                   disabled={isLoading || isVideoLoading || !prompt.trim()}
                   className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:from-orange-700 hover:to-amber-700 transition-all active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                   {isVideoLoading ? (
                     <>Generating Video <span className="animate-pulse">...</span></>
                   ) : (
                     <>Generate Video <Video className="w-4 h-4 text-amber-200" /></>
                   )}
                </button>
             </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* Result Display */}
      <div className="space-y-8">
        {/* Image Result */}
        <div className="flex justify-center w-full">
          {isVideoLoading ? (
              <div className={`w-full max-w-lg bg-orange-50/45 rounded-2xl flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-orange-200 p-6 ${
                aspectRatio === '16:9' ? 'aspect-video w-full' : aspectRatio === '9:16' ? 'max-w-sm aspect-[9/16]' : 'max-w-md aspect-square'
              }`}>
                <div className="relative mb-4">
                  <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin flex items-center justify-center">
                    <Video className="w-6 h-6 text-orange-600 animate-pulse" />
                  </div>
                </div>
                <p className="font-bold text-orange-850 animate-pulse text-center">{videoStatusMsg || "Brewing scene with Veo..."}</p>
                <p className="mt-2 text-xs text-slate-400 text-center uppercase tracking-wider font-semibold">Video generation normally takes 30-45 seconds</p>
              </div>
          ) : isLoading ? (
              <div className={`w-full max-w-lg bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 ${
                aspectRatio === '16:9' ? 'aspect-video w-full' : aspectRatio === '9:16' ? 'max-w-sm aspect-[9/16]' : 'max-w-md aspect-square'
              }`}>
                <div className="relative mb-4">
                  <div className="w-16 h-16 border-4 border-sa-green/20 border-t-sa-green rounded-full animate-spin flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-sa-green animate-pulse" />
                  </div>
                </div>
                <p className="font-medium animate-pulse text-center">Dreaming up a {imageStyle} scene {useLocation ? 'at your location' : ''}...</p>
              </div>
          ) : generatedVideo ? (
              <div className="w-full max-w-2xl space-y-4 animate-in zoom-in-95 duration-500">
                <div className={`relative group rounded-2xl overflow-hidden shadow-2xl border-4 border-white mx-auto ${
                    aspectRatio === '16:9' ? 'aspect-video w-full' : aspectRatio === '9:16' ? 'max-w-sm aspect-[9/16]' : 'max-w-lg aspect-square'
                }`}>
                    <video 
                      src={generatedVideo} 
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {/* Desktop Hover Overlay */}
                    <div className="absolute top-4 right-4 z-10 hidden md:block">
                      <button 
                        onClick={handleDownload}
                        className="p-3 bg-white hover:bg-slate-100 text-slate-900 rounded-full font-bold shadow-xl flex items-center gap-2 transition-transform hover:scale-105"
                        title="Download Video"
                      >
                        <Download className="w-5 h-5 text-orange-600" />
                      </button>
                    </div>
                </div>

                {/* Mobile/Accessible Save Button */}
                <div className="flex flex-col items-center gap-3">
                  <button 
                    onClick={handleDownload}
                    className="w-full max-w-sm py-4 bg-white border-2 border-slate-200 text-slate-950 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 active:bg-slate-50 transition-colors"
                  >
                    <Download className="w-5 h-5 text-orange-600" /> Save Video
                  </button>
                  <p className="text-center text-sm text-slate-500 italic">
                      "{prompt}" — Cinematic Veo Video ({imageStyle})
                  </p>
                </div>
              </div>
          ) : generatedImage ? (
              <div className="w-full max-w-2xl space-y-4 animate-in zoom-in-95 duration-500">
                <div className={`relative group rounded-2xl overflow-hidden shadow-2xl border-4 border-white mx-auto ${
                    aspectRatio === '16:9' ? 'aspect-video w-full' : aspectRatio === '9:16' ? 'max-w-sm aspect-[9/16]' : 'max-w-lg aspect-square'
                }`}>
                    <img 
                      src={generatedImage} 
                      alt="Generated output" 
                      className="w-full h-full object-cover"
                    />
                    {/* Desktop Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center">
                      <button 
                        onClick={handleDownload}
                        className="px-6 py-3 bg-white text-slate-900 rounded-full font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" /> Save Image
                      </button>
                    </div>
                </div>

                {/* Mobile/Accessible Save Button */}
                <div className="flex flex-col items-center gap-3">
                  <button 
                    onClick={handleDownload}
                    className="md:hidden w-full max-w-sm py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 active:bg-slate-50 transition-colors"
                  >
                    <Download className="w-5 h-5" /> Save Image
                  </button>
                  <p className="text-center text-sm text-slate-400 italic">
                      "{prompt}" — {imageStyle}
                  </p>
                  <p className="md:hidden text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
                    Tip: Long press image if download fails
                  </p>
                </div>
              </div>
          ) : (
              <div className="w-full max-w-lg aspect-square bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                <ImageIcon className="w-16 h-16 opacity-20 mb-2" />
                <p>Your creation will appear here</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenMode;