import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Type, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Send, 
  Download, 
  Loader2, 
  Check, 
  CreditCard, 
  Building2,
  Landmark,
  Wallet,
  Sparkles,
  Zap,
  Brain,
  Cpu,
  Wrench,
  Crown,
  User as UserIcon,
  X,
  History as HistoryIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings,
  Copy,
  CheckCheck,
  Info,
  Mic,
  Volume2,
  Monitor,
  Smartphone,
  Clock,
  CheckCircle2,
  XCircle,
  Maximize,
  LogOut,
  LogIn,
  FileText,
  Upload,
  FileUp,
  Wand2,
  Eraser,
  Scissors,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Folder,
  FolderPlus,
  MoreVertical,
  Plus,
  Languages,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { TRANSLATIONS, Language } from './constants/translations';
import { cn } from './lib/utils';
import { GEMINI_MODELS, ModelInfo } from './constants/models';
import { 
  generateText, 
  generateImage, 
  generateVideo, 
  generateMusic, 
  generateSpeech,
  analyzeDocument,
  analyzeImage,
  editImage,
  GenerationType, 
  GenerationResult 
} from './lib/gemini';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, getDocs, deleteDoc } from 'firebase/firestore';

// Types
type Plan = 'free' | 'text_only' | 'basic' | 'medium' | 'advance';

declare global {
  interface Window {
    snap: any;
  }
}

interface SubscriptionPlan {
  id: Plan;
  name: string;
  price: number;
  features: string[];
  icon: React.ReactNode;
  color: string;
  dailyLimit: number;
}

interface Project {
  id: string;
  uid: string;
  name: string;
  description?: string;
  createdAt: any;
}

interface Prompt {
  id: string;
  uid: string;
  title: string;
  content: string;
  category?: string;
  type: GenerationType | 'all';
  createdAt: any;
}

const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['Text & Image (Flash)', 'Standard Quality'],
    icon: <UserIcon className="w-6 h-6" />,
    color: 'bg-slate-100 text-slate-600',
    dailyLimit: 5
  },
  {
    id: 'text_only',
    name: 'Text Only',
    price: 5,
    features: ['Unlimited Text Generation', 'No Image/Video/Audio'],
    icon: <Type className="w-6 h-6" />,
    color: 'bg-emerald-100 text-emerald-600',
    dailyLimit: Infinity
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 25,
    features: ['Text & Image Generation', 'High Quality'],
    icon: <Sparkles className="w-6 h-6" />,
    color: 'bg-blue-100 text-blue-600',
    dailyLimit: 20
  },
  {
    id: 'medium',
    name: 'Medium',
    price: 50,
    features: ['Text, Image & Video', '4K Resolution'],
    icon: <Zap className="w-6 h-6" />,
    color: 'bg-purple-100 text-purple-600',
    dailyLimit: 100
  },
  {
    id: 'advance',
    name: 'Advance',
    price: 100,
    features: ['All Features (Music & Speech)', 'API Access'],
    icon: <Crown className="w-6 h-6" />,
    color: 'bg-amber-100 text-amber-600',
    dailyLimit: Infinity
  }
];

const MAX_PROMPT_LENGTH = 2000;
const IMAGE_STYLES = [
  { id: 'none', label: 'None' },
  { id: 'photorealistic', label: 'Photorealistic' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'oil-painting', label: 'Oil Painting' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'pixel-art', label: 'Pixel Art' },
  { id: 'anime', label: 'Anime' },
  { id: '3d-render', label: '3D Render' },
  { id: 'vintage', label: 'Vintage' }
];
const MUSIC_GENRES = [
  { id: 'Ambient', description: 'Calm, atmospheric, and unobtrusive sounds.' },
  { id: 'Cinematic', description: 'Epic, orchestral, and dramatic scores.' },
  { id: 'Lo-fi', description: 'Chilled, relaxed, and low-fidelity beats.' },
  { id: 'Electronic', description: 'Modern, synthesized, and rhythmic tracks.' },
  { id: 'Pop', description: 'Catchy, upbeat, and mainstream melodies.' },
  { id: 'Rock', description: 'Energetic, guitar-driven, and powerful anthems.' },
  { id: 'Jazz', description: 'Sophisticated, improvisational, and smooth rhythms.' },
  { id: 'Classical', description: 'Timeless, orchestral, and intricate compositions.' },
  { id: 'Hip Hop', description: 'Rhythmic, beat-heavy, and urban-inspired tracks.' },
  { id: 'Country', description: 'Acoustic, storytelling, and folk-inspired music.' },
  { id: 'R&B', description: 'Soulful, rhythmic, and smooth vocal-driven tracks.' },
  { id: 'Soul', description: 'Emotional, deep, and expressive vocal music.' }
];
const VOICE_OPTIONS = [
  { id: 'Puck', label: 'Puck', description: 'Energetic, youthful, and vibrant male voice. Great for excitement.' },
  { id: 'Charon', label: 'Charon', description: 'Deep, calm, and authoritative male voice. Ideal for narrations.' },
  { id: 'Kore', label: 'Kore', description: 'Clear, professional, and friendly female voice. Perfect for assistants.' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Warm, mature, and resonant male voice. Good for storytelling.' },
  { id: 'Zephyr', label: 'Zephyr', description: 'Soft, soothing, and airy female voice. Excellent for meditation.' }
];

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      if (this.state.error) {
        try {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
        } catch (e) {
          errorMessage = this.state.error.message || String(this.state.error);
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Application Error</h2>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const GenerationLoader = ({ type, status }: { type: GenerationType; status: string }) => {
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  useEffect(() => {
    // Estimated times in seconds
    const times: Record<GenerationType, number> = {
      text: 5,
      image: 15,
      video: 60,
      music: 45,
      speech: 10,
      document: 20,
      vision: 10,
      edit: 20
    };
    
    const totalTime = times[type];
    setEstimatedTime(totalTime);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // Cap at 95% until finished
        const increment = (100 / (totalTime * 10)); // 10 ticks per second
        return Math.min(prev + increment, 95);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [type]);

  const getIcon = () => {
    switch (type) {
      case 'text': return <Type className="w-8 h-8 text-blue-500" />;
      case 'image': return <ImageIcon className="w-8 h-8 text-green-500" />;
      case 'video': return <Video className="w-8 h-8 text-purple-500" />;
      case 'music': return <Music className="w-8 h-8 text-amber-500" />;
      case 'speech': return <Mic className="w-8 h-8 text-rose-500" />;
      case 'document': return <FileText className="w-8 h-8 text-indigo-500" />;
      default: return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
    }
  };

  const getAnimation = () => {
    switch (type) {
      case 'document':
        return (
          <motion.div
            animate={{ 
              y: [0, -5, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-12 bg-indigo-50 border-2 border-indigo-200 rounded flex items-center justify-center">
              <div className="w-6 h-0.5 bg-indigo-200 mb-1" />
              <div className="w-6 h-0.5 bg-indigo-200" />
            </div>
          </motion.div>
        );
      case 'text':
        return (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
            ))}
          </div>
        );
      case 'image':
        return (
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative"
          >
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
            <ImageIcon className="w-10 h-10 text-green-500 relative z-10" />
          </motion.div>
        );
      case 'video':
        return (
          <div className="relative w-16 h-10 bg-slate-100 rounded-lg overflow-hidden border-2 border-purple-200">
            <motion.div
              animate={{ x: [-20, 60] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 bottom-0 w-4 bg-purple-500/30 skew-x-12"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        );
      case 'music':
        return (
          <div className="flex items-end gap-1 h-8">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{ height: [4, 24, 8, 20, 4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                className="w-1.5 bg-amber-500 rounded-full"
              />
            ))}
          </div>
        );
      case 'speech':
        return (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center"
          >
            <Volume2 className="w-6 h-6 text-rose-500" />
          </motion.div>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex flex-col items-center space-y-6"
    >
      <div className="relative flex items-center justify-center w-20 h-20">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="4"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray="226.19"
            animate={{ strokeDashoffset: 226.19 * (1 - progress / 100) }}
            className={cn(
              type === 'text' ? 'text-blue-500' :
              type === 'image' ? 'text-green-500' :
              type === 'video' ? 'text-purple-500' :
              type === 'music' ? 'text-amber-500' : 
              type === 'document' ? 'text-indigo-500' : 'text-rose-500'
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {getIcon()}
        </div>
      </div>

      <div className="text-center space-y-2">
        <h4 className="text-lg font-black text-slate-900 capitalize">
          {type === 'document' ? 'Analyzing Document' : `Generating ${type}`}
        </h4>
        <p className="text-sm font-medium text-slate-500">{status}</p>
      </div>

      <div className="w-full space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${progress}%` }}
            className={cn(
              "h-full rounded-full",
              type === 'text' ? 'bg-blue-500' :
              type === 'image' ? 'bg-green-500' :
              type === 'video' ? 'bg-purple-500' :
              type === 'music' ? 'bg-amber-500' :
              type === 'document' ? 'bg-indigo-500' : 'bg-rose-500'
            )}
          />
        </div>
        <div className="flex items-center justify-center gap-2 text-[10px] font-medium text-slate-400">
          <Clock className="w-3 h-3" />
          <span>Estimated time: ~{estimatedTime}s</span>
        </div>
      </div>

      <div className="pt-2">
        {getAnimation()}
      </div>
    </motion.div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [language, setLanguage] = useState<Language>('id');
  
  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && TRANSLATIONS[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  const t = TRANSLATIONS[language];
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [input, setInput] = useState('');
  const [activeType, setActiveType] = useState<GenerationType>('text');
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>('16:9');
  const [videoResolution, setVideoResolution] = useState<string>('720p');
  const [musicDuration, setMusicDuration] = useState<number>(30);
  const [selectedGenre, setSelectedGenre] = useState<string>('Ambient');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [selectedImageStyle, setSelectedImageStyle] = useState<string>('none');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('1:1');
  const [selectedImageSize, setSelectedImageSize] = useState<string>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [showSubscription, setShowSubscription] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan>('free');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'midtrans' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [usageCount, setUsageCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMask, setSelectedMask] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GenerationResult[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [showUnsubscribeConfirm, setShowUnsubscribeConfirm] = useState(false);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [selectedModels, setSelectedModels] = useState<Record<GenerationType, string>>({
    text: 'gemini-3-flash-preview',
    image: 'gemini-3.1-flash-image-preview',
    video: 'veo-3.1-lite-generate-preview',
    music: 'lyria-3-clip-preview',
    speech: 'gemini-3.1-flash-tts-preview',
    document: 'gemini-3-flash-preview',
    vision: 'gemini-3-flash-preview',
    edit: 'gemini-3.1-flash-image-preview'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'models' | 'keys' | 'language'>('models');
  const [userApiKeys, setUserApiKeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('user_api_keys');
      return saved ? JSON.parse(saved) : { gemini: '', openai: '', anthropic: '' };
    } catch {
      return { gemini: '', openai: '', anthropic: '' };
    }
  });

  useEffect(() => {
    localStorage.setItem('user_api_keys', JSON.stringify(userApiKeys));
  }, [userApiKeys]);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isDeliverySameAsBilling, setIsDeliverySameAsBilling] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [editingResult, setEditingResult] = useState<GenerationResult | null>(null);
  const [videoFilters, setVideoFilters] = useState({
    grayscale: 0,
    sepia: 0,
    blur: 0,
    brightness: 100,
    contrast: 100
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [isMenuMinimized, setIsMenuMinimized] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState('');
  const [promptFilter, setPromptFilter] = useState<GenerationType | 'all'>('all');
  const [promptToSave, setPromptToSave] = useState<string | null>(null);
  const [promptTypeToSave, setPromptTypeToSave] = useState<GenerationType | 'all'>('all');
  const [firebaseReady, setFirebaseReady] = useState(false);

  const resultsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Midtrans Snap script dynamically
    const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'SET_CLIENT_KEY_HERE';
    const scriptUrl = isProduction 
      ? 'https://app.midtrans.com/snap/snap.js' 
      : 'https://app.sandbox.midtrans.com/snap/snap.js';

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);

      if (firebaseUser) {
        // Wait until the Firebase SDK has fully synchronized the auth state to the currentUser singleton
        // This is critical on some custom domains and browsers where the callback fires but the singleton isn't yet set.
        let attempts = 0;
        while ((!auth.currentUser || auth.currentUser.uid !== firebaseUser.uid) && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!auth.currentUser || auth.currentUser.uid !== firebaseUser.uid) {
          console.error('Firebase Auth state synchronization failed after 5s. Firestore operations might fail.');
        }

        // Sync user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial sync
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            // Create initial user profile
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              plan: 'free',
              usageCount: 0,
              role: 'user',
              apiKeys: { gemini: '', openai: '', anthropic: '' },
              lastUsageDate: new Date().toDateString(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            setCurrentPlan('free');
            setUsageCount(0);
          } else {
            const userData = userDoc.data();
            const today = new Date().toDateString();
            
            if (userData.lastUsageDate !== today) {
              await updateDoc(userDocRef, {
                usageCount: 0,
                lastUsageDate: today
              });
              setUsageCount(0);
            } else {
              setUsageCount(userData.usageCount || 0);
            }
            setCurrentPlan(userData.plan || 'free');
            setUserApiKeys({
              gemini: '',
              openai: '',
              anthropic: '',
              ...(userData.apiKeys || {})
            });
          }
          setFirebaseReady(true);
        } catch (error) {
          console.error('Error during Firebase user sync:', error);
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          } else {
            console.error('Firestore access failed because auth context is missing on custom domain.');
          }
          setFirebaseReady(true);
        }

        // Real-time listener for plan/usage/apiKeys updates
        let unsubscribeUser: () => void = () => {};
        
        if (auth.currentUser) {
          unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              setCurrentPlan(data.plan || 'free');
              setUsageCount(data.usageCount || 0);
              if (data.apiKeys) {
                setUserApiKeys(prev => ({
                  ...prev,
                  ...data.apiKeys
                }));
              }
            }
          }, (error) => {
            // Only report permission errors after we are certain the token should be valid
            if (auth.currentUser) {
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            } else {
              console.warn('User profile snapshot failed: Auth context lost or not yet ready.');
            }
          });
        }

        return () => {
          unsubscribeUser();
        };
      } else {
        // Reset state on logout
        setCurrentPlan('free');
        setUsageCount(0);
        setHistory([]);
        setFirebaseReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    let historyQuery;
    if (currentProjectId === 'all') {
      historyQuery = query(
        collection(db, 'generations'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      historyQuery = query(
        collection(db, 'generations'),
        where('uid', '==', user.uid),
        where('projectId', '==', currentProjectId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as any[];
      setHistory(historyData);
    }, (error) => {
      // If index is missing, it might fail. We should handle it gracefully.
      console.warn("History query failed, possibly missing index:", error);
      // Fallback to client-side filtering if needed, but for now just log
    });

    return () => unsubscribe();
  }, [user, currentProjectId]);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    const q = query(
      collection(db, 'projects'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubscribe();
  }, [user]);

  const createProject = async () => {
    if (!user || !newProjectName.trim()) return;

    try {
      await addDoc(collection(db, 'projects'), {
        uid: user.uid,
        name: newProjectName.trim(),
        createdAt: serverTimestamp()
      });
      setNewProjectName('');
      setIsCreatingProject(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this project? Generations inside will not be deleted but will lose their project association.")) return;

    try {
      await deleteDoc(doc(db, 'projects', projectId));
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
    }
  };

  const moveToProject = async (result: GenerationResult, projectId: string | null) => {
    if (!user || !result.id) return;

    try {
      const genRef = doc(db, 'generations', result.id);
      await updateDoc(genRef, {
        projectId: projectId
      });
      
      // Update local state
      setResults(prev => prev.map(r => r.id === result.id ? { ...r, projectId: projectId } : r));
      setHistory(prev => prev.map(r => r.id === result.id ? { ...r, projectId: projectId } : r));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `generations/${result.id}`);
    }
  };

  useEffect(() => {
    if (!user) {
      setPrompts([]);
      return;
    }

    const q = query(
      collection(db, 'prompts'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const promptsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Prompt[];
      setPrompts(promptsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'prompts');
    });

    return () => unsubscribe();
  }, [user]);

  const savePrompt = async () => {
    if (!user || !promptToSave || !newPromptTitle.trim()) return;

    setIsSavingPrompt(true);
    try {
      await addDoc(collection(db, 'prompts'), {
        uid: user.uid,
        title: newPromptTitle.trim(),
        content: promptToSave,
        category: newPromptCategory.trim() || 'General',
        type: promptTypeToSave,
        createdAt: serverTimestamp()
      });
      setNewPromptTitle('');
      setNewPromptCategory('');
      setPromptToSave(null);
      setStatusMessage('Prompt saved to library!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prompts');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const deletePrompt = async (promptId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
      await deleteDoc(doc(db, 'prompts', promptId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `prompts/${promptId}`);
    }
  };

  const usePrompt = (prompt: Prompt) => {
    setInput(prompt.content);
    if (prompt.type !== 'all') {
      setActiveType(prompt.type as GenerationType);
    }
    setShowPromptLibrary(false);
  };

  const togglePublic = async (result: GenerationResult) => {
    if (!user || !result.id) return;
    
    const newIsPublic = !result.isPublic;
    try {
      const genRef = doc(db, 'generations', result.id);
      await updateDoc(genRef, {
        isPublic: newIsPublic,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || ''
      });
      
      // Update local state
      setResults(prev => prev.map(r => r.id === result.id ? { ...r, isPublic: newIsPublic } : r));
      setHistory(prev => prev.map(r => r.id === result.id ? { ...r, isPublic: newIsPublic } : r));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `generations/${result.id}`);
    }
  };

  const fetchGallery = async () => {
    setIsGalleryLoading(true);
    try {
      const q = query(
        collection(db, 'generations'),
        where('isPublic', '==', true),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GenerationResult));
      setGalleryItems(items);
    } catch (error) {
      console.error("Failed to fetch gallery:", error);
    } finally {
      setIsGalleryLoading(false);
    }
  };

  useEffect(() => {
    if (showGallery) {
      fetchGallery();
    }
  }, [showGallery]);

  const saveToHistory = async (result: GenerationResult) => {
    if (!user) return null;

    try {
      // Clean undefined values from the payload to avoid Firestore errors
      const payload: any = {
        ...result,
        uid: user.uid,
        createdAt: serverTimestamp(),
        isPublic: false,
        projectId: currentProjectId === 'all' ? null : currentProjectId
      };

      // Firestore does not allow 'undefined' as a value
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      const docRef = await addDoc(collection(db, 'generations'), payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'generations');
      return null;
    }
  };

  const clearHistory = async () => {
    // For simplicity, we'll just clear the local state if needed, 
    // but usually we'd delete documents. Security rules allow delete.
    // Here we'll just show a message or implement batch delete if requested.
    alert("History clearing is currently manual. You can delete individual items if implemented.");
  };

  const incrementUsage = async () => {
    if (!user) return;
    const newCount = usageCount + 1;
    setUsageCount(newCount);
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        usageCount: newCount
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [results]);

  const fetchTransactionHistory = async () => {
    if (!user) return;
    setIsTransactionsLoading(true);
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(historyData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (showTransactionHistory) {
      fetchTransactionHistory();
    }
  }, [showTransactionHistory]);

  const copyPrompt = (prompt: string, id: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReadAloud = async (text: string, id: string) => {
    if (currentPlan !== 'advance') {
      alert('Read Aloud feature requires an Advance plan.');
      setShowSubscription(true);
      return;
    }
    
    setReadingId(id);
    try {
      const audioUrl = await generateSpeech(text, selectedVoice, selectedModels.speech, userApiKeys.gemini);
      const audio = new Audio(audioUrl);
      audio.onended = () => setReadingId(null);
      audio.play();
    } catch (error) {
      console.error(error);
      alert('Failed to read aloud.');
      setReadingId(null);
    }
  };

  const saveApiKeys = async () => {
    if (!user) return;
    setIsSavingKeys(true);
    
    // Trim keys before saving
    const trimmedKeys = {
      gemini: userApiKeys.gemini?.trim() || '',
      openai: userApiKeys.openai?.trim() || '',
      anthropic: userApiKeys.anthropic?.trim() || ''
    };

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        apiKeys: trimmedKeys
      });
      setUserApiKeys(trimmedKeys);
      setStatusMessage('API keys saved successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSavingKeys(false);
    }
  };

  const validateApiKey = async (provider: string, key: string) => {
    if (!key) return;
    setIsValidatingKey(provider as any);
    setValidationStatus(prev => ({ ...prev, [provider]: null }));
    
    try {
      // Use the server-side proxy to bypass CORS for all providers and ensure strict validation
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, key: key.trim() })
      });

      if (response.ok) {
        setValidationStatus(prev => ({ ...prev, [provider]: 'success' }));
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `${provider} key validation failed`);
      }
    } catch (error: any) {
      console.error(`Validation failed for ${provider}:`, error);
      setValidationStatus(prev => ({ ...prev, [provider]: 'error' }));
      
      let errorMsg = error.message || "Unknown error";
      
      if (provider === 'gemini') {
        if (errorMsg.toLowerCase().includes('forbidden') || errorMsg.includes('403')) {
          alert(`Gemini Validation failed (403 Forbidden). 
          
This usually means:
1. Your key exists but doesn't have permissions for the "Generative Language API".
2. You have restricted the key to a specific IP or Referer that doesn't match this site.
3. You are in a region where this model is not yet available.`);
        } else if (errorMsg.includes('API_KEY_INVALID')) {
          alert("Invalid Gemini API Key: Please check your key and try again.");
        } else {
          alert(`Gemini Validation failed: ${errorMsg}`);
        }
      } else {
        alert(`${provider.toUpperCase()} Validation failed: ${errorMsg}`);
      }
    } finally {
      setIsValidatingKey(null);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert(`Login Failed: This domain (${window.location.hostname}) is not authorized for Firebase Authentication.\n\nPlease add this domain to the "Authorized domains" list in the Firebase Console (Authentication > Settings).`);
      } else if (error.code === 'auth/popup-blocked') {
        alert('Login Failed: The sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Silently handle user closing the popup
      } else {
        alert(`Login Failed: ${error.message}`);
      }
    }
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;

    // Plan restrictions
    const selectedModelId = selectedModels[activeType];
    const modelInfo = GEMINI_MODELS.find(m => m.id === selectedModelId);

    if (currentPlan === 'text_only' && activeType !== 'text') {
      alert('Text Only plan only supports text generation. Please upgrade for other features.');
      setShowSubscription(true);
      return;
    }

    if (modelInfo?.isPremium) {
      if (activeType === 'text') {
        if (['gemini-3.1-pro-preview'].includes(modelInfo.id) && currentPlan !== 'advance' && currentPlan !== 'medium') {
          alert(`${modelInfo.name} requires a Medium plan or higher.`);
          setShowSubscription(true);
          return;
        }
        if (modelInfo.id === 'gemini-3.1-pro-preview' && !['medium', 'advance'].includes(currentPlan)) {
          alert(`${modelInfo.name} requires a Medium plan or higher.`);
          setShowSubscription(true);
          return;
        }
        if (currentPlan === 'free') {
          alert(`${modelInfo.name} requires a Basic plan or higher.`);
          setShowSubscription(true);
          return;
        }
      }
      if (activeType === 'image' && currentPlan === 'free') {
        alert(`${modelInfo.name} requires a Basic plan or higher.`);
        setShowSubscription(true);
        return;
      }
      if (activeType === 'video' && !['medium', 'advance'].includes(currentPlan)) {
        alert(`${modelInfo.name} requires a Medium plan or higher.`);
        setShowSubscription(true);
        return;
      }
      if (activeType === 'music' && currentPlan !== 'advance') {
        alert(`${modelInfo.name} requires an Advance plan.`);
        setShowSubscription(true);
        return;
      }
      if (activeType === 'speech' && currentPlan !== 'advance') {
        alert(`${modelInfo.name} requires an Advance plan.`);
        setShowSubscription(true);
        return;
      }
    }

    if (activeType === 'image' && currentPlan === 'free' && selectedModelId !== 'gemini-2.5-flash-image') {
      alert('Premium image generation requires a Basic plan or higher. You can use Gemini 2.5 Flash Image for free.');
      setShowSubscription(true);
      return;
    }
    if (activeType === 'video' && !['medium', 'advance'].includes(currentPlan)) {
      alert('Video generation requires a Medium plan or higher.');
      setShowSubscription(true);
      return;
    }
    if (activeType === 'music' && currentPlan !== 'advance') {
      alert('Music generation requires an Advance plan.');
      setShowSubscription(true);
      return;
    }
    if (activeType === 'speech' && currentPlan !== 'advance') {
      alert('Speech generation requires an Advance plan.');
      setShowSubscription(true);
      return;
    }

    const plan = PLANS.find(p => p.id === currentPlan);
    if (plan && usageCount >= plan.dailyLimit) {
      alert(`Daily limit reached for ${plan.name} plan (${plan.dailyLimit} generations). Please upgrade for more.`);
      setShowSubscription(true);
      return;
    }

    setIsGenerating(true);
    setStatusMessage(`Generating ${activeType}...`);

    const isCustomDomain = window.location.hostname !== 'localhost' && !window.location.hostname.includes('.run.app');

    try {
      let content = '';
      let lyrics = '';

      if (activeType === 'text') {
        content = await generateText(input, selectedModels.text, userApiKeys.gemini);
      } else if (activeType === 'image') {
        const performImageGeneration = async () => {
          if (modelInfo?.isPremium) {
            // Use user-provided key if available, otherwise use platform dialog
            if (userApiKeys.gemini) {
              return await generateImage(input, selectedModels.image, userApiKeys.gemini, selectedImageStyle, selectedAspectRatio, selectedImageSize);
            }

            // @ts-ignore
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
              // @ts-ignore
              await window.aistudio.openSelectKey();
            }
            const apiKey = process.env.GEMINI_API_KEY || '';
            try {
              return await generateImage(input, selectedModels.image, apiKey, selectedImageStyle, selectedAspectRatio, selectedImageSize);
            } catch (error: any) {
              if (error.message?.includes("Requested entity was not found") || error.message?.includes("API_KEY_INVALID")) {
                alert("Your API key session has expired or is invalid. Please select a valid API key again.");
                // @ts-ignore
                await window.aistudio.openSelectKey();
                const newApiKey = process.env.GEMINI_API_KEY || '';
                return await generateImage(input, selectedModels.image, newApiKey, selectedImageStyle, selectedAspectRatio, selectedImageSize);
              }
              throw error;
            }
          } else {
            return await generateImage(input, selectedModels.image, userApiKeys.gemini, selectedImageStyle, selectedAspectRatio, selectedImageSize);
          }
        };
        content = await performImageGeneration();
      } else if (activeType === 'video' || activeType === 'music') {
        const performGeneration = async () => {
          // Use user-provided key if available
          if (userApiKeys.gemini) {
            if (activeType === 'video') {
              return await generateVideo(input, userApiKeys.gemini, selectedModels.video, videoDuration, videoResolution, videoAspectRatio);
            } else {
              const musicRes = await generateMusic(input, userApiKeys.gemini, selectedModels.music, musicDuration, selectedGenre);
              return { url: musicRes.url, lyrics: musicRes.lyrics };
            }
          }

          // Check for API key selection for Veo/Lyria ONLY if user hasn't provided their own key
          // because personal keys don't require the platform's key selection dialog
          if (!userApiKeys.gemini) {
            // @ts-ignore
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
              // @ts-ignore
              await window.aistudio.openSelectKey();
            }
          }
           
          const apiKey = userApiKeys.gemini || process.env.OWNER_GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
          
          try {
            if (activeType === 'video') {
              return await generateVideo(input, apiKey, selectedModels.video, videoDuration, videoResolution, videoAspectRatio);
            } else {
              const musicRes = await generateMusic(input, apiKey, selectedModels.music, musicDuration, selectedGenre);
              return { url: musicRes.url, lyrics: musicRes.lyrics };
            }
          } catch (error: any) {
            // If the key is invalid or expired (and it was the system key), prompt to re-select
            if (!userApiKeys.gemini && (error.message?.includes("Requested entity was not found") || error.message?.includes("API_KEY_INVALID"))) {
              alert("Your API key session has expired or is invalid. Please select a valid API key again.");
              // @ts-ignore
              await window.aistudio.openSelectKey();
              // Retry once with the new key
              const newApiKey = process.env.GEMINI_API_KEY || '';
              if (activeType === 'video') {
                return await generateVideo(input, newApiKey, selectedModels.video, videoDuration, videoResolution, videoAspectRatio);
              } else {
                const musicRes = await generateMusic(input, newApiKey, selectedModels.music, musicDuration, selectedGenre);
                return { url: musicRes.url, lyrics: musicRes.lyrics };
              }
            }
            throw error;
          }
        };

        const result = await performGeneration();
        if (typeof result === 'string') {
          content = result;
        } else {
          content = result.url;
          lyrics = result.lyrics;
        }
      } else if (activeType === 'speech') {
        content = await generateSpeech(input, selectedVoice, selectedModels.speech, userApiKeys.gemini);
      } else if (activeType === 'document') {
        if (!selectedFile) {
          throw new Error("Please upload a document first.");
        }
        content = await analyzeDocument(selectedFile, input, selectedModels.document, userApiKeys.gemini);
        setSelectedFile(null); // Clear file after processing
      } else if (activeType === 'vision') {
        if (!selectedFile) {
          throw new Error("Please upload an image first.");
        }
        content = await analyzeImage(selectedFile, input, selectedModels.vision, userApiKeys.gemini);
        setSelectedFile(null); // Clear file after processing
      } else if (activeType === 'edit') {
        if (!selectedFile) {
          throw new Error("Please upload a source image first.");
        }
        content = await editImage(input, selectedFile, selectedMask || undefined, selectedModels.edit, userApiKeys.gemini);
        setSelectedFile(null);
        setSelectedMask(null);
      }

      const newResult: GenerationResult = {
        type: activeType,
        content,
        lyrics,
        timestamp: Date.now(),
        prompt: input,
        aspectRatio: activeType === 'image' ? selectedAspectRatio : (activeType === 'video' ? videoAspectRatio : undefined),
        resolution: activeType === 'image' ? selectedImageSize : (activeType === 'video' ? videoResolution : undefined),
        projectId: currentProjectId === 'all' ? null : currentProjectId
      };

      setResults(prev => [...prev, newResult]);
      const savedId = await saveToHistory(newResult);
      if (savedId) {
        setResults(prev => prev.map(r => r.timestamp === newResult.timestamp ? { ...r, id: savedId } : r));
      }
      incrementUsage();
      setInput('');
    } catch (error: any) {
      console.error('Generation Error Technical Details:', {
        error: error,
        message: error.message,
        stack: error.stack,
        activeType: activeType,
        model: selectedModels[activeType]
      });

      const isCustomDomain = window.location.hostname !== 'localhost' && !window.location.hostname.includes('.run.app');
      const isForbidden = error.message?.toLowerCase().includes('forbidden') || error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED');
      const isInvalid = error.message?.toLowerCase().includes('invalid') || error.message?.includes('401') || error.message?.includes('API_KEY_INVALID');

      if (isInvalid) {
        alert(`INVALID API KEY: The Gemini key you provided is incorrect or has been revoked. 
        
Please double-check the key in Settings > API Keys. 
Technical Error: ${error.message}`);
        setShowSettings(true);
        setSettingsTab('keys');
      } else if (isForbidden) {
        if (isCustomDomain && !userApiKeys.gemini && !process.env.OWNER_GEMINI_KEY && !process.env.GOOGLE_API_KEY) {
          alert(`Generation Failed (Personal Key Required). 
          
SYSTEM KEY RESTRICTED: You are on a custom domain (${window.location.hostname}). The built-in system key is restricted to the default .run.app URL.

ACTION REQUIRED:
1. Get your personal key from: https://aistudio.google.com/
2. Open "Settings" > "API Keys" in this app and save your key.

Technical Error: ${error.message}`);
          setShowSettings(true);
          setSettingsTab('keys');
        } else {
          alert(`PERMISSIONS ERROR (403 Forbidden):
          
Your personal key was used, but the request was rejected. This usually means:
1. API NOT ENABLED: Go to Cloud Console and enable the "Generative Language API".
2. REGIONAL RESTRICT: Some models (like Image/Video) aren't available to keys in certain countries.
3. BILLING: Some features require a billing account linked to the key.

Technical Error: ${error.message}`);
        }
      } else {
        alert(`Generation failed: ${error.message || 'Unknown error'}. 
        
If the error persists, check your Internet connection or try a different model.`);
      }
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  const downloadResult = (result: GenerationResult) => {
    const link = document.createElement('a');
    link.href = result.content;
    link.download = `gemini-${result.type}-${Date.now()}.${result.type === 'text' ? 'txt' : result.type === 'image' ? 'png' : result.type === 'video' ? 'mp4' : 'wav'}`;
    
    if (result.type === 'text') {
      const blob = new Blob([result.content], { type: 'text/plain' });
      link.href = URL.createObjectURL(blob);
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleMinimize = (idx: number) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, isMinimized: !r.isMinimized } : r));
  };

  const handleSubscribe = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const handleUnsubscribe = async () => {
    if (!user) return;
    
    setIsUnsubscribing(true);
    setStatusMessage('Unsubscribing...');

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Update firestore directly
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        plan: 'free'
      });
      setCurrentPlan('free');

      alert('Successfully unsubscribed. Your plan is now Free.');
      setShowUnsubscribeConfirm(false);
      setShowSubscription(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      alert(`Unsubscribe failed: ${error.message}`);
    } finally {
      setIsUnsubscribing(false);
      setStatusMessage('');
    }
  };

  const confirmPayment = async () => {
    if (!paymentMethod || !selectedPlan) return;
    
    if (!user) {
      alert('Please login to subscribe to a plan.');
      setShowSubscription(false);
      handleLogin();
      return;
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      alert('Please fill in all required billing fields.');
      return;
    }

    if (!isDeliverySameAsBilling) {
      if (!deliveryInfo.name || !deliveryInfo.email || !deliveryInfo.phone || !deliveryInfo.address) {
        alert('Please fill in all required delivery fields.');
        return;
      }
    }

    const finalDeliveryInfo = isDeliverySameAsBilling ? customerInfo : deliveryInfo;

    setIsProcessingPayment(true);
    setStatusMessage('Initializing payment...');

    try {
      // 1. Create Midtrans Snap Token
      const response = await fetch('/api/create-midtrans-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: selectedPlan.price, 
          planId: selectedPlan.id,
          userId: user.uid,
          customerDetails: customerInfo,
          deliveryDetails: finalDeliveryInfo
        })
      });
      
      let data;
      const textResponse = await response.text();
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        throw new Error(response.ok ? 'Failed to parse response' : `Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      if (data.error) throw new Error(data.error);

      if (data.isDemo) {
        // Handle demo mode
        setStatusMessage('Demo Mode: Simulating payment...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await activateSubscription();
        return;
      }

      if (!data.token) {
        throw new Error('Failed to generate payment token. Please try again.');
      }

      setPendingOrderId(data.orderId);

      // 2. Open Midtrans Snap
      // @ts-ignore
      if (window.snap) {
        // @ts-ignore
        window.snap.pay(data.token, {
          onSuccess: async (result: any) => {
            console.log('Payment success:', result);
            setStatusMessage('Payment successful! Activating your plan...');
            await activateSubscription();
            setPendingOrderId(null);
          },
          onPending: (result: any) => {
            console.log('Payment pending:', result);
            alert('Your payment is pending. Please complete it to activate your plan.');
            setIsProcessingPayment(false);
            setShowSubscription(false);
          },
          onError: (result: any) => {
            console.error('Payment error:', result);
            alert('Payment failed. Please try again.');
            setIsProcessingPayment(false);
            setPendingOrderId(null);
          },
          onClose: () => {
            console.log('Payment popup closed');
            setIsProcessingPayment(false);
          }
        });
      } else {
        throw new Error('Payment system (Midtrans) is not loaded. Please refresh the page.');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error.message}`);
      setIsProcessingPayment(false);
    }
  };

  const activateSubscription = async () => {
    if (!selectedPlan || !user) return;
    
    setStatusMessage('Activating subscription...');
    
    try {
      // Send Invoice Email
      await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerInfo.email,
          name: customerInfo.name,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          address: customerInfo.address,
          phone: customerInfo.phone,
          deliveryDetails: isDeliverySameAsBilling ? customerInfo : deliveryInfo
        })
      });

      const newPlan = selectedPlan.id as Plan;
      
      // Update Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        plan: newPlan
      });

      setCurrentPlan(newPlan);
      setSelectedPlan(null);
      setPaymentMethod(null);
      setShowSubscription(false);
      setIsProcessingPayment(false);
      setStatusMessage('');
      alert(`Successfully subscribed to ${selectedPlan.name} plan! An invoice has been sent to ${customerInfo.email}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      setIsProcessingPayment(false);
      setStatusMessage('');
    }
  };

  const handleTypeChange = (type: GenerationType) => {
    setActiveType(type);
    setSelectedFile(null);
    setSelectedMask(null);
    setInput('');
  };

  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 logo-gradient rounded-2xl flex items-center justify-center shadow-xl animate-pulse mb-6">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Initializing System</h2>
          <p className="text-slate-500">Connecting to secure database...</p>
          <div className="mt-6 flex items-center gap-2 text-blue-600 font-medium justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Synchronizing Security Token</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-2 sm:h-16 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 sm:gap-3 group cursor-pointer">
            <div className="flex items-center gap-2 group">
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 logo-gradient rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Brain className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-5 sm:h-5 bg-white rounded-lg shadow-md flex items-center justify-center border border-slate-100">
                  <Cpu className="w-2 h-2 sm:w-3 sm:h-3 text-brand-secondary" />
                </div>
              </div>
              <div className="flex flex-col leading-none">
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 font-display">
                  Use <span className="text-brand-primary">Edy</span>
                </h1>
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">AI Tools</span>
              </div>
            </div>

            {/* User status on mobile line 1 */}
            <div className="sm:hidden flex items-center gap-2">
              <button 
                onClick={() => setShowSubscription(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-[10px] font-bold"
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  currentPlan === 'free' ? "bg-slate-400" : "bg-emerald-500"
                )} />
                <span className="capitalize">{currentPlan}</span>
              </button>
            </div>
          </div>
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-1 sm:gap-4 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
                  <span className="text-xs font-bold text-slate-700">{user.displayName}</span>
                  <span className="text-[10px] text-slate-500">{user.email}</span>
                </div>
                <button 
                  onClick={() => logout()}
                  className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.ui.login}</span>
              </button>
            )}
            <button 
              onClick={() => {
                setSettingsTab('models');
                setShowSettings(true);
              }}
              className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-medium text-slate-600"
              title={t.ui.settings}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{t.ui.settings}</span>
            </button>
            <button 
              onClick={() => setShowProjects(true)}
              className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              title={t.ui.projects}
            >
              <Folder className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button 
              onClick={() => setShowGallery(true)}
              className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              title={t.ui.gallery}
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button 
              onClick={() => setShowHistory(true)}
              className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              title={t.ui.history}
            >
              <HistoryIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button 
              onClick={() => setShowPromptLibrary(true)}
              className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              title={t.ui.promptLibrary}
            >
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button 
              onClick={() => setShowSubscription(true)}
              className="hidden sm:flex items-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-[10px] sm:text-sm font-medium relative group"
            >
            <div className="flex flex-col items-end leading-tight">
              <span className="capitalize font-bold">{currentPlan}</span>
              <span className="text-[8px] sm:text-[10px] text-slate-500">
                {PLANS.find(p => p.id === currentPlan)?.dailyLimit === Infinity 
                  ? 'Unlimited' 
                  : `${usageCount}/${PLANS.find(p => p.id === currentPlan)?.dailyLimit}`}
              </span>
            </div>
            <div className={cn(
              "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse",
              currentPlan === 'free' ? "bg-slate-400" : "bg-emerald-500"
            )} />
            
            {currentPlan !== 'free' && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUnsubscribeConfirm(true);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Cancel Subscription"
              >
                <X className="w-3 h-3" />
              </div>
            )}
          </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 sm:py-8 pb-64 sm:pb-48">
        {/* Results Area */}
        <div className="space-y-3 sm:space-y-8 mb-4 sm:mb-12">
          {results.length === 0 && !isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Cpu className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-xl font-medium mb-2">{t.ui.emptyTitle}</h2>
              <p className="max-w-xs">{t.ui.emptySubtitle}</p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {results.filter(r => currentProjectId === 'all' || (r.projectId || null) === (currentProjectId || null)).map((result, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    {result.type === 'text' && <Type className="w-4 h-4 text-blue-500" />}
                    {result.type === 'image' && <ImageIcon className="w-4 h-4 text-green-500" />}
                    {result.type === 'video' && <Video className="w-4 h-4 text-purple-500" />}
                    {result.type === 'music' && <Music className="w-4 h-4 text-amber-500" />}
                    {result.type === 'speech' && <Mic className="w-4 h-4 text-rose-500" />}
                    {result.type === 'document' && <FileText className="w-4 h-4 text-indigo-500" />}
                    {result.type === 'vision' && <Sparkles className="w-4 h-4 text-cyan-500" />}
                    {result.type === 'edit' && <Wand2 className="w-4 h-4 text-pink-500" />}
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{result.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {result.type === 'text' && (
                      <button 
                        onClick={() => handleReadAloud(result.content, `read-${idx}`)}
                        disabled={readingId === `read-${idx}`}
                        className={cn(
                          "p-2 hover:bg-white rounded-lg transition-colors flex items-center gap-1.5",
                          readingId === `read-${idx}` ? "text-rose-500" : "text-slate-400 hover:text-rose-600"
                        )}
                        title="Read Aloud"
                      >
                        {readingId === `read-${idx}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                        <span className="text-[10px] font-bold">Read Aloud</span>
                      </button>
                    )}
                    <button 
                      onClick={() => copyPrompt(result.prompt, `result-${idx}`)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-blue-600 flex items-center gap-1.5"
                      title="Copy Prompt"
                    >
                      {copiedId === `result-${idx}` ? (
                        <>
                          <CheckCheck className="w-4 h-4 text-green-500" />
                          <span className="text-[10px] font-bold text-green-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-[10px] font-bold">Copy Prompt</span>
                        </>
                      )}
                    </button>
                    <div className="relative group/project">
                      <button 
                        className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-indigo-600 flex items-center gap-1.5"
                        title="Move to Project"
                      >
                        <Folder className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Project</span>
                      </button>
                      <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover/project:opacity-100 group-hover/project:visible transition-all z-10">
                        <p className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Move to Project</p>
                        <button 
                          onClick={() => moveToProject(result, null)}
                          className={cn(
                            "w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between",
                            !result.projectId ? "text-indigo-600 font-bold" : "text-slate-600"
                          )}
                        >
                          Default {!result.projectId && <Check className="w-3 h-3" />}
                        </button>
                        {projects.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => moveToProject(result, p.id)}
                            className={cn(
                              "w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between",
                              result.projectId === p.id ? "text-indigo-600 font-bold" : "text-slate-600"
                            )}
                          >
                            {p.name} {result.projectId === p.id && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setPromptToSave(result.prompt);
                        setPromptTypeToSave(result.type);
                        setNewPromptTitle(result.prompt.slice(0, 30) + (result.prompt.length > 30 ? '...' : ''));
                        setShowPromptLibrary(true);
                      }}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-amber-600 flex items-center gap-1.5"
                      title="Save to Library"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-[10px] font-bold">Save</span>
                    </button>
                    <button 
                      onClick={() => togglePublic(result)}
                      className={cn(
                        "p-2 hover:bg-white rounded-lg transition-colors flex items-center gap-1.5",
                        result.isPublic ? "text-emerald-500" : "text-slate-400 hover:text-emerald-600"
                      )}
                      title={result.isPublic ? "Shared to Gallery" : "Share to Gallery"}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-bold">{result.isPublic ? "Shared" : "Share"}</span>
                    </button>
                    {(result.type === 'video' || result.type === 'music') && (
                      <button 
                        onClick={() => {
                          setEditingResult(result);
                          setPlaybackSpeed(1);
                          setVideoFilters({
                            grayscale: 0,
                            sepia: 0,
                            blur: 0,
                            brightness: 100,
                            contrast: 100
                          });
                        }}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-blue-600 flex items-center gap-1.5"
                        title="Open Editor"
                      >
                        <Scissors className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Edit</span>
                      </button>
                    )}
                    <button 
                      onClick={() => downloadResult(result)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => toggleMinimize(idx)}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                      title={result.isMinimized ? "Restore" : "Minimize"}
                    >
                      {result.isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {!result.isMinimized && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:p-6">
                        {result.type === 'text' && (
                          <div className="prose prose-slate max-w-none">
                            <ReactMarkdown>{result.content}</ReactMarkdown>
                          </div>
                        )}
                        {result.type === 'document' && (
                          <div className="prose prose-slate max-w-none">
                            <ReactMarkdown>{result.content}</ReactMarkdown>
                          </div>
                        )}
                        {result.type === 'vision' && (
                          <div className="prose prose-slate max-w-none">
                            <ReactMarkdown>{result.content}</ReactMarkdown>
                          </div>
                        )}
                        {(result.type === 'image' || result.type === 'edit') && (
                          <img src={result.content} alt="Generated" className="w-full h-auto rounded-lg shadow-inner" referrerPolicy="no-referrer" />
                        )}
                        {result.type === 'video' && (
                          <video src={result.content} controls className="w-full rounded-lg shadow-inner" />
                        )}
                        {result.type === 'music' && (
                          <div className="space-y-4">
                            <audio src={result.content} controls className="w-full" />
                            {result.lyrics && (
                              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 italic text-slate-600 text-sm">
                                {result.lyrics}
                              </div>
                            )}
                          </div>
                        )}
                        {result.type === 'speech' && (
                          <div className="flex flex-col items-center gap-4 py-8 bg-slate-50/50 rounded-xl">
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
                              <Volume2 className="w-8 h-8 text-rose-600" />
                            </div>
                            <audio src={result.content} controls className="w-full max-w-md" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {result.isMinimized && (
                  <div className="px-4 py-2 bg-slate-50/30 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 truncate italic">
                      {result.prompt}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isGenerating && (
            <div className="py-12">
              <GenerationLoader type={activeType} status={statusMessage} />
            </div>
          )}
          <div ref={resultsEndRef} />
        </div>
      </main>

      {/* Input Bar */}
      <div className="fixed bottom-2 sm:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-3xl z-50">
        {/* Project Selector Indicator & Minimize Toggle */}
        <div className="flex justify-center gap-2 mb-2">
          <button 
            onClick={() => setShowProjects(true)}
            className="px-3 py-1.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full shadow-lg flex items-center gap-2 hover:bg-white transition-all group"
          >
            <Folder className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold text-slate-600">
              Project: <span className="text-indigo-600">{currentProjectId === 'all' ? 'All Generations' : currentProjectId ? projects.find(p => p.id === currentProjectId)?.name : 'Default'}</span>
            </span>
            <ChevronUp className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </button>

          <button 
            onClick={() => setIsMenuMinimized(!isMenuMinimized)}
            className="w-10 h-10 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all group"
            title={isMenuMinimized ? "Expand Menu" : "Minimize Menu"}
          >
            {isMenuMinimized ? (
              <ChevronUp className="w-5 h-5 text-indigo-600 animate-bounce" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            )}
          </button>
        </div>

        <div className={cn(
          "bg-white border border-slate-200 shadow-2xl transition-all duration-300 ease-in-out overflow-visible",
          isMenuMinimized 
            ? "rounded-full p-2 max-w-xs mx-auto opacity-80 scale-95" 
            : "p-2.5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] opacity-100 scale-100"
        )}>
        {!isMenuMinimized ? (
          <div className="space-y-2.5 sm:space-y-4 overflow-visible">
            <div className="grid grid-cols-4 items-center justify-center gap-1.5 sm:gap-4 overflow-visible relative px-1">
            {[
              { id: 'text', icon: Type, label: t.tools.text.label, color: 'text-blue-500', info: t.tools.text.info },
              { id: 'image', icon: ImageIcon, label: t.tools.image.label, color: 'text-green-500', info: t.tools.image.info },
              { id: 'video', icon: Video, label: t.tools.video.label, color: 'text-purple-500', info: t.tools.video.info },
              { id: 'music', icon: Music, label: t.tools.music.label, color: 'text-amber-500', info: t.tools.music.info },
              { id: 'speech', icon: Mic, label: t.tools.speech.label, color: 'text-rose-500', info: t.tools.speech.info },
              { id: 'document', icon: FileText, label: t.tools.document.label, color: 'text-indigo-500', info: t.tools.document.info },
              { id: 'vision', icon: Sparkles, label: t.tools.vision.label, color: 'text-cyan-500', info: t.tools.vision.info },
              { id: 'edit', icon: Wand2, label: t.tools.edit.label, color: 'text-pink-500', info: t.tools.edit.info },
            ].map((tool) => (
              <div key={tool.id} className="relative group">
                <button
                  onClick={() => handleTypeChange(tool.id as GenerationType)}
                  onMouseEnter={() => setHoveredTool(tool.id)}
                  onMouseLeave={() => setHoveredTool(null)}
                  className={cn(
                    "w-full sm:w-auto flex flex-col items-center gap-1 px-1 sm:px-4 py-1.5 sm:py-2 rounded-2xl sm:rounded-full border transition-all whitespace-nowrap",
                    activeType === tool.id 
                      ? "bg-white border-slate-300 shadow-sm scale-105" 
                      : "bg-transparent border-transparent text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                    <tool.icon className={cn("w-4 h-4 sm:w-4 h-4", tool.color)} />
                    <span className="text-[9px] sm:text-sm font-bold sm:font-medium">{tool.label}</span>
                  </div>
                  {activeType === tool.id && (
                    <span className="hidden sm:inline text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                      {GEMINI_MODELS.find(m => m.id === selectedModels[tool.id as GenerationType])?.name.split(' ').pop()}
                    </span>
                  )}
                </button>
                
                <AnimatePresence>
                  {hoveredTool === tool.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl z-[60] pointer-events-none"
                    >
                      <div className="font-bold mb-1 flex items-center gap-1 text-white">
                        <tool.icon className="w-3 h-3" />
                        {tool.label}
                      </div>
                      <p className="text-slate-300 leading-relaxed font-normal">{tool.info}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="relative flex flex-col gap-2">
            {activeType === 'image' && (
              <div className="flex flex-col gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-1 shadow-sm">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Artistic Style:</span>
                  <div className="flex flex-wrap gap-2">
                    {IMAGE_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedImageStyle(style.id)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                          selectedImageStyle === style.id 
                            ? "bg-green-600 text-white shadow-md shadow-green-500/20 scale-105" 
                            : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Maximize className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aspect Ratio</span>
                    </div>
                    <div className="flex gap-1.5">
                      {['1:1', '3:4', '4:3', '9:16', '16:9'].map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setSelectedAspectRatio(ratio)}
                          className={cn(
                            "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all",
                            selectedAspectRatio === ratio 
                              ? "bg-green-600 text-white shadow-lg shadow-green-500/20" 
                              : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resolution</span>
                    </div>
                    <div className="flex gap-1.5">
                      {['512px', '1K', '2K', '4K'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedImageSize(size)}
                          className={cn(
                            "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all relative",
                            selectedImageSize === size 
                              ? "bg-green-600 text-white shadow-lg shadow-green-500/20" 
                              : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {size}
                          {size !== '512px' && (
                            <div className="absolute top-0 right-0 p-0.5">
                              <Crown className={cn("w-2 h-2", selectedImageSize === size ? "text-white/50" : "text-amber-500")} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeType === 'video' && (
              <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl mb-2 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  {/* Duration Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[5, 10, 15].map((d) => (
                        <button
                          key={d}
                          onClick={() => setVideoDuration(d)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold transition-all relative overflow-hidden",
                            videoDuration === d 
                              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" 
                              : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {d}s
                          {d > 5 && (
                            <div className="absolute top-0 right-0 p-0.5">
                              <Crown className={cn("w-2 h-2", videoDuration === d ? "text-white/50" : "text-amber-500")} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Maximize className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aspect Ratio</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        { id: '16:9', icon: Monitor, label: 'Landscape' },
                        { id: '9:16', icon: Smartphone, label: 'Portrait' }
                      ].map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setVideoAspectRatio(r.id)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                            videoAspectRatio === r.id 
                              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" 
                              : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                          title={r.label}
                        >
                          <r.icon className="w-3.5 h-3.5" />
                          <span>{r.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resolution</span>
                    </div>
                    <div className="flex gap-1.5">
                      {['720p', '1080p', '4k'].map((res) => (
                        <button
                          key={res}
                          onClick={() => setVideoResolution(res)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold transition-all relative",
                            videoResolution === res 
                              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" 
                              : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {res.toUpperCase()}
                          {res !== '720p' && (
                            <div className="absolute top-0 right-0 p-0.5">
                              <Crown className={cn("w-2 h-2", videoResolution === res ? "text-white/50" : "text-amber-500")} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cost Indicator */}
                {GEMINI_MODELS.find(m => m.id === selectedModels.video)?.isPremium && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl">
                    <div className="p-2 bg-amber-100 rounded-xl">
                      <Crown className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-amber-800 leading-tight">
                        Premium Model Active
                      </p>
                      <p className="text-[10px] text-amber-700/80 leading-tight mt-0.5">
                        {GEMINI_MODELS.find(m => m.id === selectedModels.video)?.costNote || "Additional charges may apply based on your plan."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeType === 'music' && (
              <div className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl mb-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration:</span>
                  <div className="flex gap-2">
                    {[15, 30, 60, 120].map((d) => (
                      <button
                        key={d}
                        onClick={() => setMusicDuration(d)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                          musicDuration === d 
                            ? "bg-amber-600 text-white shadow-md shadow-amber-500/20 scale-105" 
                            : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {d >= 60 ? `${d/60}m` : `${d}s`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full mb-1">Genre:</span>
                  {MUSIC_GENRES.map((g) => (
                    <div key={g.id} className="relative group">
                      <button
                        onClick={() => setSelectedGenre(g.id)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                          selectedGenre === g.id 
                            ? "bg-amber-100 text-amber-700 border border-amber-200" 
                            : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {g.id}
                      </button>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 p-2 bg-slate-900 text-white text-[9px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-center">
                        {g.description}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeType === 'speech' && (
              <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-rose-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select AI Voice:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {VOICE_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all relative group",
                        selectedVoice === v.id 
                          ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-500/20 scale-[1.02]" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span className="text-xs font-bold">{v.label}</span>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 p-2 bg-slate-900 text-white text-[9px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {v.description}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-2 px-1">
                  <Info className="w-3 h-3 text-slate-400" />
                  <p className="text-[10px] text-slate-500 italic">
                    {VOICE_OPTIONS.find(v => v.id === selectedVoice)?.description}
                  </p>
                </div>
              </div>
            )}
            {activeType === 'document' && (
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl mb-1 shadow-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-indigo-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-indigo-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {selectedFile ? (
                          <div className="flex flex-col items-center">
                            <FileText className="w-8 h-8 text-indigo-500 mb-2" />
                            <p className="text-xs font-bold text-indigo-600">{selectedFile.name}</p>
                            <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <>
                            <FileUp className="w-8 h-8 text-indigo-400 mb-2" />
                            <p className="text-xs font-bold text-slate-500">Click to upload PDF or Document</p>
                            <p className="text-[10px] text-slate-400">PDF, DOCX, TXT (Max 10MB)</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              alert("File size exceeds 10MB limit.");
                              return;
                            }
                            setSelectedFile(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {selectedFile && (
                    <button 
                      onClick={() => setSelectedFile(null)}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider"
                    >
                      Remove File
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeType === 'vision' && (
              <div className="p-4 bg-cyan-50/50 border border-cyan-100 rounded-2xl mb-1 shadow-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-cyan-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-cyan-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {selectedFile ? (
                          <div className="flex flex-col items-center">
                            <ImageIcon className="w-8 h-8 text-cyan-500 mb-2" />
                            <p className="text-xs font-bold text-cyan-600">{selectedFile.name}</p>
                            <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                            <p className="text-xs font-bold text-slate-500">Click to upload Image</p>
                            <p className="text-[10px] text-slate-400">JPG, PNG, WEBP (Max 5MB)</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert("Image size exceeds 5MB limit.");
                              return;
                            }
                            setSelectedFile(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {selectedFile && (
                    <button 
                      onClick={() => setSelectedFile(null)}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeType === 'edit' && (
              <div className="p-4 bg-pink-50/50 border border-pink-100 rounded-2xl mb-1 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">1. Source Image:</span>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-pink-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-pink-50 transition-colors">
                      <div className="flex flex-col items-center justify-center p-4">
                        {selectedFile ? (
                          <div className="flex flex-col items-center text-center">
                            <ImageIcon className="w-6 h-6 text-pink-500 mb-1" />
                            <p className="text-[10px] font-bold text-pink-600 truncate max-w-[120px]">{selectedFile.name}</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-pink-400 mb-1" />
                            <p className="text-[10px] font-bold text-slate-500">Upload Source</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert("Image size exceeds 5MB limit.");
                              return;
                            }
                            setSelectedFile(file);
                          }
                        }}
                      />
                    </label>
                    {selectedFile && (
                      <button onClick={() => setSelectedFile(null)} className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase">Remove</button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">2. Mask (Optional):</span>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-pink-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-pink-50 transition-colors">
                      <div className="flex flex-col items-center justify-center p-4">
                        {selectedMask ? (
                          <div className="flex flex-col items-center text-center">
                            <Eraser className="w-6 h-6 text-pink-500 mb-1" />
                            <p className="text-[10px] font-bold text-pink-600 truncate max-w-[120px]">{selectedMask.name}</p>
                          </div>
                        ) : (
                          <>
                            <Eraser className="w-6 h-6 text-pink-400 mb-1" />
                            <p className="text-[10px] font-bold text-slate-500">Upload Mask</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert("Mask size exceeds 5MB limit.");
                              return;
                            }
                            setSelectedMask(file);
                          }
                        }}
                      />
                    </label>
                    {selectedMask && (
                      <button onClick={() => setSelectedMask(null)} className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase">Remove</button>
                    )}
                  </div>
                </div>
                <div className="mt-3 p-2 bg-white rounded-lg border border-pink-100">
                  <p className="text-[9px] text-pink-600 leading-tight">
                    <Info className="w-3 h-3 inline mr-1" />
                    <strong>Image-to-Image:</strong> Upload only Source. <br/>
                    <strong>Inpainting:</strong> Upload Source + Mask (white area is edited).
                  </p>
                </div>
              </div>
            )}

            <div className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={MAX_PROMPT_LENGTH}
                placeholder={t.ui.inputPlaceholder.replace('{type}', t.tools[activeType].label)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 sm:py-3 pr-12 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none h-14 sm:h-14"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
              <button 
                onClick={handleGenerate}
                disabled={!input.trim() || isGenerating}
                className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-end px-2">
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                input.length >= MAX_PROMPT_LENGTH * 0.9 ? "text-red-500" : "text-slate-400"
              )}>
                {input.length} / {MAX_PROMPT_LENGTH} characters
              </span>
            </div>
          </div>
        </div>
    ) : (
          <div className="flex items-center justify-between px-4 py-1">
            <div className="flex items-center gap-3">
              <div className={cn("p-1.5 rounded-lg bg-slate-50", 
                 activeType === 'text' ? 'text-blue-500' :
                 activeType === 'image' ? 'text-green-500' :
                 activeType === 'video' ? 'text-purple-500' :
                 activeType === 'music' ? 'text-amber-500' :
                 activeType === 'speech' ? 'text-rose-500' :
                 activeType === 'vision' ? 'text-cyan-500' :
                 activeType === 'document' ? 'text-indigo-500' : 'text-pink-500'
              )}>
                {activeType === 'text' && <Type className="w-4 h-4" />}
                {activeType === 'image' && <ImageIcon className="w-4 h-4" />}
                {activeType === 'video' && <Video className="w-4 h-4" />}
                {activeType === 'music' && <Music className="w-4 h-4" />}
                {activeType === 'speech' && <Mic className="w-4 h-4" />}
                {activeType === 'vision' && <Sparkles className="w-4 h-4" />}
                {activeType === 'document' && <FileText className="w-4 h-4" />}
                {activeType === 'edit' && <Wand2 className="w-4 h-4" />}
              </div>
              <span className="text-xs font-bold text-slate-700 capitalize">{activeType} Mode Active</span>
            </div>
            <button 
              onClick={() => setIsMenuMinimized(false)}
              className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Expand Controls
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Transaction History Modal */}
      <AnimatePresence>
        {showTransactionHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[70] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/20"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.ui.transactionHistory}</h3>
                  <p className="text-sm text-slate-500">View your past subscription payments</p>
                </div>
                <button 
                  onClick={() => setShowTransactionHistory(false)}
                  className="p-3 rounded-2xl bg-white text-slate-400 hover:text-slate-900 transition-all shadow-sm border border-slate-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto">
                {isTransactionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-slate-500 font-medium">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HistoryIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">Your payment history will appear here once you subscribe.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 flex items-center justify-between group hover:border-blue-100 hover:bg-blue-50/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                            tx.status === 'settlement' || tx.status === 'capture' ? "bg-emerald-100 text-emerald-600" :
                            tx.status === 'pending' ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                          )}>
                            {tx.status === 'settlement' || tx.status === 'capture' ? <CheckCircle2 className="w-6 h-6" /> :
                             tx.status === 'pending' ? <Clock className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 uppercase">{tx.planId} Plan</p>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                tx.status === 'settlement' || tx.status === 'capture' ? "bg-emerald-500 text-white" :
                                tx.status === 'pending' ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                              )}>
                                {tx.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{tx.orderId}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : new Date(tx.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-slate-900">Rp {(tx.amount || 0).toLocaleString('id-ID')}</p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{tx.paymentType || 'Payment'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                <button 
                  onClick={() => setShowTransactionHistory(false)}
                  className="w-full py-4 rounded-2xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription Modal */}
      <AnimatePresence>
        {showSubscription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubscription(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Choose Your Plan</h2>
                  <button 
                    onClick={() => setShowTransactionHistory(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold shadow-sm"
                  >
                    <HistoryIcon className="w-3.5 h-3.5" /> History
                  </button>
                </div>
                <button onClick={() => setShowSubscription(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {!selectedPlan ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {PLANS.map((plan) => (
                      <div 
                        key={plan.id}
                        className={cn(
                          "relative p-6 rounded-2xl border-2 transition-all flex flex-col",
                          currentPlan === plan.id 
                            ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10 ring-4 ring-blue-500/5" 
                            : "border-slate-100 hover:border-slate-200 bg-white"
                        )}
                      >
                        {currentPlan === plan.id && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Active Plan
                          </div>
                        )}
                        {plan.id === 'medium' && currentPlan !== 'medium' && currentPlan !== 'advance' && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-md">
                            Best Value
                          </div>
                        )}
                        
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm", plan.color)}>
                          {plan.icon}
                        </div>
                        
                        <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-3xl font-bold">${plan.price}</span>
                          <span className="text-slate-400 text-sm">/mo</span>
                        </div>

                        <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Daily Limit</p>
                          <p className="text-sm font-bold text-slate-700">
                            {plan.dailyLimit === Infinity ? 'Unlimited Generations' : `${plan.dailyLimit} Generations / Day`}
                          </p>
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>

                        <button 
                          onClick={() => handleSubscribe(plan)}
                          disabled={currentPlan === plan.id || isUnsubscribing}
                          className={cn(
                            "w-full py-3 rounded-xl font-bold transition-all shadow-sm",
                            currentPlan === plan.id 
                              ? "bg-white border border-slate-200 text-slate-400 cursor-default" 
                              : plan.id === 'medium' || plan.id === 'advance'
                                ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-500/20"
                                : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
                          )}
                        >
                          {currentPlan === plan.id ? 'Current Plan' : 'Upgrade Now'}
                        </button>

                        {currentPlan === plan.id && plan.id !== 'free' && (
                          <button 
                            onClick={() => setShowUnsubscribeConfirm(true)}
                            disabled={isUnsubscribing}
                            className="mt-3 w-full py-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center justify-center gap-1"
                          >
                            {isUnsubscribing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <LogOut className="w-3 h-3" />
                            )}
                            Unsubscribe
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-8 py-8">
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2">Checkout for {selectedPlan.name}</h3>
                      <p className="text-slate-500">Total amount: <span className="font-bold text-slate-800">${selectedPlan.price}</span></p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <UserIcon className="w-4 h-4" /> Billing Information
                          </h4>
                          <div className="space-y-3">
                            <input 
                              type="text" 
                              placeholder="Full Name"
                              disabled={isProcessingPayment}
                              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                              value={customerInfo.name}
                              onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                            />
                            <input 
                              type="email" 
                              placeholder="Email Address"
                              disabled={isProcessingPayment}
                              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                              value={customerInfo.email}
                              onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                            />
                            <input 
                              type="tel" 
                              placeholder="Phone Number"
                              disabled={isProcessingPayment}
                              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                              value={customerInfo.phone}
                              onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                            />
                            <textarea 
                              placeholder="Billing Address"
                              rows={3}
                              disabled={isProcessingPayment}
                              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none disabled:bg-slate-50 disabled:text-slate-400"
                              value={customerInfo.address}
                              onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                              <HistoryIcon className="w-4 h-4" /> Delivery Information
                            </h4>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox"
                                checked={isDeliverySameAsBilling}
                                onChange={(e) => setIsDeliverySameAsBilling(e.target.checked)}
                                disabled={isProcessingPayment}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">Same as billing</span>
                            </label>
                          </div>
                          
                          <AnimatePresence mode="wait">
                            {!isDeliverySameAsBilling && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 overflow-hidden"
                              >
                                <input 
                                  type="text" 
                                  placeholder="Recipient Name"
                                  disabled={isProcessingPayment}
                                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                  value={deliveryInfo.name}
                                  onChange={(e) => setDeliveryInfo({...deliveryInfo, name: e.target.value})}
                                />
                                <input 
                                  type="email" 
                                  placeholder="Recipient Email"
                                  disabled={isProcessingPayment}
                                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                  value={deliveryInfo.email}
                                  onChange={(e) => setDeliveryInfo({...deliveryInfo, email: e.target.value})}
                                />
                                <input 
                                  type="tel" 
                                  placeholder="Recipient Phone"
                                  disabled={isProcessingPayment}
                                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                  value={deliveryInfo.phone}
                                  onChange={(e) => setDeliveryInfo({...deliveryInfo, phone: e.target.value})}
                                />
                                <textarea 
                                  placeholder="Delivery Address"
                                  rows={3}
                                  disabled={isProcessingPayment}
                                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none disabled:bg-slate-50 disabled:text-slate-400"
                                  value={deliveryInfo.address}
                                  onChange={(e) => setDeliveryInfo({...deliveryInfo, address: e.target.value})}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          
                          {isDeliverySameAsBilling && (
                            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                              <p className="text-xs text-slate-400">Delivery information is linked to billing.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> Payment Method
                        </h4>
                        
                        <div className="space-y-4">
                          <button 
                            onClick={() => setPaymentMethod('midtrans')}
                            disabled={isProcessingPayment}
                            className={cn(
                              "w-full p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-4 transition-all group",
                              paymentMethod === 'midtrans' 
                                ? "border-blue-600 bg-blue-50 shadow-xl scale-[1.02]" 
                                : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300",
                              isProcessingPayment && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                <CreditCard className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Zap className="w-6 h-6 text-purple-600" />
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-lg font-bold block">Midtrans Secure Payment</span>
                              <span className="text-xs text-slate-500">QRIS, Credit Card, and more</span>
                            </div>
                          </button>

                          <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              You will be redirected to Midtrans secure payment page to complete your transaction using QRIS or Credit Card.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-4">
                      {pendingOrderId && !isProcessingPayment && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 mb-2">
                          <HistoryIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-amber-900">Payment Pending</p>
                            <p className="text-xs text-amber-700">We're waiting for confirmation of your last payment. Your plan will update automatically once settled.</p>
                          </div>
                        </div>
                      )}
                      {isProcessingPayment ? (
                        <div className="flex flex-col items-center gap-4 w-full">
                          <div className="w-full py-4 rounded-2xl font-bold bg-blue-600/50 text-white flex items-center justify-center gap-2 cursor-not-allowed">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {statusMessage || 'Processing...'}
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsProcessingPayment(false);
                              setStatusMessage('');
                            }}
                            className="text-sm font-medium text-slate-500 underline hover:text-blue-600 transition-colors"
                          >
                            Cancel / Reset
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-4 w-full">
                          <button 
                            onClick={() => setSelectedPlan(null)}
                            className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                          >
                            Back
                          </button>
                          <button 
                            onClick={confirmPayment}
                            disabled={!paymentMethod}
                            className="flex-2 py-4 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                          >
                            Confirm & Pay
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Projects Modal */}
      <AnimatePresence>
        {showProjects && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProjects(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Folder className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{t.ui.projectsTitle}</h2>
                    <p className="text-xs text-slate-500">Organize your AI generations</p>
                  </div>
                </div>
                <button onClick={() => setShowProjects(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-6">
                  {isCreatingProject ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Project name..."
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => e.key === 'Enter' && createProject()}
                        autoFocus
                      />
                      <button 
                        onClick={createProject}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Create
                      </button>
                      <button 
                        onClick={() => setIsCreatingProject(false)}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsCreatingProject(true)}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                    >
                      <FolderPlus className="w-5 h-5" />
                      Create New Project
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      setCurrentProjectId('all');
                      setShowProjects(false);
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl border transition-all flex items-center justify-between group",
                      currentProjectId === 'all' 
                        ? "bg-blue-50 border-blue-200 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        currentProjectId === 'all' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className={cn("font-bold text-sm", currentProjectId === 'all' ? "text-blue-900" : "text-slate-700")}>All Generations</p>
                        <p className="text-[10px] text-slate-400">View everything you've created</p>
                      </div>
                    </div>
                    {currentProjectId === 'all' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  </button>

                  <button 
                    onClick={() => {
                      setCurrentProjectId(null);
                      setShowProjects(false);
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl border transition-all flex items-center justify-between group",
                      currentProjectId === null 
                        ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        currentProjectId === null ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className={cn("font-bold text-sm", currentProjectId === null ? "text-indigo-900" : "text-slate-700")}>Default Project</p>
                        <p className="text-[10px] text-slate-400">All unassigned generations</p>
                      </div>
                    </div>
                    {currentProjectId === null && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                  </button>

                  {projects.map((project) => (
                    <div key={project.id} className="relative group">
                      <button 
                        onClick={() => {
                          setCurrentProjectId(project.id);
                          setShowProjects(false);
                        }}
                        className={cn(
                          "w-full p-4 rounded-2xl border transition-all flex items-center justify-between",
                          currentProjectId === project.id 
                            ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            currentProjectId === project.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                          )}>
                            <Folder className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className={cn("font-bold text-sm", currentProjectId === project.id ? "text-indigo-900" : "text-slate-700")}>{project.name}</p>
                            <p className="text-[10px] text-slate-400">Created {new Date(project.createdAt?.toDate()).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {currentProjectId === project.id && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                        }}
                        className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prompt Library Modal */}
      <AnimatePresence>
        {showPromptLibrary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPromptLibrary(false);
                setPromptToSave(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{t.ui.promptLibraryTitle}</h2>
                    <p className="text-xs text-slate-500">Save and reuse your best prompts</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowPromptLibrary(false);
                    setPromptToSave(null);
                  }} 
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {promptToSave ? (
                  <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 mb-6">
                    <h3 className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Save New Prompt
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Title</label>
                          <input 
                            type="text" 
                            value={newPromptTitle}
                            onChange={(e) => setNewPromptTitle(e.target.value)}
                            placeholder="My Awesome Prompt"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Category</label>
                          <input 
                            type="text" 
                            value={newPromptCategory}
                            onChange={(e) => setNewPromptCategory(e.target.value)}
                            placeholder="Creative, Technical, etc."
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Content</label>
                        <div className="p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 max-h-32 overflow-y-auto">
                          {promptToSave}
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={savePrompt}
                          disabled={isSavingPrompt || !newPromptTitle.trim()}
                          className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSavingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save to Library
                        </button>
                        <button 
                          onClick={() => setPromptToSave(null)}
                          className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {[
                        { id: 'all', label: 'All', icon: Monitor },
                        { id: 'text', label: 'Text', icon: Type },
                        { id: 'image', label: 'Image', icon: ImageIcon },
                        { id: 'video', label: 'Video', icon: Video },
                        { id: 'music', label: 'Music', icon: Music },
                        { id: 'speech', label: 'Speech', icon: Mic }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setPromptFilter(f.id as any)}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                            promptFilter === f.id 
                              ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          <f.icon className="w-3 h-3" />
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {prompts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <FileText className="w-12 h-12 mb-4" />
                        <p>Your prompt library is empty.</p>
                        <p className="text-xs">Save prompts from your generation results to see them here.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prompts
                          .filter(p => promptFilter === 'all' || p.type === promptFilter || p.type === 'all')
                          .map((prompt) => (
                          <div key={prompt.id} className="group relative bg-slate-50 rounded-2xl border border-slate-100 p-4 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{prompt.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                    {prompt.category || 'General'}
                                  </span>
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                                    prompt.type === 'text' ? "bg-blue-100 text-blue-600" :
                                    prompt.type === 'image' ? "bg-green-100 text-green-600" :
                                    prompt.type === 'video' ? "bg-purple-100 text-purple-600" :
                                    prompt.type === 'music' ? "bg-amber-100 text-amber-600" :
                                    prompt.type === 'speech' ? "bg-rose-100 text-rose-600" : "bg-slate-200 text-slate-500"
                                  )}>
                                    {prompt.type}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => deletePrompt(prompt.id)}
                                className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-3 mb-4 italic">
                              "{prompt.content}"
                            </p>
                            <button 
                              onClick={() => usePrompt(prompt)}
                              className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all flex items-center justify-center gap-2"
                            >
                              <Zap className="w-3 h-3" />
                              Use Prompt
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Media Editor Modal */}
      <AnimatePresence>
        {editingResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingResult(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[90vh]"
            >
              {/* Preview Side */}
              <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
                </div>
                
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black flex items-center justify-center">
                  {editingResult.type === 'video' ? (
                    <video 
                      src={editingResult.content} 
                      controls 
                      autoPlay
                      loop
                      style={{
                        filter: `grayscale(${videoFilters.grayscale}%) sepia(${videoFilters.sepia}%) blur(${videoFilters.blur}px) brightness(${videoFilters.brightness}%) contrast(${videoFilters.contrast}%)`,
                      }}
                      ref={(el) => {
                        if (el) el.playbackRate = playbackSpeed;
                      }}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-amber-500/10 rounded-full flex items-center justify-center animate-pulse">
                        <Music className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500" />
                      </div>
                      <audio 
                        src={editingResult.content} 
                        controls 
                        autoPlay
                        loop
                        ref={(el) => {
                          if (el) el.playbackRate = playbackSpeed;
                        }}
                        className="w-full max-w-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Controls Side */}
              <div className="w-full md:w-80 bg-white p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Scissors className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-800">Media Editor</h3>
                  </div>
                  <button 
                    onClick={() => setEditingResult(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Playback Speed */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <FastForward className="w-3.5 h-3.5" /> Playback Speed
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0.5, 1, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => setPlaybackSpeed(speed)}
                          className={cn(
                            "py-2 rounded-xl text-xs font-bold transition-all",
                            playbackSpeed === speed 
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {editingResult.type === 'video' && (
                    <>
                      {/* Visual Filters */}
                      <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5" /> Visual Filters
                        </label>
                        
                        <div className="space-y-4">
                          {[
                            { label: 'Grayscale', key: 'grayscale', min: 0, max: 100, unit: '%' },
                            { label: 'Sepia', key: 'sepia', min: 0, max: 100, unit: '%' },
                            { label: 'Blur', key: 'blur', min: 0, max: 10, unit: 'px' },
                            { label: 'Brightness', key: 'brightness', min: 50, max: 200, unit: '%' },
                            { label: 'Contrast', key: 'contrast', min: 50, max: 200, unit: '%' },
                          ].map(filter => (
                            <div key={filter.key} className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-slate-500">{filter.label}</span>
                                <span className="text-blue-600">{(videoFilters as any)[filter.key]}{filter.unit}</span>
                              </div>
                              <input 
                                type="range" 
                                min={filter.min} 
                                max={filter.max} 
                                value={(videoFilters as any)[filter.key]}
                                onChange={(e) => setVideoFilters({...videoFilters, [filter.key]: parseInt(e.target.value)})}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-4 space-y-3">
                    <button 
                      onClick={() => {
                        // In a real app, we might use ffmpeg.wasm to process the video
                        // For this demo, we'll just download the original with a note
                        downloadResult(editingResult);
                        alert("Note: CSS filters and speed adjustments are applied in-browser for preview. To export with permanent changes, use a professional editor or re-generate with updated prompts.");
                      }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Media
                    </button>
                    <button 
                      onClick={() => {
                        setVideoFilters({ grayscale: 0, sepia: 0, blur: 0, brightness: 100, contrast: 100 });
                        setPlaybackSpeed(1);
                      }}
                      className="w-full py-3 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset All
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gallery Modal */}
      <AnimatePresence>
        {showGallery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGallery(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Community Gallery</h2>
                    <p className="text-xs text-slate-500">Inspiration from the Use Edy community</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchGallery}
                    disabled={isGalleryLoading}
                    className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-blue-600"
                    title="Refresh"
                  >
                    <Loader2 className={cn("w-5 h-5", isGalleryLoading && "animate-spin")} />
                  </button>
                  <button onClick={() => setShowGallery(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                {isGalleryLoading && galleryItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Loading inspirations...</p>
                  </div>
                ) : galleryItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p className="text-lg font-medium">The gallery is empty.</p>
                    <p className="text-sm">Be the first to share your creation!</p>
                  </div>
                ) : (
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                    {galleryItems.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="break-inside-avoid bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                      >
                        <div className="relative">
                          {item.type === 'image' || item.type === 'edit' ? (
                            <img src={item.content} alt={item.prompt} className="w-full h-auto" referrerPolicy="no-referrer" />
                          ) : item.type === 'video' ? (
                            <video src={item.content} className="w-full h-auto" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                          ) : (
                            <div className="p-6 bg-slate-50 flex flex-col items-center justify-center min-h-[150px]">
                              {item.type === 'text' && <Type className="w-8 h-8 text-blue-500 mb-2" />}
                              {item.type === 'music' && <Music className="w-8 h-8 text-amber-500 mb-2" />}
                              {item.type === 'speech' && <Mic className="w-8 h-8 text-rose-500 mb-2" />}
                              <span className="text-xs font-bold uppercase text-slate-400">{item.type}</span>
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <button 
                              onClick={() => {
                                setInput(item.prompt);
                                setActiveType(item.type);
                                setShowGallery(false);
                              }}
                              className="w-full py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white text-xs font-bold hover:bg-white/30 transition-all flex items-center justify-center gap-2"
                            >
                              <Wand2 className="w-3.5 h-3.5" />
                              Remix Prompt
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          <p className="text-xs text-slate-600 line-clamp-3 italic">"{item.prompt}"</p>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                              {item.authorPhoto ? (
                                <img src={item.authorPhoto} alt={item.authorName} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                                  <UserIcon className="w-3 h-3 text-slate-400" />
                                </div>
                              )}
                              <span className="text-[10px] font-bold text-slate-700">{item.authorName || 'Anonymous'}</span>
                            </div>
                            <span className="text-[9px] text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HistoryIcon className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-slate-800">{t.ui.historyTitle}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button 
                      onClick={clearHistory}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  )}
                  <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <HistoryIcon className="w-12 h-12 mb-4" />
                    <p>No history yet. Start creating!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.type === 'text' && <Type className="w-3 h-3 text-blue-500" />}
                            {item.type === 'image' && <ImageIcon className="w-3 h-3 text-green-500" />}
                            {item.type === 'video' && <Video className="w-3 h-3 text-purple-500" />}
                            {item.type === 'music' && <Music className="w-3 h-3 text-amber-500" />}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                            {currentProjectId === 'all' && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-bold rounded uppercase">
                                <Folder className="w-2 h-2" />
                                {item.projectId ? projects.find(p => p.id === item.projectId)?.name : 'Default'}
                              </span>
                            )}
                            {(item.aspectRatio || item.resolution) && (
                              <div className="flex gap-1">
                                {item.aspectRatio && (
                                  <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[8px] font-bold rounded uppercase">
                                    {item.aspectRatio}
                                  </span>
                                )}
                                {item.resolution && (
                                  <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[8px] font-bold rounded uppercase">
                                    {item.resolution}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-2">
                            {item.prompt}
                          </p>
                          {item.type === 'text' && (
                            <div className="text-xs text-slate-500 line-clamp-3 bg-white p-2 rounded border border-slate-100">
                              {item.content}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              setResults(prev => [item, ...prev]);
                              setShowHistory(false);
                              if (item.content.startsWith('blob:')) {
                                setStatusMessage('Note: Temporary content might have expired. You can re-generate using the prompt.');
                                setTimeout(() => setStatusMessage(''), 5000);
                              }
                            }}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                            title="Restore to view"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setInput(item.prompt);
                              setActiveType(item.type);
                              setShowHistory(false);
                            }}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                            title="Use prompt"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <div className="relative group/hproject">
                            <button 
                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"
                              title="Move to Project"
                            >
                              <Folder className="w-4 h-4" />
                            </button>
                            <div className="absolute top-0 right-full mr-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover/hproject:opacity-100 group-hover/hproject:visible transition-all z-20">
                              <p className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Move to Project</p>
                              <button 
                                onClick={() => moveToProject(item, null)}
                                className={cn(
                                  "w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between",
                                  !item.projectId ? "text-indigo-600 font-bold" : "text-slate-600"
                                )}
                              >
                                Default {!item.projectId && <Check className="w-3 h-3" />}
                              </button>
                              {projects.map(p => (
                                <button 
                                  key={p.id}
                                  onClick={() => moveToProject(item, p.id)}
                                  className={cn(
                                    "w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between",
                                    item.projectId === p.id ? "text-indigo-600 font-bold" : "text-slate-600"
                                  )}
                                >
                                  {p.name} {item.projectId === p.id && <Check className="w-3 h-3" />}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button 
                            onClick={() => copyPrompt(item.prompt, `history-${idx}`)}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                            title="Copy Prompt"
                          >
                            {copiedId === `history-${idx}` ? (
                              <CheckCheck className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          {item.content && !item.content.startsWith('blob:') && (
                            <button 
                              onClick={() => downloadResult(item)}
                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{t.ui.settings}</h2>
                    <p className="text-xs text-slate-500">{t.ui.modelSettings}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 px-6 bg-slate-50/30">
                <button
                  onClick={() => setSettingsTab('models')}
                  className={cn(
                    "px-6 py-4 text-sm font-bold transition-all border-b-2",
                    settingsTab === 'models' 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  AI Models
                </button>
                <button
                  onClick={() => setSettingsTab('keys')}
                  className={cn(
                    "px-6 py-4 text-sm font-bold transition-all border-b-2",
                    settingsTab === 'keys' 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  {t.ui.apiKeys}
                </button>
                <button
                  onClick={() => setSettingsTab('language')}
                  className={cn(
                    "px-6 py-4 text-sm font-bold transition-all border-b-2",
                    settingsTab === 'language' 
                      ? "border-blue-600 text-blue-600" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  {t.ui.languages}
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {settingsTab === 'language' ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-3">
                      <Languages className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-900">{t.ui.languages}</p>
                        <p className="text-xs text-blue-700">Choose your preferred interface language.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['en', 'id', 'zh', 'hi', 'es', 'fr'] as Language[]).map(langId => (
                        <button
                          key={langId}
                          onClick={() => setLanguage(langId)}
                          className={cn(
                            "p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between",
                            language === langId 
                              ? "border-blue-500 bg-blue-50/50 shadow-md" 
                              : "border-slate-100 hover:border-slate-200 bg-white"
                          )}
                        >
                          <span className={cn(
                            "font-bold text-sm",
                            language === langId ? "text-blue-700" : "text-slate-700"
                          )}>
                            {langId === 'en' ? 'English' : 
                             langId === 'id' ? 'Bahasa Indonesia' : 
                             langId === 'zh' ? 'Mandarin (Chinese)' : 
                             langId === 'hi' ? 'Hindi' : 
                             langId === 'es' ? 'Spanish' : 'French'}
                          </span>
                          {language === langId && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : settingsTab === 'models' ? (
                  <div className="space-y-8">
                <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 mb-6">
                  <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Model Intelligence
                  </h3>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Gemini 3 series models provide state-of-the-art reasoning. 
                    Choose <b>Flash</b> for speed, <b>Pro</b> for advanced tasks (including Vision and Long Context), or <b>Ultra</b> for elite performance and specialized creative work. 
                    Premium models require specific subscription plans.
                  </p>
                </div>

                <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100 mb-6">
                  <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Credit Consumption
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Free Models</p>
                      <p className="text-xs text-amber-700">Unlimited usage within daily quota limits.</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Premium Models</p>
                      <p className="text-xs text-amber-700">Consumes credits based on output complexity (1-10 credits).</p>
                    </div>
                  </div>
                </div>

                {(['text', 'image', 'video', 'music', 'speech', 'document', 'vision', 'edit'] as GenerationType[]).map((type) => (
                  <div key={type} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      {type === 'text' && <Type className="w-4 h-4 text-blue-500" />}
                      {type === 'image' && <ImageIcon className="w-4 h-4 text-green-500" />}
                      {type === 'video' && <Video className="w-4 h-4 text-purple-500" />}
                      {type === 'music' && <Music className="w-4 h-4 text-amber-500" />}
                      {type === 'speech' && <Mic className="w-4 h-4 text-rose-500" />}
                      {type === 'document' && <FileText className="w-4 h-4 text-indigo-500" />}
                      {type === 'vision' && <Sparkles className="w-4 h-4 text-cyan-500" />}
                      {type === 'edit' && <Wand2 className="w-4 h-4 text-pink-500" />}
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                        {type} Models
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {GEMINI_MODELS.filter(m => m.type === type).map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModels(prev => ({ ...prev, [type]: model.id }))}
                          className={cn(
                            "p-4 rounded-2xl border-2 text-left transition-all relative group",
                            selectedModels[type] === model.id
                              ? "border-blue-500 bg-blue-50/50 shadow-md"
                              : "border-slate-100 hover:border-slate-200 bg-white"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-bold text-sm",
                                selectedModels[type] === model.id ? "text-blue-700" : "text-slate-700"
                              )}>
                                {model.name}
                              </span>
                              {model.name.includes('High Quality') && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[8px] font-bold uppercase">HQ</span>
                              )}
                              <div className="relative group/info">
                                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-2xl z-[110] opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity">
                                  <p className="font-bold mb-1 text-blue-400">Strengths:</p>
                                  <p className="mb-2 text-slate-300 leading-relaxed">{model.description}</p>
                                  <p className="font-bold mb-1 text-amber-400">Usage & Cost:</p>
                                  <p className="text-slate-300 leading-relaxed">
                                    {model.costNote || (model.isPremium ? "Requires a paid subscription plan." : "Available on all plans including Free.")}
                                  </p>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                                </div>
                              </div>
                            </div>
                            {selectedModels[type] === model.id && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {model.description}
                          </p>
                          <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {model.isPremium ? (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold uppercase">
                                  <Crown className="w-2 h-2" />
                                  Premium
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold uppercase">
                                  <Sparkles className="w-2 h-2" />
                                  Free
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] font-medium text-slate-400">
                              <CreditCard className="w-2.5 h-2.5" />
                              {model.costNote || "Standard usage"}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
                <div className="space-y-6">
                  <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${userApiKeys.gemini ? 'bg-green-500' : 'bg-blue-500'}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/50">
                          Active Key Status
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${userApiKeys.gemini ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {userApiKeys.gemini ? t.ui.apiStatusPersonal : t.ui.apiStatusSystem}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Personal API Keys
                      </h3>
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-1 rounded-lg hover:bg-amber-300 transition-colors flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t.ui.apiKeyLink}
                      </a>
                    </div>
                    <p className="text-xs text-amber-600 leading-relaxed">
                      {t.ui.apiKeyHelp}. These keys are stored securely in your profile and used only for your requests.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {[
                      { id: 'gemini', label: 'Google Gemini API Key', icon: Brain, placeholder: 'AIzaSy...' },
                      { id: 'openai', label: 'OpenAI API Key', icon: Sparkles, placeholder: 'sk-...' },
                      { id: 'anthropic', label: 'Anthropic API Key', icon: Zap, placeholder: 'sk-ant-...' }
                    ].map((provider) => (
                      <div key={provider.id} className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 px-1">
                          <provider.icon className="w-4 h-4 text-blue-500" />
                          {provider.label}
                        </label>
                        <div className="relative flex items-center gap-2">
                          <input
                            type="password"
                            value={userApiKeys[provider.id] || ''}
                            onChange={(e) => {
                              setUserApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }));
                              if (validationStatus[provider.id]) {
                                setValidationStatus(prev => ({ ...prev, [provider.id]: null }));
                              }
                            }}
                            placeholder={provider.placeholder}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                          <button
                            onClick={() => validateApiKey(provider.id, userApiKeys[provider.id])}
                            disabled={!userApiKeys[provider.id] || isValidatingKey === provider.id}
                            className={cn(
                              "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                              validationStatus[provider.id] === 'success' 
                                ? "bg-green-100 text-green-700" 
                                : validationStatus[provider.id] === 'error'
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            {isValidatingKey === provider.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : validationStatus[provider.id] === 'success' ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : validationStatus[provider.id] === 'error' ? (
                              <X className="w-3.5 h-3.5" />
                            ) : null}
                            {validationStatus[provider.id] === 'success' ? 'Valid' : validationStatus[provider.id] === 'error' ? 'Invalid' : 'Validate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <button
                      onClick={saveApiKeys}
                      disabled={isSavingKeys || !user}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      {isSavingKeys ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Save API Keys
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98]"
              >
                Close Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
      {/* Unsubscribe Confirmation Modal */}
      <AnimatePresence>
        {showUnsubscribeConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnsubscribeConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <LogOut className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Cancel Subscription?</h3>
              <p className="text-slate-500 mb-8">
                Are you sure you want to unsubscribe? Your plan will be downgraded to Free at the end of the current billing cycle.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleUnsubscribe}
                  disabled={isUnsubscribing}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isUnsubscribing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Yes, Unsubscribe
                </button>
                <button 
                  onClick={() => setShowUnsubscribeConfirm(false)}
                  disabled={isUnsubscribing}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Keep My Plan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
