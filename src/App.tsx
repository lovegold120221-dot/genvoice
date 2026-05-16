/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioStreamPlayer, pcmToBase64 } from './lib/audio';
import { initAuth, googleSignIn, logout, db } from './lib/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import React, { useState, useRef, useEffect } from 'react';

import { LoginScreen } from './components/LoginScreen';
import { VatValidator } from './components/VatValidator';

const toolPrompts: Record<string, string> = {
  'tasks': 'Can you show my pending tasks?',
  'calendar': 'What does my schedule look like today?',
  'doc': 'Generate a business proposal document for a new client.',
  'google': 'Run a quick Google search on recent tech news.',
  'presentation': 'Generate a presentation template for the Q3 review.',
  'company': 'Look up the company registration details for Acme Corp.',
  'form': 'Create an employee onboarding form.',
  'gmail': 'Check my inbox for unread emails from the team.',
  'report': 'Generate a weekly operations report.',
  'legal': 'Draft a non-disclosure agreement.',
  'web': 'Generate an interactive dashboard artifact.',
  'letter': 'Draft a formal business letter to our partners.',
  'finance': 'Generate an expense financial report.',
  'certificate': 'Create a certificate of achievement.',
  'meeting': 'Generate meeting minutes based on our recent discussion.',
  'tracker': 'Create an interactive project task tracker.'
};

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActiveState, setIsMicActiveState] = useState(false);
  const isMicActiveRef = useRef(false);

  const setIsMicActive = (active: boolean) => {
    isMicActiveRef.current = active;
    setIsMicActiveState(active);
  };
  const isMicActive = isMicActiveState;
  const [showVatModal, setShowVatModal] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string, type: string, data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  
  // Auth state
  const [needsAuth, setNeedsAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Persona Settings
  const [language, setLanguage] = useState('English');
  const [personaName, setPersonaName] = useState('Beatrice');
  const [userName, setUserName] = useState('');
  const [backgroundPersona, setBackgroundPersona] = useState('');
  const [voiceName, setVoiceName] = useState('Aoede');

  // Filler Settings
  const [silentFillersEnabled, setSilentFillersEnabled] = useState(true);
  const lastInteractionTimeRef = useRef<number>(Date.now());
  const fillerCooldownMs = 30000;
  const silenceFillerDelayMs = 12000;
  const lastFillerTimeRef = useRef<number>(0);

  // Chat State
  const [messages, setMessages] = useState<{ id: string, role: 'user' | 'ai', text: string, isStreaming?: boolean }[]>([
    { id: 'init-1', role: 'ai', text: 'Hello! I am connected.. Ready to automate a task?' },
    { id: 'init-2', role: 'ai', text: "Hey Boss! I'm Beatrice. Tap a skill above to see me in action!" }
  ]);

  const activeInputIdRef = useRef<string | null>(null);
  const activeOutputIdRef = useRef<string | null>(null);

  // Overlays
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<{type: string, title: string, content?: string} | null>(null);

  // Video State
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<'camera' | 'screen'>('camera');
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoIntervalRef = useRef<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<AudioStreamPlayer | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isAudioPlaying = useRef(false);
  const [isVisualizerActive, setIsVisualizerActive] = useState(false);

  // Infinite Scroll Refs
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setNeedsAuth(false);
        setUser(user);
        setToken(token);
        // Load user persona settings
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.language) setLanguage(data.language);
            if (data.personaName) setPersonaName(data.personaName);
            if (data.userName) setUserName(data.userName);
            if (data.backgroundPersona) setBackgroundPersona(data.backgroundPersona);
            if (data.voiceName) setVoiceName(data.voiceName);
          }
        } catch (err) {
          console.error("Failed to load user profile:", err);
        }
      },
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  const savePersonaConfig = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        language,
        personaName,
        userName,
        backgroundPersona,
        voiceName
      }, { merge: true });
      alert("Settings saved successfully!");
    } catch(err) {
      console.error(err);
      alert("Failed to save settings.");
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const connectLiveAPI = async () => {
    if (isConnected) return; 

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const queryParams = new URLSearchParams();
      if (token) queryParams.append('token', token);
      if (language) queryParams.append('language', language);
      if (personaName) queryParams.append('personaName', personaName);
      if (userName) queryParams.append('userName', userName);
      if (backgroundPersona) queryParams.append('backgroundPersona', backgroundPersona);
      if (voiceName) queryParams.append('voiceName', voiceName);
      
      const queryString = queryParams.toString();
      const wsUrl = `${protocol}://${window.location.host}/live${queryString ? `?${queryString}` : ''}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      audioPlayerRef.current = new AudioStreamPlayer();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      recordingCtxRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN && isMicActiveRef.current) {
          const channelData = e.inputBuffer.getChannelData(0);
          const base64 = pcmToBase64(channelData);
          ws.send(JSON.stringify({ audio: base64 }));

          // Calculate volume for visualizer
          let sum = 0;
          for (let i = 0; i < channelData.length; i++) {
            sum += channelData[i] * channelData[i];
          }
          const rms = Math.sqrt(sum / channelData.length);
          const micVisualizer = document.getElementById('mic-visualizer');
          if (micVisualizer) {
            if (rms > 0.01) {
              micVisualizer.classList.add('active');
            } else {
              micVisualizer.classList.remove('active');
            }
          }
        }
      };

      ws.onopen = () => {
        setIsConnected(true);
        setIsMicActive(true);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio) {
          audioPlayerRef.current?.playChunk(msg.audio);
          setIsVisualizerActive(true);
          // Set visualizer back to false when we think it's done playing (basic timeout)
          clearTimeout((window as any).visualizerTimeout);
          (window as any).visualizerTimeout = setTimeout(() => {
            setIsVisualizerActive(false);
          }, 500);
        }
        if (msg.interrupted) {
          audioPlayerRef.current?.clearQueue();
          activeOutputIdRef.current = null;
        }
        if (msg.artifact) {
          setMessages(prev => [...prev, { id: 'artifact-' + Date.now(), role: 'ai', text: `✨ Generated ${msg.artifact.type}: ${msg.artifact.title}` }]);
          setActiveArtifact({ type: msg.artifact.type, title: msg.artifact.title, content: msg.artifact.content });
          setActiveOverlay('overlay-artifact');
          handleScrollToBottom();
        }
        if (msg.showTasks) {
          setTasksList(msg.tasks || []);
          setActiveOverlay('overlay-tasks');
        }
        if (msg.inputTranscription !== undefined) {
          if (!activeInputIdRef.current) {
            audioPlayerRef.current?.clearQueue();
            const id = 'input-' + Date.now() + '-' + Math.random();
            activeInputIdRef.current = id;
            setMessages(prev => [...prev, { id, role: 'user', text: msg.inputTranscription, isStreaming: !msg.isFinal }]);
          } else {
            setMessages(prev => prev.map(m => m.id === activeInputIdRef.current ? { ...m, text: m.text + msg.inputTranscription, isStreaming: !msg.isFinal } : m));
          }
          if (msg.isFinal) {
            activeInputIdRef.current = null;
          }
          handleScrollToBottom();
        }
        if (msg.outputTranscription !== undefined) {
          if (!activeOutputIdRef.current) {
            audioPlayerRef.current?.clearQueue();
            const id = 'output-' + Date.now() + '-' + Math.random();
            activeOutputIdRef.current = id;
            setMessages(prev => [...prev, { id, role: 'ai', text: msg.outputTranscription, isStreaming: !msg.isFinal }]);
          } else {
            setMessages(prev => prev.map(m => m.id === activeOutputIdRef.current ? { ...m, text: m.text + msg.outputTranscription, isStreaming: !msg.isFinal } : m));
          }
          if (msg.isFinal) {
            activeOutputIdRef.current = null;
          }
          handleScrollToBottom();
        }
      };

      ws.onclose = () => {
        cleanupConnection();
      };

      ws.onerror = () => {
        cleanupConnection();
      };
    } catch (err) {
      console.error('Failed to connect', err);
      cleanupConnection();
    }
  };

  const cleanupConnection = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (recordingCtxRef.current) {
      recordingCtxRef.current.close();
      recordingCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.close();
      audioPlayerRef.current = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      setVideoStream(null);
    }
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    setIsConnected(false);
    setIsMicActive(false);
    setIsVisualizerActive(false);
  };

  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, []);

  // Infinite Scroll Hook Logic
  useEffect(() => {
    const initInfiniteScroll = (rowElement: HTMLDivElement | null) => {
      if (!rowElement) return;
      const track = rowElement.querySelector('.skills-track') as HTMLDivElement;
      if (!track || track.dataset.initialized) return;
      track.dataset.initialized = "true";
      
      const originalChips = Array.from(track.children);
      const numOriginal = originalChips.length;

      for (let i = 0; i < 8; i++) {
        originalChips.forEach(chip => track.appendChild(chip.cloneNode(true)));
      }

      let setWidth = 0;
      const updateWidth = () => {
        const firstItem = track.children[0] as HTMLElement;
        const firstCloneItem = track.children[numOriginal] as HTMLElement;
        if (firstItem && firstCloneItem) {
          setWidth = firstCloneItem.offsetLeft - firstItem.offsetLeft;
        }
      };

      setTimeout(() => {
        updateWidth();
        rowElement.scrollLeft = (setWidth * 3) - 16;
      }, 100);

      const resizeObserver = new ResizeObserver(() => updateWidth());
      resizeObserver.observe(track);

      let isScrolling = false;
      const scrollHandler = () => {
        if (!isScrolling && setWidth > 0) {
          window.requestAnimationFrame(() => {
            if (rowElement.scrollLeft < setWidth * 1.5) {
              rowElement.scrollLeft += (setWidth * 3);
            } else if (rowElement.scrollLeft > setWidth * 5.5) {
              rowElement.scrollLeft -= (setWidth * 3);
            }
            isScrolling = false;
          });
          isScrolling = true;
        }
      };
      rowElement.addEventListener('scroll', scrollHandler);
      return () => {
        resizeObserver.disconnect();
        rowElement.removeEventListener('scroll', scrollHandler);
      };
    };

    const cleanup1 = initInfiniteScroll(row1Ref.current);
    const cleanup2 = initInfiniteScroll(row2Ref.current);

    return () => {
      cleanup1?.();
      cleanup2?.();
    };
  }, [needsAuth]); // re-run if auth state changes so refs are available


  const handleScrollToBottom = () => {
    setTimeout(() => {
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTo({ top: chatAreaRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 50);
  };

  useEffect(() => {
    handleScrollToBottom();
    const finalMessages = messages.filter(m => !m.isStreaming);
    localStorage.setItem("conversation_history", JSON.stringify(finalMessages.slice(-100)));
    lastInteractionTimeRef.current = Date.now();
  }, [messages]);

  const isSafeFiller = (text: string) => {
    const blockedTerms = [
      "password", "ssh password", "token", "secret key",
      "private key", "credit card", "bank account"
    ];
    const lower = text.toLowerCase();
    if (!text.toLowerCase().startsWith("do you have any idea")) return false;
    if (text.length > 180) return false;
    return !blockedTerms.some(term => lower.includes(term));
  };

  const wasRecentlyUsedFiller = (text: string) => {
    const fillers = JSON.parse(localStorage.getItem("recent_fillers") || "[]");
    return fillers.some((item: any) => item.text === text);
  };

  const saveRecentFiller = (text: string) => {
    const fillers = JSON.parse(localStorage.getItem("recent_fillers") || "[]");
    fillers.push({ text, timestamp: Date.now() });
    localStorage.setItem("recent_fillers", JSON.stringify(fillers.slice(-20)));
  };

  const speakAssistantText = async (text: string) => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceName })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`TTS failed: ${errText}`);
      }
      const data = await response.json();
      if (data.audio) {
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new AudioStreamPlayer();
        }
        audioPlayerRef.current.clearQueue();
        audioPlayerRef.current.playChunk(data.audio);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const startVideo = async (mode: 'camera' | 'screen') => {
    try {
      let currentStream = videoStream;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      let stream: MediaStream;
      if (mode === 'camera') {
         stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      } else {
         stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      }
      setVideoStream(stream);
      setCameraMode(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActiveOverlay('overlay-camera');
      
      // Send frames periodically
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = window.setInterval(sendVideoFrame, 2000); // 1 frame every 2 seconds
    } catch (err) {
      console.error(err);
      alert('Could not start ' + mode + ': ' + String(err));
    }
  };

  const stopVideo = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
  };

  const sendVideoFrame = () => {
     if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
     if (!videoRef.current) return;
     
     const canvas = document.createElement('canvas');
     const vw = videoRef.current.videoWidth;
     const vh = videoRef.current.videoHeight;
     if (!vw || !vh) return;
     
     // Scale down to max 640px to save bandwidth
     const scale = Math.min(640 / vw, 640 / vh, 1);
     canvas.width = vw * scale;
     canvas.height = vh * scale;
     
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
     ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
     const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
     wsRef.current.send(JSON.stringify({ file: { type: 'image/jpeg', data: base64 } }));
  };

  const triggerSilentFiller = async () => {
    const now = Date.now();
    if (!isConnected) return;
    if (activeInputIdRef.current || activeOutputIdRef.current) return;
    
    if (now - lastFillerTimeRef.current < fillerCooldownMs) return;

    lastFillerTimeRef.current = now;
    lastInteractionTimeRef.current = now;

    let fillerText = "Do you have any idea how AI agents decide which tool to use?";
    try {
      const history = JSON.parse(localStorage.getItem("conversation_history") || "[]");
      const recentHistory = history.slice(-30);
      
      if (recentHistory.length > 0) {
        const response = await fetch("/api/fillers/dynamic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recentHistory,
            style: "short_trivia_question",
            maxLength: 120
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result && result.text) fillerText = result.text;
        }
      }
    } catch(err) {
      console.error(err);
    }

    if (!isSafeFiller(fillerText)) {
      fillerText = "Do you have any idea how a complex task is broken down into simple steps?";
    }

    if (wasRecentlyUsedFiller(fillerText)) {
      fillerText = "Do you have any idea why automation systems need a command queue?";
    }

    saveRecentFiller(fillerText);
    
    setMessages(prev => [...prev, { id: 'filler-' + Date.now(), role: 'ai', text: fillerText }]);
    speakAssistantText(fillerText);
  };

  useEffect(() => {
    if (!silentFillersEnabled) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (isConnected && !activeInputIdRef.current && !activeOutputIdRef.current) {
        if (now - lastInteractionTimeRef.current > silenceFillerDelayMs) {
          triggerSilentFiller();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isConnected, silentFillersEnabled]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      setAttachedFile({
        name: file.name,
        type: file.type,
        data: base64Data
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = (overrideText?: string, toolId?: string) => {
    const textToSend = overrideText || inputValue.trim();
    if (!textToSend && !attachedFile) return;

    // Append user message
    audioPlayerRef.current?.clearQueue();
    setMessages(prev => [...prev, { id: 'text-' + Date.now() + '-' + Math.random(), role: 'user', text: textToSend || 'Sent a file' }]);
    
    if (wsRef.current && isConnected) {
      const payload: any = {};
      if (textToSend) {
        payload.text = textToSend;
      }
      if (attachedFile) {
        payload.file = attachedFile;
      }
      wsRef.current.send(JSON.stringify(payload));
    } else {
      // Offline fallback visualization
      setTimeout(() => {
        setIsVisualizerActive(true);
        setMessages(prev => [...prev, { id: 'offline-' + Date.now() + '-' + Math.random(), role: 'ai', text: 'I am processing your request now. (Offline)' }]);
        setTimeout(() => setIsVisualizerActive(false), 2000);
      }, 600);
    }
    
    setInputValue('');
    setAttachedFile(null);
    handleScrollToBottom();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSkillClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const chip = target.closest('.skill-chip');
    if (!chip) return;

    const toolId = chip.getAttribute('data-skill');
    if (!toolId) return;

    if (toolId === 'history' || toolId === 'tools') {
      setActiveOverlay('overlay-' + toolId);
    } else if (toolId === 'company') { // Our VAT validator
      setShowVatModal(true);
    } else if (toolPrompts[toolId]) {
      handleSend(toolPrompts[toolId], toolId);
    }
  };

  if (needsAuth) {
    return <LoginScreen onLogin={handleLogin} isLoggingIn={isLoggingIn} />;
  }

  return (
    <div id="app" className="flex flex-col h-[100dvh] w-full relative">
      <div className="bg-wavy-gradient pointer-events-none"></div>

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="ai-name">Eburon AI</span>
          <div id="speaker-visualizer" className={`audio-visualizer inline ${isVisualizerActive ? 'active' : ''}`}>
            <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
          </div>
        </div>
        <div className="header-right">
          {!isConnected ? (
            <button id="connect-button" className="connect-btn" onClick={connectLiveAPI}>
              <i className="ph-fill ph-plug"></i> <span>Connect</span>
            </button>
          ) : (
            <button className="connect-btn connected" onClick={cleanupConnection}>
              <i className="ph-fill ph-plugs"></i> <span>Disconnect</span>
            </button>
          )}
        </div>
      </header>

      {/* Skills Rail */}
      <div id="skills-rail" onClick={handleSkillClick}>
        <div className="skills-row" data-row="1" ref={row1Ref}>
          <div className="skills-track">
            <div className="skill-chip" data-skill="tasks">
              <div className="skill-glyph bg-tasks"><i className="ph-duotone ph-list-checks"></i></div>
              <span className="skill-label">Tasks</span>
            </div>
            <div className="skill-chip" data-skill="calendar">
              <div className="skill-glyph bg-calendar"><i className="ph-duotone ph-calendar-dots"></i></div>
              <span className="skill-label">Calendar</span>
            </div>
            <div className="skill-chip" data-skill="doc">
              <div className="skill-glyph bg-drive"><i className="ph-duotone ph-file-text"></i></div>
              <span className="skill-label">Proposal</span>
            </div>
            <div className="skill-chip" data-skill="presentation">
              <div className="skill-glyph bg-slides"><i className="ph-duotone ph-presentation-chart"></i></div>
              <span className="skill-label">Slides</span>
            </div>
            <div className="skill-chip" data-skill="form">
              <div className="skill-glyph bg-sign"><i className="ph-duotone ph-list-dashes"></i></div>
              <span className="skill-label">Form</span>
            </div>
            <div className="skill-chip" data-skill="company">
              <div className="skill-glyph bg-company"><i className="ph-duotone ph-buildings"></i></div>
              <span className="skill-label">Company</span>
            </div>
            <div className="skill-chip" data-skill="letter">
              <div className="skill-glyph bg-proposal"><i className="ph-duotone ph-envelope-open"></i></div>
              <span className="skill-label">Letter</span>
            </div>
            <div className="skill-chip" data-skill="finance">
              <div className="skill-glyph bg-drive"><i className="ph-duotone ph-money"></i></div>
              <span className="skill-label">Finance</span>
            </div>
          </div>
        </div>

        <div className="skills-row" data-row="2" ref={row2Ref}>
          <div className="skills-track">
            <div className="skill-chip" data-skill="tools">
              <div className="skill-glyph bg-tools"><i className="ph-duotone ph-wrench"></i></div>
              <span className="skill-label">Tools</span>
            </div>
            <div className="skill-chip" data-skill="report">
              <div className="skill-glyph bg-proposal"><i className="ph-duotone ph-chart-bar"></i></div>
              <span className="skill-label">Report</span>
            </div>
            <div className="skill-chip" data-skill="legal">
              <div className="skill-glyph bg-sign"><i className="ph-duotone ph-scales"></i></div>
              <span className="skill-label">Legal</span>
            </div>
            <div className="skill-chip" data-skill="gmail">
              <div className="skill-glyph bg-mail"><i className="ph-duotone ph-envelope-simple"></i></div>
              <span className="skill-label">Mail</span>
            </div>
            <div className="skill-chip" data-skill="web">
              <div className="skill-glyph bg-sheets"><i className="ph-duotone ph-browser"></i></div>
              <span className="skill-label">Dashboard</span>
            </div>
            <div className="skill-chip" data-skill="certificate">
              <div className="skill-glyph bg-history"><i className="ph-duotone ph-certificate"></i></div>
              <span className="skill-label">Certificate</span>
            </div>
            <div className="skill-chip" data-skill="meeting">
              <div className="skill-glyph bg-calendar"><i className="ph-duotone ph-users-three"></i></div>
              <span className="skill-label">Meeting</span>
            </div>
            <div className="skill-chip" data-skill="tracker">
              <div className="skill-glyph bg-tasks"><i className="ph-duotone ph-kanban"></i></div>
              <span className="skill-label">Tracker</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Stream */}
      <main id="text-streaming-area" ref={chatAreaRef}>
        <div id="conversation-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`conversation-message ${msg.role}`}>
              {msg.text}
              {msg.isStreaming && <span className="opacity-50 inline-block ml-1 animate-pulse">...</span>}
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Dock */}
      <div className="bottom-dock">
        {attachedFile && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between bg-[var(--color-bg-chip)] border border-[var(--color-border-color)] px-3 py-1.5 rounded-lg w-fit text-xs text-white">
              <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              <button 
                className="ml-2 text-red-400 hover:text-red-300 bg-transparent border-none"
                onClick={() => setAttachedFile(null)}
              >
                <i className="ph ph-x"></i>
              </button>
            </div>
          </div>
        )}
        <div className="input-wrapper">
          <div className="input-bar">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>
              <i className="ph ph-paperclip"></i>
            </button>
            <input 
              type="text" 
              id="message-input" 
              placeholder="Message or ask Beatrice..." 
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                setTimeout(() => {
                  window.scrollTo(0, 0);
                  if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
                }, 300);
              }}
            />
            <button id="send-button" className="send-btn" onClick={() => handleSend()}>
              <i className="ph-fill ph-paper-plane-right"></i>
            </button>
          </div>
        </div>

        <nav className="nav-controls relative">
          <button className="nav-item opacity-70 hover:opacity-100 transition-opacity" onClick={() => setActiveOverlay('overlay-profile')}>
            <i className="ph ph-user"></i> <span>Profile</span>
          </button>
          <button className="nav-item opacity-70 hover:opacity-100 transition-opacity" onClick={() => startVideo('camera')}>
            <i className="ph ph-video-camera"></i> <span>Camera</span>
          </button>
          <div className="nav-item-mic-container">
            <button className="nav-item-mic relative" onClick={() => setIsMicActive(!isMicActive)} style={{ backgroundColor: isMicActive && isConnected ? 'var(--color-accent-primary)' : 'var(--color-bg-chip)' }}>
              <i className={`ph-fill ph-microphone${!isMicActive ? '-slash' : ''}`}></i>
              {isMicActive && isConnected && (
                <div id="mic-visualizer" className="audio-visualizer mic-vis absolute -top-8 left-1/2 -translate-x-1/2">
                  <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
                </div>
              )}
            </button>
            <span className="mic-label">Mic</span>
          </div>
          <button className="nav-item opacity-70 hover:opacity-100 transition-opacity" onClick={() => setActiveOverlay('overlay-tasks')}>
            <i className="ph ph-list-checks"></i> <span>Tasks</span>
          </button>
          <button className="nav-item opacity-70 hover:opacity-100 transition-opacity" onClick={() => setActiveOverlay('overlay-settings')}>
            <i className="ph ph-gear"></i> <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* OVERLAYS */}
      <div id="overlay-camera" className={`full-page-overlay ${activeOverlay === 'overlay-camera' ? 'active' : ''}`} style={{ backgroundColor: '#000', zIndex: 60 }}>
        <div className="overlay-header bg-black/50 border-b border-white/10 text-white backdrop-blur-md absolute top-0 left-0 right-0 z-10 w-full" style={{ padding: '16px' }}>
          <div className="overlay-title flex items-center gap-2">
            <i className={`ph-fill ${cameraMode === 'screen' ? 'ph-screencast' : 'ph-video-camera'} text-accent`}></i>
            <span>{cameraMode === 'screen' ? 'Screen Share' : 'Camera'} Active</span>
          </div>
          <button className="close-overlay-btn text-white" onClick={() => { setActiveOverlay(null); stopVideo(); }}><i className="ph ph-x"></i></button>
        </div>
        <div className="flex flex-col h-full w-full relative pt-16 pb-20">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-contain bg-black"
          />
          {/* Audio visualizer for AI over video */}
          {isVisualizerActive && (
             <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 rounded-full py-4 px-6 backdrop-blur-md shadow-2xl border border-white/10 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <i className="ph-fill ph-robot text-accent text-xl"></i>
                 </div>
                 <div className="audio-visualizer active inline m-0 origin-left">
                   <div className="bar bg-white h-8 mx-0.5"></div><div className="bar bg-white h-12 mx-0.5" style={{animationDelay: '-0.2s'}}></div><div className="bar bg-white h-6 mx-0.5" style={{animationDelay: '-0.4s'}}></div><div className="bar bg-white h-10 mx-0.5" style={{animationDelay: '-0.6s'}}></div>
                 </div>
             </div>
          )}
          {!isConnected && (
             <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/80 rounded-full py-2 px-6 backdrop-blur-md shadow-2xl border border-white/10 text-white font-medium text-sm text-center">
                 AI is disconnected.<br />Connect to share video.
             </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center gap-6 pb-4 pt-4">
           {/* Camera Button */}
           <button 
             className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${cameraMode === 'camera' ? 'bg-accent text-white scale-110 shadow-lg shadow-accent/20' : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'}`}
             onClick={() => startVideo('camera')}
             title="Share Camera"
           >
             <i className="ph-fill ph-video-camera text-2xl"></i>
           </button>
           {/* Screen Share Button */}
           <button 
             className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${cameraMode === 'screen' ? 'bg-accent text-white scale-110 shadow-lg shadow-accent/20' : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'}`}
             onClick={() => startVideo('screen')}
             title="Share Screen"
           >
             <i className="ph-fill ph-screencast text-2xl"></i>
           </button>
        </div>
      </div>

      <div id="overlay-profile" className={`full-page-overlay ${activeOverlay === 'overlay-profile' ? 'active' : ''}`}>
        <div className="overlay-header">
          <div className="overlay-title">User Profile</div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph ph-x"></i></button>
        </div>
        <div className="overlay-content">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src={user?.photoURL || "https://ui-avatars.com/api/?name=User&background=545eff&color=fff&size=100"} style={{ borderRadius: '50%', marginBottom: '12px', display: 'inline-block', width: '100px', height: '100px' }} alt="Profile" />
            <h2 style={{ fontSize: '20px' }}>{user?.displayName || "Chief Executive"}</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{user?.email || "admin@eburon.ai"}</p>
          </div>

          <div className="mb-6 space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Language</label>
              <select 
                className="w-full bg-[var(--color-bg-chip)] border border-[var(--color-border-color)] rounded-lg px-3 py-2 text-white outline-none"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Voice</label>
              <select 
                className="w-full bg-[var(--color-bg-chip)] border border-[var(--color-border-color)] rounded-lg px-3 py-2 text-white outline-none"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
              >
                <option value="Aoede">Aoede (Natural Female)</option>
                <option value="Puck">Puck (Friendly Male)</option>
                <option value="Charon">Charon (Deep Male)</option>
                <option value="Fenrir">Fenrir (Natural Male)</option>
                <option value="Kore">Kore (Soft Female)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">AI Persona Name</label>
              <input 
                type="text"
                className="w-full bg-[var(--color-bg-chip)] border border-[var(--color-border-color)] rounded-lg px-3 py-2 text-white outline-none"
                placeholder="e.g. Beatrice"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">How should the AI call you?</label>
              <input 
                type="text"
                className="w-full bg-[var(--color-bg-chip)] border border-[var(--color-border-color)] rounded-lg px-3 py-2 text-white outline-none"
                placeholder="e.g. Boss, Captain, John"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Background Persona</label>
              <textarea 
                className="w-full bg-[var(--color-bg-chip)] border border-[var(--color-border-color)] rounded-lg px-3 py-2 text-white outline-none h-24 resize-none"
                placeholder="Give the AI a backstory or specific personality trait..."
                value={backgroundPersona}
                onChange={(e) => setBackgroundPersona(e.target.value)}
              ></textarea>
              <p className="text-xs text-[var(--color-text-muted)] mt-2 italic">Note: Disconnect and reconnect to apply persona changes.</p>
            </div>
          </div>

          <button className="list-item w-full bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 mb-4" onClick={savePersonaConfig}>
            <i className="ph ph-floppy-disk list-item-icon text-accent"></i>
            <div className="list-item-content text-left">
              <div className="list-item-title text-accent -mb-0.5" style={{ color: 'var(--color-accent-primary)' }}>Save Configuration</div>
              <div className="list-item-desc text-accent/80" style={{ color: 'var(--color-accent-primary)' }}>Update your persona profile</div>
            </div>
          </button>

          <button className="list-item w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20" onClick={async () => {
            await logout();
            setNeedsAuth(true);
            setActiveOverlay(null);
          }}>
            <i className="ph ph-sign-out list-item-icon text-red-500"></i>
            <div className="list-item-content text-left">
              <div className="list-item-title text-red-500">Sign Out</div>
              <div className="list-item-desc text-red-400">Disconnect your account</div>
            </div>
          </button>
        </div>
      </div>

      <div id="overlay-settings" className={`full-page-overlay ${activeOverlay === 'overlay-settings' ? 'active' : ''}`}>
        <div className="overlay-header">
          <div className="overlay-title">App Settings</div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph ph-x"></i></button>
        </div>
        <div className="overlay-content">
          <div className="list-item">
            <i className="ph ph-user-circle-gear list-item-icon"></i>
            <div className="list-item-content">
              <div className="list-item-title">Persona Settings</div>
              <div className="list-item-desc">Adjust AI tone and behavior</div>
            </div>
          </div>
          <div className="list-item" onClick={() => setSilentFillersEnabled(!silentFillersEnabled)} style={{ cursor: 'pointer' }}>
            <i className={`ph ${silentFillersEnabled ? 'ph-toggle-right text-accent' : 'ph-toggle-left'} list-item-icon`}></i>
            <div className="list-item-content">
              <div className="list-item-title">Silent Fillers</div>
              <div className="list-item-desc">Ask trivia using conversation memory when silent</div>
            </div>
          </div>
          <div className="list-item">
            <i className="ph ph-books list-item-icon"></i>
            <div className="list-item-content">
              <div className="list-item-title">Knowledge Base</div>
              <div className="list-item-desc">Manage uploaded documents</div>
            </div>
          </div>
        </div>
      </div>

      <div id="overlay-tasks" className={`full-page-overlay ${activeOverlay === 'overlay-tasks' ? 'active' : ''}`}>
        <div className="overlay-header">
          <div className="overlay-title">Pending Tasks</div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph ph-x"></i></button>
        </div>
        <div className="overlay-content">
          {tasksList.length === 0 ? (
            <div className="text-center text-[var(--color-text-muted)] mt-10">No pending tasks.</div>
          ) : (
            tasksList.map(task => (
              <div key={task.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                <i className={`ph ${task.status === 'completed' ? 'ph-check-circle text-green-500' : 'ph-circle'} list-item-icon mt-1`}></i>
                <div className="list-item-content flex-1">
                  <div className="list-item-title" style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                    {task.title}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span style={{
                      backgroundColor: task.priority === 'High' ? 'rgba(239,68,68,0.2)' : task.priority === 'Medium' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                      color: task.priority === 'High' ? '#f87171' : task.priority === 'Medium' ? '#fbbf24' : '#60a5fa',
                      padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600
                    }}>
                      {task.priority || 'Normal'} Priority
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div id="overlay-artifact" className={`full-page-overlay ${activeOverlay === 'overlay-artifact' ? 'active' : ''}`} style={{ backgroundColor: 'var(--color-bg-main)', zIndex: 60 }}>
        <div className="overlay-header" style={{ borderBottom: '1px solid var(--color-border-color)' }}>
          <div className="overlay-title flex items-center gap-2">
            <i className="ph-fill ph-browser text-accent"></i>
            <span>Live Server Preview: {activeArtifact?.title || 'Web Artifact'}</span>
          </div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph ph-x"></i></button>
        </div>
        <div style={{ height: 'calc(100vh - 64px)', overflow: 'auto', padding: '20px', backgroundColor: '#f0f0f5', color: '#1a1a1a' }}>
          {activeArtifact?.content ? (
            <div dangerouslySetInnerHTML={{ __html: activeArtifact.content }} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <i className="ph-duotone ph-file-code text-6xl text-gray-400"></i>
              <h2 className="text-xl font-semibold">Simulated Render for {activeArtifact?.type}</h2>
              <p className="text-center max-w-md">
                The artifact <strong>"{activeArtifact?.title}"</strong> has been successfully generated by Eburon AI and deployed to the local preview server.
              </p>
              <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-2xl">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {activeArtifact?.type.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{activeArtifact?.title}</div>
                    <div className="text-xs text-gray-500">Generated just now • {activeArtifact?.type}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-100 rounded w-full"></div>
                  <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div id="overlay-history" className={`full-page-overlay ${activeOverlay === 'overlay-history' ? 'active' : ''}`}>
        <div className="overlay-header">
          <div className="overlay-title">Activity History</div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph ph-x"></i></button>
        </div>
        <div className="overlay-content">
          <div className="list-item">
            <i className="ph ph-file-text list-item-icon"></i>
            <div className="list-item-content">
              <div className="list-item-title">NDA Drafted</div>
              <div className="list-item-desc">Yesterday at 4:30 PM</div>
            </div>
          </div>
          <div className="list-item">
            <i className="ph ph-envelope-open list-item-icon"></i>
            <div className="list-item-content">
              <div className="list-item-title">Inbox Checked</div>
              <div className="list-item-desc">Yesterday at 9:15 AM</div>
            </div>
          </div>
        </div>
      </div>

      <div id="overlay-tools" className={`full-page-overlay ${activeOverlay === 'overlay-tools' ? 'active' : ''}`}>
        <div className="overlay-header">
          <div className="overlay-title">All Tools</div>
          <button className="close-overlay-btn" onClick={() => setActiveOverlay(null)}><i className="ph ph-x"></i></button>
        </div>
        <div className="overlay-content">
          <div className="list-item">
            <i className="ph ph-wrench list-item-icon"></i>
            <div className="list-item-content">
              <div className="list-item-title">Manage Custom Integrations</div>
              <div className="list-item-desc">API connections and webhooks</div>
            </div>
          </div>
        </div>
      </div>

      {showVatModal && <VatValidator onClose={() => setShowVatModal(false)} />}
    </div>
  );
}

