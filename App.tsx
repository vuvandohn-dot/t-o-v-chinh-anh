
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";

import { Language, Tab, Resolution, PromptMode, HistoryItem } from './types';
import { translations, RESOLUTION_OPTIONS, TRIAL_LIMIT, VALID_LICENSE_KEY } from './constants';
import { MenuIcon, XIcon, DesktopIcon, MobileIcon, CameraIcon, UploadIcon, SparklesIcon, HistoryIcon, AdminIcon, DownloadIcon, TrashIcon } from './components/icons';
import { ImageCompareSlider } from './components/ImageCompareSlider';

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const mimeType = result.split(';')[0].split(':')[1];
            const base64 = result.split(',')[1];
            resolve({ base64, mimeType });
        };
        reader.onerror = error => reject(error);
    });
};

const App: React.FC = () => {
    // STATE MANAGEMENT
    const [language, setLanguage] = useState<Language>(Language.EN);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>(Tab.CREATIVE);
    
    // Core App State
    const [trialCount, setTrialCount] = useState<number>(TRIAL_LIMIT);
    const [isLicensed, setIsLicensed] = useState(false);
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [licenseKeyInput, setLicenseKeyInput] = useState("");
    const [licenseError, setLicenseError] = useState("");
    const [licenseSuccess, setLicenseSuccess] = useState(false);
    
    // Creative Tab State
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [uploadedImageType, setUploadedImageType] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");
    const [promptMode, setPromptMode] = useState<PromptMode>(PromptMode.SINGLE);
    const [resolution, setResolution] = useState<Resolution>(Resolution.FOUR_K);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedResults, setGeneratedResults] = useState<{ original: string; generated: string; }[]>([]);
    
    // History State
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);

    const t = useMemo(() => translations[language], [language]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // PERSISTENCE EFFECT (using localStorage)
    useEffect(() => {
        const savedTrialCount = localStorage.getItem('trialCount');
        const savedIsLicensed = localStorage.getItem('isLicensed');
        const savedHistory = localStorage.getItem('history');
        const savedLang = localStorage.getItem('language');

        if (savedTrialCount !== null) setTrialCount(JSON.parse(savedTrialCount));
        if (savedIsLicensed === 'true') setIsLicensed(true);
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        if (savedLang) setLanguage(savedLang as Language);
    }, []);

    useEffect(() => {
        localStorage.setItem('trialCount', JSON.stringify(trialCount));
        localStorage.setItem('isLicensed', JSON.stringify(isLicensed));
        localStorage.setItem('history', JSON.stringify(history));
        localStorage.setItem('language', language);
    }, [trialCount, isLicensed, history, language]);

    // UI Effects
    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isGenerationDisabled = (!isLicensed && trialCount <= 0);

    // HANDLERS
    const handleImageUpload = async (file: File) => {
        if (!file) return;
        try {
            const { base64 } = await fileToBase64(file);
            setUploadedImage(`data:${file.type};base64,${base64}`);
            setUploadedImageType(file.type);
        } catch (err) {
            console.error("Error converting file to base64:", err);
            setError("Failed to load image.");
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleImageUpload(e.target.files[0]);
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    };

    const handleGenerateClick = async () => {
        if (isGenerationDisabled) {
            setShowLicenseModal(true);
            return;
        }
        if (!uploadedImage || !prompt.trim()) {
            setError("Please upload an image and enter a prompt.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedResults([]);

        const prompts = promptMode === PromptMode.BATCH ? prompt.split('\n').filter(p => p.trim() !== '') : [prompt];

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const imageBase64 = uploadedImage.split(',')[1];
            
            const results = [];
            for (const p of prompts) {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: {
                        parts: [
                            { inlineData: { data: imageBase64, mimeType: uploadedImageType || 'image/jpeg' } },
                            { text: `Edit this photo. Follow this instruction: ${p}. CRITICAL: The face of the person in the original image MUST be preserved perfectly. Do not change the face. Output an ultra-realistic, photo-quality image with ${resolution} sharpness, HDR lighting, natural skin texture, and detailed eyes/hair.` },
                        ],
                    },
                    config: {
                        responseModalities: [Modality.IMAGE, Modality.TEXT],
                    },
                });
                
                const imagePart = response.candidates?.[0]?.content.parts.find(part => part.inlineData);
                if (imagePart?.inlineData) {
                    const newImageBase64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    const newHistoryItem: HistoryItem = {
                        id: new Date().toISOString(),
                        prompt: p,
                        timestamp: Date.now(),
                        originalImage: uploadedImage,
                        generatedImage: newImageBase64,
                        resolution,
                    };
                    setHistory(prev => [newHistoryItem, ...prev]);
                    results.push({ original: uploadedImage, generated: newImageBase64 });
                } else {
                     throw new Error("AI did not return an image. Please try a different prompt.");
                }
            }

            setGeneratedResults(results);

            if (!isLicensed) {
                setTrialCount(prev => Math.max(0, prev - prompts.length));
            }
        } catch (err: any) {
            console.error("Gemini API error:", err);
            setError(err.message || "An error occurred during generation. Please check your API key and prompt.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleActivateLicense = () => {
        if (licenseKeyInput === VALID_LICENSE_KEY) {
            setLicenseError("");
            setLicenseSuccess(true);
            setTimeout(() => {
                setIsLicensed(true);
                setShowLicenseModal(false);
                setLicenseSuccess(false);
            }, 1500);
        } else {
            setLicenseError(t.invalidLicense);
        }
    };
    
    const downloadImage = (url: string, filename: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleClearHistory = () => {
        if (window.confirm("Are you sure you want to clear all history? This cannot be undone.")) {
            setHistory([]);
        }
    };

    const handleDeleteHistoryItem = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    };


    const renderSidebar = (isMobile: boolean) => (
        <aside className={`absolute md:relative top-0 left-0 h-full bg-gray-900 bg-opacity-80 backdrop-blur-md z-40 transition-transform duration-300 ease-in-out ${isMobile ? (isSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'w-64 flex-shrink-0'}`}>
            <div className="flex justify-between items-center p-4 border-b border-cyan-500/20">
                 <h1 className="text-2xl font-orbitron text-cyan-300">CyberEdit AI</h1>
                 {isMobile && (
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                 )}
            </div>
            <nav className="p-4 space-y-2">
                {[
                    { id: Tab.CREATIVE, label: t.creative, icon: <SparklesIcon className="w-5 h-5 mr-3"/> },
                    { id: Tab.HISTORY, label: t.history, icon: <HistoryIcon className="w-5 h-5 mr-3"/> },
                    { id: Tab.ADMIN, label: t.admin, icon: <AdminIcon className="w-5 h-5 mr-3"/> },
                ].map(item => (
                    <a
                        key={item.id}
                        href="#"
                        onClick={(e) => { e.preventDefault(); setActiveTab(item.id); isMobile && setIsSidebarOpen(false); }}
                        className={`flex items-center px-4 py-2 rounded-lg text-lg transition-all duration-200 ${activeTab === item.id ? 'bg-cyan-500 text-gray-900 shadow-[0_0_15px_rgba(56,189,248,0.5)]' : 'text-gray-300 hover:bg-gray-700 hover:text-cyan-300'}`}
                    >
                        {item.icon}
                        {item.label}
                    </a>
                ))}
            </nav>
        </aside>
    );

    const renderHeader = () => (
        <header className="p-4 bg-gray-900/50 backdrop-blur-sm flex justify-between items-center border-b border-pink-500/20 md:border-none">
            <div className="flex items-center">
                {isMobileView && (
                    <button onClick={() => setIsSidebarOpen(true)} className="text-gray-300 mr-4">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                )}
                 {!isMobileView && <h1 className="text-2xl font-orbitron text-cyan-300">CyberEdit AI</h1>}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-300">
                {!isLicensed && (
                    <div className="px-3 py-1 border border-pink-500 rounded-full">
                        {t.trialUsesRemaining}: <span className="font-bold text-pink-400">{trialCount}/{TRIAL_LIMIT}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-full">
                    <button onClick={() => setIsMobileView(false)} className={`p-1.5 rounded-full transition-colors ${!isMobileView ? 'bg-cyan-500 text-gray-900' : 'hover:bg-gray-700'}`}><DesktopIcon className="w-5 h-5"/></button>
                    <button onClick={() => setIsMobileView(true)} className={`p-1.5 rounded-full transition-colors ${isMobileView ? 'bg-cyan-500 text-gray-900' : 'hover:bg-gray-700'}`}><MobileIcon className="w-5 h-5"/></button>
                </div>
                <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-full font-bold">
                    <button onClick={() => setLanguage(Language.EN)} className={`px-3 py-1 rounded-full text-xs transition-colors ${language === Language.EN ? 'bg-pink-500 text-white' : 'hover:bg-gray-700'}`}>EN</button>
                    <button onClick={() => setLanguage(Language.VI)} className={`px-3 py-1 rounded-full text-xs transition-colors ${language === Language.VI ? 'bg-pink-500 text-white' : 'hover:bg-gray-700'}`}>VI</button>
                </div>
            </div>
        </header>
    );
    
    const renderCreativeTab = () => (
        <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side: Controls */}
            <div className="flex flex-col gap-6">
                {/* Upload Section */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/30">
                    <h2 className="text-xl font-bold text-cyan-300 mb-4">{t.uploadSection}</h2>
                    {isMobileView ? (
                        <div className="flex gap-4">
                            <button className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition-all shadow-[0_0_10px_rgba(56,189,248,0.4)] hover:shadow-[0_0_15px_rgba(56,189,248,0.6)]" onClick={() => alert('Camera not implemented in this demo.')}>
                                <CameraIcon className="w-5 h-5"/> {t.takePhoto}
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 px-4 rounded transition-all shadow-[0_0_10px_rgba(219,39,119,0.4)] hover:shadow-[0_0_15px_rgba(219,39,119,0.6)]" onClick={() => fileInputRef.current?.click()}>
                                <UploadIcon className="w-5 h-5"/> {t.uploadFromGallery}
                            </button>
                        </div>
                    ) : (
                        <div 
                            onDrop={handleDrop} 
                            onDragOver={(e) => e.preventDefault()} 
                            className="border-2 border-dashed border-gray-600 hover:border-cyan-400 rounded-lg p-10 text-center cursor-pointer transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UploadIcon className="w-12 h-12 mx-auto text-gray-500"/>
                            <p className="mt-2 text-gray-400">{t.dragDrop}</p>
                        </div>
                    )}
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    {uploadedImage && (
                        <div className="mt-4">
                            <img src={uploadedImage} alt="Uploaded preview" className="max-h-40 mx-auto rounded-lg" />
                        </div>
                    )}
                </div>

                {/* Prompt Section */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/30">
                    <h2 className="text-xl font-bold text-cyan-300 mb-4">{t.promptSection}</h2>
                    <div className="flex bg-gray-800 rounded-lg p-1 mb-4">
                        <button onClick={() => setPromptMode(PromptMode.SINGLE)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${promptMode === PromptMode.SINGLE ? 'bg-cyan-500 text-gray-900' : 'text-gray-300 hover:bg-gray-700'}`}>{t.singlePrompt}</button>
                        <button onClick={() => setPromptMode(PromptMode.BATCH)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${promptMode === PromptMode.BATCH ? 'bg-pink-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>{t.batchPrompt}</button>
                    </div>
                    {promptMode === PromptMode.SINGLE ? (
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t.promptPlaceholder}
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none"
                        />
                    ) : (
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t.batchPromptPlaceholder}
                            rows={5}
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none"
                        />
                    )}
                </div>

                {/* Resolution and Generate */}
                <div className="bg-gray-900/50 p-6 rounded-lg border border-cyan-500/30">
                    <label className="block text-xl font-bold text-cyan-300 mb-4">{t.resolution}</label>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {RESOLUTION_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => setResolution(opt.value)} className={`p-3 text-center rounded-lg border-2 transition-all ${resolution === opt.value ? 'bg-cyan-500 border-cyan-500 text-gray-900 font-bold shadow-[0_0_10px_rgba(56,189,248,0.5)]' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-cyan-400'}`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={handleGenerateClick}
                        disabled={isLoading || isGenerationDisabled}
                        className={`w-full py-4 px-4 text-xl font-orbitron rounded-lg transition-all duration-300 flex items-center justify-center
                        ${isLoading ? 'bg-gray-600 cursor-not-allowed' : ''}
                        ${isGenerationDisabled ? 'bg-red-800 hover:bg-red-700 text-gray-300 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-gradient-to-r from-cyan-500 to-pink-500 text-white hover:scale-105 shadow-[0_0_20px_rgba(56,189,248,0.6)] hover:shadow-[0_0_30px_rgba(219,39,119,0.6)]'}`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t.generating}
                            </>
                        ) : t.generate}
                    </button>
                    {isGenerationDisabled && <p className="text-red-400 text-center mt-2 text-sm">{t.trialExpired}</p>}
                </div>
            </div>

            {/* Right Side: Results */}
            <div className="bg-gray-900/50 p-6 rounded-lg border border-pink-500/30">
                <h2 className="text-xl font-bold text-pink-300 mb-4">{t.results}</h2>
                {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-lg mb-4">{error}</div>}
                
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-400"></div>
                        <p className="mt-4 text-cyan-300">{t.generating}</p>
                    </div>
                )}
                
                {!isLoading && generatedResults.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                        {generatedResults.map((result, index) => (
                            <div key={index} className="relative group cursor-pointer" onClick={() => setSelectedHistoryItem({ ...history[0], generatedImage: result.generated, originalImage: result.original })}>
                                <img src={result.generated} alt={`Generated result ${index + 1}`} className="w-full h-auto rounded-lg object-cover aspect-square"/>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white font-bold">View Details</p>
                                </div>
                            </div>
                        ))}
                        </div>
                        <button onClick={() => alert("Zip download not implemented")} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded transition-all shadow-[0_0_10px_rgba(22,163,74,0.4)]">
                            <DownloadIcon className="w-5 h-5"/>
                            {t.downloadAll}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderHistoryTab = () => (
         <div className="p-4 md:p-8 text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-orbitron text-cyan-300">{t.history}</h2>
                {history.length > 0 && (
                    <button onClick={handleClearHistory} className="flex items-center gap-2 bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-all shadow-[0_0_10px_rgba(153,27,27,0.4)]">
                        <TrashIcon className="w-5 h-5"/>
                        {t.clearAll}
                    </button>
                )}
            </div>
            {history.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-gray-400 text-xl">{t.noHistory}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {history.map(item => (
                        <div key={item.id} className="bg-gray-900/50 rounded-lg overflow-hidden border border-cyan-500/20 group relative">
                            <img src={item.generatedImage} alt={item.prompt} className="w-full h-40 object-cover cursor-pointer" onClick={() => setSelectedHistoryItem(item)} />
                            <div className="p-3">
                                <p className="text-sm text-gray-300 truncate" title={item.prompt}>{item.prompt}</p>
                                <p className="text-xs text-gray-500 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                            </div>
                            <button onClick={() => handleDeleteHistoryItem(item.id)} className="absolute top-2 right-2 p-1.5 bg-red-900/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
    
    const renderAdminTab = () => (
        <div className="p-4 md:p-8 text-white">
            <h2 className="text-3xl font-orbitron text-cyan-300 mb-6">{t.admin} Dashboard</h2>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-pink-500/30 text-center">
                <h3 className="text-xl text-pink-400 mb-2">Feature Mockup</h3>
                <p className="text-gray-400">
                    This is a non-functional UI mockup of the Admin Dashboard. A real implementation would require a secure backend server, database, and authentication system to manage users and license keys.
                </p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-bold text-cyan-300">Overview</h4>
                        <p className="text-sm text-gray-400 mt-1">View usage statistics.</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-bold text-cyan-300">Generate Key</h4>
                        <p className="text-sm text-gray-400 mt-1">Create new license keys.</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-bold text-cyan-300">Manage Keys</h4>
                        <p className="text-sm text-gray-400 mt-1">Revoke, extend, or delete keys.</p>
                    </div>
                     <div className="bg-gray-800 p-4 rounded-lg">
                        <h4 className="font-bold text-cyan-300">User Logs</h4>
                        <p className="text-sm text-gray-400 mt-1">Track user activity.</p>
                    </div>
                </div>
            </div>
        </div>
    );
    
    // RENDER
    return (
        <div className={`min-h-screen bg-gray-900 text-white bg-fixed bg-cover bg-center`} style={{backgroundImage: 'url("https://picsum.photos/seed/cyber/1920/1080")'}}>
            <div className="min-h-screen bg-black/80 backdrop-blur-sm">
                <div className={`flex h-screen transition-all duration-300 ${isMobileView ? 'flex-col' : 'flex-row'}`}>
                    {renderSidebar(isMobileView)}
                    {isMobileView && isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden"></div>}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {renderHeader()}
                        <main className="flex-1 overflow-y-auto">
                            {activeTab === Tab.CREATIVE && renderCreativeTab()}
                            {activeTab === Tab.HISTORY && renderHistoryTab()}
                            {activeTab === Tab.ADMIN && renderAdminTab()}
                        </main>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showLicenseModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-pink-500/50 rounded-lg p-8 w-full max-w-md shadow-2xl shadow-pink-500/20">
                        <h2 className="text-2xl font-bold text-pink-400 mb-2">{t.enterLicense}</h2>
                        <p className="text-gray-400 mb-6">{isGenerationDisabled ? t.trialExpired : ''}</p>
                        
                        {licenseSuccess ? (
                             <div className="text-center p-4 bg-green-900/50 border border-green-500 text-green-300 rounded-lg">
                                {t.activated}
                            </div>
                        ) : (
                            <>
                                <input 
                                    type="text"
                                    placeholder={t.licenseKey}
                                    value={licenseKeyInput}
                                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 mb-4 focus:ring-2 focus:ring-pink-400 outline-none"
                                />
                                {licenseError && <p className="text-red-400 text-sm mb-4">{licenseError}</p>}
                                <div className="flex gap-4">
                                    <button onClick={() => {setShowLicenseModal(false); setLicenseError("");}} className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-colors">{t.cancel}</button>
                                    <button onClick={handleActivateLicense} className="flex-1 py-2 px-4 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg transition-colors">{t.activate}</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            
            {selectedHistoryItem && (
                 <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setSelectedHistoryItem(null)}>
                    <div className="bg-gray-900 border border-cyan-500/50 rounded-lg p-6 w-full max-w-4xl shadow-2xl shadow-cyan-500/20 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedHistoryItem(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-cyan-500 text-gray-900 rounded-full flex items-center justify-center z-10"><XIcon className="w-5 h-5"/></button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <ImageCompareSlider beforeImage={selectedHistoryItem.originalImage} afterImage={selectedHistoryItem.generatedImage} beforeLabel={t.before} afterLabel={t.after}/>
                            <div className="flex flex-col gap-4">
                                 <div>
                                    <h4 className="font-bold text-cyan-300">Prompt</h4>
                                    <p className="text-gray-300 bg-gray-800 p-2 rounded-md mt-1 text-sm">{selectedHistoryItem.prompt}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-cyan-300">Details</h4>
                                    <p className="text-gray-400 text-sm mt-1">Resolution: {selectedHistoryItem.resolution}</p>
                                    <p className="text-gray-400 text-sm">Date: {new Date(selectedHistoryItem.timestamp).toLocaleString()}</p>
                                </div>
                                <button onClick={() => downloadImage(selectedHistoryItem.generatedImage, `cyberedit-${selectedHistoryItem.id}.png`)} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded transition-all shadow-[0_0_10px_rgba(22,163,74,0.4)]">
                                    <DownloadIcon className="w-5 h-5"/>
                                    {t.downloadSelected}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
