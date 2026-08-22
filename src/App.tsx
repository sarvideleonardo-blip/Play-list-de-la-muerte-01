import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Toaster, toast } from 'sonner';
import {
  Music, LogOut, User, Search, PlayCircle, Loader2, Plus, Trash2, Copy, CheckCircle2, ExternalLink, Mic, MicOff, Save, BookOpen
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function createSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

interface Song {
  id: string;
  name: string;
  artist: string;
  link: string;
  created_at: string;
}

interface Profile {
  id: string;
  final_message: string | null;
  personal_fragments: Record<string, string> | null;
  status: 'alive' | 'dead';
  activated_at: string | null;
}

interface LegacyPublic {
  profile_id: string;
  status: 'dead';
  activated_at: string;
  final_message: string | null;
  personal_fragments: Record<string, string> | null;
}

const supabase = hasSupabaseConfig ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const TESTIMONY_PROMPTS: { key: string; label: string; placeholder: string; maxLength: number }[] = [
  { key: 'regret', label: 'Una cosa que no hiciste y te hubiera gustado', placeholder: 'Si pudiera volver atrás...', maxLength: 280 },
  { key: 'joy', label: 'Un momento de pura alegría', placeholder: 'Recuerdo cuando...', maxLength: 280 },
  { key: 'lesson', label: 'Lo más importante que aprendiste', placeholder: 'La vida me enseñó que...', maxLength: 280 },
  { key: 'last_words', label: 'Tus últimas palabras para quien escuche', placeholder: 'Quiero que sepas que...', maxLength: 280 },
];

function normalizeFragments(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') result[k] = v;
  }
  return result;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'explore'>('dashboard');

  // Dashboard state
  const [songs, setSongs] = useState<Song[]>([]);
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [link, setLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [fragments, setFragments] = useState<Record<string, string>>({});
  const [savingMessage, setSavingMessage] = useState(false);
  const [dictatingField, setDictatingField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const dictatingValueRef = useRef('');

  // Explore state
  const [legacies, setLegacies] = useState<LegacyPublic[]>([]);
  const [search, setSearch] = useState('');
  const [exploreLoading, setExploreLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !supabase) return;
    fetchSongs();
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (view === 'explore') fetchLegacies();
  }, [view]);

  // Sincronizar estado desde el perfil cuando llega o cambia
  useEffect(() => {
    if (profile) {
      if (profile.final_message !== undefined && profile.final_message !== null) {
        setMessage(profile.final_message);
      }
      setFragments(normalizeFragments(profile.personal_fragments));
    }
  }, [profile?.final_message, profile?.personal_fragments]);

  async function fetchSongs() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error('Error al cargar canciones');
    else setSongs(data || []);
  }

  async function fetchProfile() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, final_message, personal_fragments, status, activated_at')
      .eq('id', user.id)
      .single();
    if (error) {
      toast.error('Error al cargar perfil');
    } else {
      setProfile(data as Profile);
    }
  }

  async function addSong(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      toast.error('Falta configuración de Supabase');
      return;
    }
    if (!name.trim() || !artist.trim()) {
      toast.error('Nombre y artista son obligatorios');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('songs').insert({
      profile_id: user.id,
      name: name.trim(),
      artist: artist.trim(),
      link: link.trim() || null,
    });
    setAdding(false);
    if (error) {
      toast.error('Error al agregar canción');
    } else {
      toast.success('Canción agregada');
      setName('');
      setArtist('');
      setLink('');
      fetchSongs();
    }
  }

  async function deleteSong(id: string) {
    if (!supabase) return;
    setDeletingId(id);
    const { error } = await supabase.from('songs').delete().eq('id', id).eq('profile_id', user.id);
    setDeletingId(null);
    if (error) toast.error('Error al eliminar');
    else {
      toast.success('Canción eliminada');
      setSongs((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function saveMessage() {
    if (!user || !supabase) return;
    setSavingMessage(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        final_message: message.trim(),
        personal_fragments: fragments,
      })
      .eq('id', user.id)
      .eq('status', 'alive'); // Seguridad: solo si está vivo
    setSavingMessage(false);
    if (error) {
      toast.error('Error al guardar testimonio: ' + error.message);
    } else {
      toast.success('Testimonio guardado');
      await fetchProfile();
    }
  }

  function stopDictation() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // puede fallar si ya está parado
      }
      recognitionRef.current = null;
    }
    setDictatingField(null);
    dictatingValueRef.current = '';
  }

  function startDictation(field: string, currentValue: string, setter: (val: string) => void) {
    stopDictation(); // Detener cualquier dictado anterior
    const recognition = createSpeechRecognition();
    if (!recognition) {
      toast.error('Tu navegador no soporta dictado por voz');
      return;
    }
    dictatingValueRef.current = currentValue;
    recognitionRef.current = recognition;
    setDictatingField(field);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      dictatingValueRef.current = dictatingValueRef.current
        ? dictatingValueRef.current + ' ' + transcript
        : transcript;
      setter(dictatingValueRef.current);
    };
    recognition.onerror = () => {
      toast.error('Error en el dictado');
      stopDictation();
    };
    recognition.onend = () => {
      stopDictation();
    };
    recognition.start();
  }

  async function fetchLegacies() {
    if (!supabase) return;
    setExploreLoading(true);
    const { data, error } = await supabase
      .from('legacies_public')
      .select('*')
      .order('activated_at', { ascending: false });
    setExploreLoading(false);
    if (error) {
      toast.error('Error al cargar legados públicos');
    } else {
      setLegacies((data as LegacyPublic[]) || []);
    }
  }

  async function signIn() {
    if (!supabase) {
      toast.error('Falta configuración de Supabase');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) toast.error('Error al iniciar sesión');
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSongs([]);
    setProfile(null);
    setMessage('');
    setFragments({});
  }

  const filteredLegacies = legacies.filter((l) => {
    const term = search.toLowerCase();
    const msg = (l.final_message || '').toLowerCase();
    const frags = Object.values(l.personal_fragments || {}).join(' ').toLowerCase();
    return msg.includes(term) || frags.includes(term);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-xl text-center space-y-4">
          <Music className="w-10 h-10 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold">Configuración requerida</h1>
          <p className="text-zinc-400">
            Faltan las variables de entorno de Supabase. Creá un archivo <code className="bg-zinc-900 px-2 py-1 rounded">.env</code> en la raíz con:
          </p>
          <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left text-sm text-zinc-300">
            VITE_SUPABASE_URL=tu_url
            VITE_SUPABASE_ANON_KEY=tu_key
          </pre>
          <p className="text-zinc-500 text-sm">Luego reiniciá el servidor con <code className="bg-zinc-900 px-2 py-1 rounded">npm run dev</code>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Toaster position="top-center" richColors />
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-6 h-6 text-emerald-500" />
            <span className="font-bold text-lg tracking-tight">Playlist de la Muerte</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    view === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  Mi Legado
                </button>
                <button
                  onClick={() => setView('explore')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    view === 'explore' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  Explorar
                </button>
              </>
            )}
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition"
              >
                <User className="w-4 h-4" />
                Entrar
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!user ? (
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">Tu legado musical</h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8">
              Armá tu playlist, dejá tu mensaje final, y cuando estés listo, activalo para que el mundo lo escuche.
            </p>
            <button
              onClick={signIn}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-lg transition"
            >
              Comenzar
            </button>
          </div>
        ) : view === 'dashboard' ? (
          <div className="space-y-8">
            {/* Estado del legado */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  Estado de tu legado
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    profile?.status === 'dead'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {profile?.status === 'dead' ? 'Activado (inmutable)' : 'Borrador (editable)'}
                </span>
              </div>
              {profile?.status === 'dead' ? (
                <p className="text-zinc-400 text-sm">
                  Tu legado fue activado el{' '}
                  {profile.activated_at ? new Date(profile.activated_at).toLocaleDateString('es-ES') : '—'}.
                  Ya no se puede editar. Es público e inmutable.
                </p>
              ) : (
                <p className="text-zinc-400 text-sm">
                  Tu legado está en modo borrador. Podés editar tu playlist, tu mensaje final y tus fragmentos.
                  Cuando estés listo, la activación se hace desde el servidor y convierte todo en público e inmutable.
                </p>
              )}
            </div>

            {/* Testimonio */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Save className="w-5 h-5 text-emerald-500" />
                Tu testimonio
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mensaje final</label>
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={profile?.status === 'dead'}
                      placeholder="Escribí tu mensaje final..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        dictatingField === 'message'
                          ? stopDictation()
                          : startDictation('message', message, setMessage)
                      }
                      disabled={profile?.status === 'dead'}
                      className={`absolute bottom-3 right-3 p-2 rounded-lg transition ${
                        dictatingField === 'message'
                          ? 'bg-red-500/20 text-red-400 animate-pulse'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Dictar mensaje final"
                    >
                      {dictatingField === 'message' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {TESTIMONY_PROMPTS.map((prompt) => (
                  <div key={prompt.key}>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">{prompt.label}</label>
                    <div className="relative">
                      <textarea
                        value={fragments[prompt.key] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.length <= prompt.maxLength) {
                            setFragments((prev) => ({ ...prev, [prompt.key]: val }));
                          }
                        }}
                        disabled={profile?.status === 'dead'}
                        placeholder={prompt.placeholder}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                        rows={3}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-zinc-600">
                        {(fragments[prompt.key] || '').length}/{prompt.maxLength}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          dictatingField === prompt.key
                            ? stopDictation()
                            : startDictation(
                                prompt.key,
                                fragments[prompt.key] || '',
                                (val) => setFragments((prev) => ({ ...prev, [prompt.key]: val }))
                              )
                        }
                        disabled={profile?.status === 'dead'}
                        className={`absolute bottom-2 right-16 p-1.5 rounded-lg transition ${
                          dictatingField === prompt.key
                            ? 'bg-red-500/20 text-red-400 animate-pulse'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={`Dictar ${prompt.label}`}
                      >
                        {dictatingField === prompt.key ? (
                          <MicOff className="w-3.5 h-3.5" />
                        ) : (
                          <Mic className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={saveMessage}
                disabled={savingMessage || profile?.status === 'dead'}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                {savingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingMessage ? 'Guardando...' : 'Guardar testimonio'}
              </button>
            </div>

            {/* Canciones */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-emerald-500" />
                Tu playlist
              </h2>

              <form onSubmit={addSong} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                <div className="md:col-span-1 relative">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={profile?.status === 'dead'}
                    placeholder="Nombre de la canción"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      dictatingField === 'song_name'
                        ? stopDictation()
                        : startDictation('song_name', name, setName)
                    }
                    disabled={profile?.status === 'dead'}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition ${
                      dictatingField === 'song_name'
                        ? 'bg-red-500/20 text-red-400 animate-pulse'
                        : 'text-zinc-500 hover:text-zinc-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {dictatingField === 'song_name' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="md:col-span-1 relative">
                  <input
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    disabled={profile?.status === 'dead'}
                    placeholder="Artista"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      dictatingField === 'song_artist'
                        ? stopDictation()
                        : startDictation('song_artist', artist, setArtist)
                    }
                    disabled={profile?.status === 'dead'}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition ${
                      dictatingField === 'song_artist'
                        ? 'bg-red-500/20 text-red-400 animate-pulse'
                        : 'text-zinc-500 hover:text-zinc-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {dictatingField === 'song_artist' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="md:col-span-1">
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    disabled={profile?.status === 'dead'}
                    placeholder="Enlace (opcional)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={adding || profile?.status === 'dead'}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {adding ? 'Agregando...' : 'Agregar'}
                </button>
              </form>

              {songs.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">No tenés canciones todavía. Agregá la primera.</p>
              ) : (
                <div className="space-y-2">
                  {songs.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 group hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayCircle className="w-5 h-5 text-zinc-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{song.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {song.link && (
                          <a
                            href={song.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition"
                            title="Abrir enlace"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${song.name} - ${song.artist}${song.link ? ' ' + song.link : ''}`);
                            setCopiedId(song.id);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                          className="p-2 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition"
                          title="Copiar"
                        >
                          {copiedId === song.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteSong(song.id)}
                          disabled={deletingId === song.id || profile?.status === 'dead'}
                          className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition disabled:opacity-50"
                          title="Eliminar"
                        >
                          {deletingId === song.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en legados públicos..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>

            {exploreLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : filteredLegacies.length === 0 ? (
              <p className="text-zinc-500 text-center py-12">
                {search ? 'No se encontraron legados que coincidan.' : 'No hay legados públicos todavía.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLegacies.map((legacy) => (
                  <div
                    key={legacy.profile_id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Legado
                      </span>
                      <span className="text-xs text-zinc-600">
                        {legacy.activated_at
                          ? new Date(legacy.activated_at).toLocaleDateString('es-ES')
                          : ''}
                      </span>
                    </div>
                    {legacy.final_message && (
                      <p className="text-sm text-zinc-300 mb-3 italic">"{legacy.final_message}"</p>
                    )}
                    {legacy.personal_fragments && Object.keys(legacy.personal_fragments).length > 0 && (
                      <div className="space-y-2">
                        {Object.entries(legacy.personal_fragments).map(([key, text]) => {
                          const prompt = TESTIMONY_PROMPTS.find((p) => p.key === key);
                          return (
                            <div key={key} className="bg-zinc-950 rounded-lg px-3 py-2 border border-zinc-800/50">
                              <p className="text-xs text-zinc-500 font-medium mb-0.5">{prompt?.label || key}</p>
                              <p className="text-sm text-zinc-300">{text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
