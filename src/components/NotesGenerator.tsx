import React, { useState } from "react";
import { 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Copy,
  Check,
  Mic
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { cn } from "../lib/utils";

const MOCK_TRANSCRIPT = `
Teacher: Good morning class. Today we are going to discuss the laws of thermodynamics.
The first law, also known as Law of Conservation of Energy, states that energy cannot be created or destroyed in an isolated system.
Student A: Does that mean energy just changes form?
Teacher: Exactly. For example, potential energy can become kinetic energy.
The second law states that the entropy of any isolated system always increases.
This means that processes are irreversible and tend towards disorder.
Student B: Is that why my room is always messy?
Teacher: (laughs) Not exactly, but it's a good analogy for entropy.
Finally, the third law states that the entropy of a system approaches a constant value as the temperature approaches absolute zero.
`;

export default function NotesGenerator() {
  const [transcript, setTranscript] = useState(MOCK_TRANSCRIPT);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateNotes = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize the following classroom transcript into structured, bullet-pointed study notes. Focus on key definitions and examples. Use Markdown formatting.
        
        Transcript:
        ${transcript}`,
      });
      setNotes(response.text || "Failed to generate notes.");
    } catch (err) {
      console.error(err);
      setNotes("Error: Could not connect to Gemini AI. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Transcript Input */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Mic size={18} className="text-[#F27D26]" />
            Classroom Transcript
          </h3>
          <button 
            onClick={() => setTranscript("")}
            className="text-[9px] uppercase tracking-widest text-[#8E9299] hover:text-white"
          >
            Clear
          </button>
        </div>
        <div className="relative group">
          <textarea 
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full h-[400px] bg-[#0A0A0A] border border-[#141414] rounded-2xl p-6 text-xs text-[#8E9299] focus:outline-none focus:border-[#F27D26]/30 transition-all resize-none font-mono leading-relaxed"
            placeholder="Paste classroom transcript here..."
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            <button 
              onClick={generateNotes}
              disabled={loading || !transcript}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F27D26] text-black font-bold text-[10px] uppercase tracking-widest transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-[0_4px_20px_rgba(242,125,38,0.2)]",
                loading && "animate-pulse"
              )}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? "Processing..." : "Generate AI Notes"}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Notes */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <FileText size={18} className="text-emerald-500" />
            AI Study Notes
          </h3>
          <div className="flex items-center gap-3">
            <button 
              onClick={copyToClipboard}
              disabled={!notes}
              className="p-1.5 rounded-lg bg-[#141414] border border-[#1A1A1A] text-[#8E9299] hover:text-white transition-colors disabled:opacity-50"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
            <button 
              disabled={!notes}
              className="p-1.5 rounded-lg bg-[#141414] border border-[#1A1A1A] text-[#8E9299] hover:text-white transition-colors disabled:opacity-50"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
        <div className="w-full h-[400px] bg-[#0A0A0A] border border-[#141414] rounded-2xl p-6 overflow-y-auto prose prose-invert prose-xs max-w-none">
          {!notes && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <Sparkles size={48} />
              <p className="mt-4 text-sm uppercase tracking-widest">Awaiting Input...</p>
            </div>
          ) : loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-[#141414] rounded w-3/4" />
              <div className="h-4 bg-[#141414] rounded w-1/2" />
              <div className="h-4 bg-[#141414] rounded w-5/6" />
              <div className="h-4 bg-[#141414] rounded w-2/3" />
              <div className="h-4 bg-[#141414] rounded w-3/4" />
              <div className="h-4 bg-[#141414] rounded w-1/2" />
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-sans text-[#E4E3E0] leading-relaxed">
              {notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
